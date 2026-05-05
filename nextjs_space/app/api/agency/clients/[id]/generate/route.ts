export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { searchSEOIntelligence, summarizeMatches } from '@/lib/pinecone'
import { AGENCY_TOOLS, AgencyToolType, buildAgencyPrompt } from '@/lib/agency-prompts'

const VALID_TYPES = new Set(AGENCY_TOOLS.map(t => t.type))

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id
  if (!userId) return new Response('Unauthorized', { status: 401 })

  const apiKey = process.env.ABACUSAI_API_KEY
  if (!apiKey) return new Response('Service unavailable', { status: 503 })

  const body = await req.json().catch(() => ({}))
  const type = String(body?.type ?? '').toUpperCase() as AgencyToolType
  const userInput = String(body?.input ?? '').trim()
  if (!VALID_TYPES.has(type)) return new Response('Invalid tool type', { status: 400 })

  const client = await prisma.client.findUnique({ where: { id: params.id } })
  if (!client) return new Response('Client not found', { status: 404 })

  // Build prompt
  const { system, user, intelQuery } = buildAgencyPrompt(type, {
    client: {
      businessName: client.businessName,
      industry: client.industry,
      city: client.city,
      state: client.state,
      website: client.website,
      gbpUrl: client.gbpUrl,
      tier: client.tier,
      monthlyMRR: client.monthlyMRR,
      strategyBrief: client.strategyBrief,
    },
    intelligenceContext: '',
    userInput,
  })

  // Pull Pinecone intelligence
  const matches = await searchSEOIntelligence(intelQuery, 6)
  const intelContext = summarizeMatches(matches)
  const finalUser = user.replace('[no indexed insights matched — proceed using best practice]', intelContext || '[no indexed insights matched — proceed using best practice]')
  const userPrompt = intelContext ? `${finalUser}\n\nKnowledge-base context to weave in:\n${intelContext}` : finalUser

  const tool = AGENCY_TOOLS.find(t => t.type === type)

  // Create draft work order up-front so we can persist token output as it streams
  const wo = await prisma.clientWorkOrder.create({
    data: {
      clientId: client.id,
      authorId: userId,
      type,
      title: `${tool?.label ?? type} — ${client.businessName}`,
      status: 'IN_PROGRESS',
      inputJson: { userInput, intelQuery } as any,
      intelligenceJson: { matches } as any,
    },
  })

  const upstream = await fetch('https://apps.abacus.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-5.4-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userPrompt },
      ],
      stream: true,
      max_tokens: 1800,
    }),
  })

  if (!upstream.ok || !upstream.body) {
    await prisma.clientWorkOrder.update({ where: { id: wo.id }, data: { status: 'DRAFT' } })
    return new Response('Generation service unavailable', { status: 502 })
  }

  const ts = new TransformStream()
  const writer = ts.writable.getWriter()
  const encoder = new TextEncoder()
  const reader = upstream.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let partial = ''

  // Send work order id first so client can navigate to it
  writer.write(encoder.encode(`event: meta\ndata: ${JSON.stringify({ workOrderId: wo.id })}\n\n`))

  ;(async () => {
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        partial += chunk
        const lines = partial.split('\n')
        partial = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') {
            await writer.write(encoder.encode('data: [DONE]\n\n'))
            continue
          }
          try {
            const parsed = JSON.parse(data)
            const delta = parsed?.choices?.[0]?.delta?.content ?? ''
            if (delta) buffer += delta
          } catch { /* skip */ }
          await writer.write(encoder.encode(line + '\n'))
        }
      }
      if (buffer) {
        await prisma.clientWorkOrder.update({
          where: { id: wo.id },
          data: {
            outputMarkdown: buffer,
            status: 'REVIEW',
            generatedAt: new Date(),
          },
        })
      } else {
        await prisma.clientWorkOrder.update({ where: { id: wo.id }, data: { status: 'DRAFT' } })
      }
    } catch (e) {
      console.error('agency generate stream error', e)
      try { await prisma.clientWorkOrder.update({ where: { id: wo.id }, data: { status: 'DRAFT' } }) } catch { /* noop */ }
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
