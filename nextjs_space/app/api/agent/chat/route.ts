export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'

// Bridge: forwards chat to the configured AGENT_API_URL.
// Falls back to the local stub if not configured.
// Persists chat sessions/messages.

function resolveAgentUrl(req: NextRequest): string {
  const cfg = process.env.AGENT_API_URL?.trim()
  if (cfg && /^https?:\/\//i.test(cfg)) return cfg
  // Build absolute URL to the local stub
  const proto = req.headers.get('x-forwarded-proto') ?? 'http'
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'localhost:3000'
  return `${proto}://${host}/api/agent/stub`
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const sessionId = String(body?.sessionId ?? '').trim() || null
  const visitorId = String(body?.visitorId ?? '').trim() || `anon_${Math.random().toString(36).slice(2, 10)}`
  const websiteHost = String(body?.websiteHost ?? '').trim() || null
  const userMessage = String(body?.message ?? '').trim()
  if (!userMessage) return new Response('Empty message', { status: 400 })

  // Get/create session
  let session = sessionId
    ? await prisma.chatSession.findUnique({ where: { id: sessionId }, include: { messages: { orderBy: { createdAt: 'asc' } } } })
    : null
  if (!session) {
    session = await prisma.chatSession.create({
      data: { visitorId, websiteHost: websiteHost ?? undefined },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    })
  }

  // Save user message
  await prisma.chatMessage.create({
    data: { sessionId: session.id, role: 'user', content: userMessage },
  })

  const history = (session?.messages ?? []).map((m) => ({ role: m.role, content: m.content }))
  history.push({ role: 'user', content: userMessage })

  const upstream = await fetch(resolveAgentUrl(req), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: history, stream: true, context: { sessionId: session.id } }),
  })

  if (!upstream.ok || !upstream.body) {
    return new Response('Agent error', { status: 502 })
  }

  const ts = new TransformStream()
  const writer = ts.writable.getWriter()
  const encoder = new TextEncoder()
  const reader = upstream.body.getReader()
  const decoder = new TextDecoder()
  let assistantBuffer = ''
  let partial = ''

  // Send session_id event first so the widget can persist it
  ;(async () => {
    try {
      await writer.write(encoder.encode(`event: session\ndata: ${JSON.stringify({ sessionId: session!.id })}\n\n`))
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        partial += chunk
        const lines = partial.split('\n')
        partial = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) {
            await writer.write(encoder.encode(line + '\n'))
            continue
          }
          const data = line.slice(6).trim()
          if (data === '[DONE]') {
            await writer.write(encoder.encode('data: [DONE]\n\n'))
            continue
          }
          try {
            const parsed = JSON.parse(data)
            const delta = parsed?.choices?.[0]?.delta?.content ?? ''
            if (delta) assistantBuffer += delta
          } catch { /* skip */ }
          await writer.write(encoder.encode(line + '\n'))
        }
      }
      // Persist the assistant's final response
      if (assistantBuffer) {
        await prisma.chatMessage.create({
          data: { sessionId: session!.id, role: 'assistant', content: assistantBuffer },
        })
      }
    } catch (e) {
      console.error('chat stream error', e)
    } finally {
      try { await writer.close() } catch { /* noop */ }
    }
  })()

  return new Response(ts.readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
