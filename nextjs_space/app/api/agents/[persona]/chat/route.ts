export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { requireInternalUser } from '@/lib/authz'
import { AGENCY_TOOLS, BRAND_RULES } from '@/lib/agency-prompts'
import { prisma } from '@/lib/db'
import { dispatchTool, type ToolName } from '@/lib/agents/dispatcher'
import { getPersona, type AgentPersona } from '@/lib/agents/registry'
import { formatMemoryBlock, recallMemory, recordTurn } from '@/lib/agents/memory'
import { getLLMProvider, type LLMProviderId } from '@/lib/llm-providers'

import { diagnosticId, logServerError, logServerEvent } from '@/lib/diagnostics'
type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }
const CHAT_STREAM_TIMEOUT_MS = 60_000

function toolsBlock(allowedTools: AgentPersona['allowedTools']): string {
  const tools = allowedTools === 'all'
    ? AGENCY_TOOLS
    : AGENCY_TOOLS.filter((tool) => allowedTools.includes(tool.type))

  const lines = tools.map((tool) => {
    const input = tool.needsInput ? `input: ${tool.needsInput}` : 'no input needed'
    return `- ${tool.type} — ${tool.description} (${input})`
  })

  if (allowedTools === 'all' || allowedTools.includes('PROSPECT_SEARCH')) {
    lines.push('- PROSPECT_SEARCH — Find net-new contacts via Explorium/Apollo (input: nlQuery or criteria)')
  }
  if (allowedTools === 'all' || allowedTools.includes('PROSPECT_PROMOTE')) {
    lines.push('- PROSPECT_PROMOTE — Promote a Prospect to a Lead (input: prospectId)')
  }

  return `<TOOLS_AVAILABLE>\nTOOLS YOU CAN CALL:\n${lines.join('\n') || '- No tools available for this persona.'}\n\nTo call a tool, output a single line in the form:\n→ TOOL_CALL: <ToolName> { ...args }\n</TOOLS_AVAILABLE>`
}

function parseToolCall(text: string): { name: ToolName; args: Record<string, any> } | null {
  const line = text.split('\n').find((candidate) => candidate.trim().startsWith('→ TOOL_CALL:'))
  if (!line) return null
  const match = line.match(/^\s*→ TOOL_CALL:\s*([A-Z_]+)\s*(\{.*\})\s*$/)
  if (!match) return null
  try {
    return { name: match[1] as ToolName, args: JSON.parse(match[2]) }
  } catch {
    return null
  }
}

async function clientContext(clientId?: string): Promise<string> {
  if (!clientId) return ''
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      workOrders: {
        where: { status: { in: ['DRAFT', 'IN_PROGRESS', 'REVIEW'] } },
        orderBy: { updatedAt: 'desc' },
        take: 8,
        select: { title: true, type: true, status: true, approvalStatus: true },
      },
      accessRequests: {
        orderBy: { updatedAt: 'desc' },
        take: 8,
        select: { platform: true, status: true, resourceUrl: true },
      },
    },
  })
  if (!client) return ''
  const workOrders = client.workOrders.length
    ? client.workOrders.map((item) => `- ${item.title} (${item.type}, ${item.status}, ${item.approvalStatus})`).join('\n')
    : '- None active.'
  const access = client.accessRequests.length
    ? client.accessRequests.map((item) => `- ${item.platform}: ${item.status}${item.resourceUrl ? ` (${item.resourceUrl})` : ''}`).join('\n')
    : '- No access requests recorded.'
  return `<CLIENT_CONTEXT>\nClient: ${client.businessName} (${client.industry}, ${client.city ?? 'Indianapolis'} ${client.state ?? 'IN'})\nWebsite: ${client.website ?? 'not provided'}\nGoogle Business Profile: ${client.gbpUrl ?? 'not provided'}\nTier: ${client.tier} • MRR: $${client.monthlyMRR}\nStatus: ${client.status}\nStrategy brief: ${client.strategyBrief || 'none'}\nActive work orders:\n${workOrders}\nAccount access status:\n${access}\nRules: Do not claim account access, website edits, GBP edits, social publishing, outreach, or spend unless the access status and work-order approval explicitly support it. Mark unsupported claims as assumptions.\n</CLIENT_CONTEXT>`
}


export async function POST(req: NextRequest, { params }: { params: { persona: string } }) {
  const auth = await requireInternalUser()
  if ('response' in auth) return auth.response
  const userId = auth.userId

  const persona = getPersona(params.persona)
  if (!persona) return new Response('Unknown persona', { status: 404 })

  const url = new URL(req.url)
  const clientId = url.searchParams.get('clientId') ?? undefined
  if (persona.id === 'account-manager' && !clientId) {
    return new Response('clientId is required for account-manager', { status: 400 })
  }

  const apiKey = process.env.ABACUSAI_API_KEY
  if (!apiKey) {
    logServerEvent('ai.call.not_configured', { userId, persona: persona.id, clientId })
    return new Response('Service unavailable', { status: 503 })
  }

  const body = await req.json().catch(() => ({}))
  const message = String(body?.message ?? '').trim()
  if (!message) return new Response('Empty message', { status: 400 })
  const provider = getLLMProvider((body?.provider as LLMProviderId) || 'auto')

  const { thread, turn } = await recordTurn({
    userId,
    persona: persona.id,
    clientId,
    threadId: body?.threadId ? String(body.threadId) : undefined,
    role: 'user',
    content: message,
  })

  const recalled = await recallMemory({ userId, persona: persona.id, clientId, query: message, topK: 5 })
  logServerEvent('ai.call.requested', { userId, persona: persona.id, clientId, threadId: thread.id })
  const system = [
    persona.systemPrompt,
    `<BRAND_RULES>\n${BRAND_RULES}\n</BRAND_RULES>`,
    await clientContext(clientId),
    formatMemoryBlock(recalled),
    toolsBlock(persona.allowedTools),
  ].filter(Boolean).join('\n\n')

  const messages: ChatMessage[] = [
    { role: 'system', content: system },
    { role: 'user', content: message },
  ]

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), CHAT_STREAM_TIMEOUT_MS)
  const upstream = await fetch('https://routellm.abacus.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: provider.modelId,
      messages,
      stream: true,
      metadata: { persona: persona.id, clientId, hint: persona.modelHint },
    }),
    signal: controller.signal,
  }).catch(() => null)

  if (!upstream?.ok || !upstream.body) {
    clearTimeout(timeout)
    const id = diagnosticId('ai_call')
    logServerError('ai.call.failed', new Error(`upstream status ${upstream?.status ?? 'no_response'}`), { diagnosticId: id, userId, persona: persona.id, clientId })
    return new Response(`Generation service unavailable (${id})`, { status: 502 })
  }

  const ts = new TransformStream()
  const writer = ts.writable.getWriter()
  const encoder = new TextEncoder()
  const reader = upstream.body.getReader()
  const decoder = new TextDecoder()
  let partial = ''
  let assistantBuffer = ''

  ;(async () => {
    try {
      await writer.write(encoder.encode(`event: meta\ndata: ${JSON.stringify({ threadId: thread.id, turnId: turn.id, persona: persona.id })}\n\n`))
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        partial += decoder.decode(value, { stream: true })
        const lines = partial.split('\n')
        partial = lines.pop() ?? ''
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data !== '[DONE]') {
              try {
                assistantBuffer += JSON.parse(data)?.choices?.[0]?.delta?.content ?? ''
              } catch {
                // Preserve upstream frame even if it is not JSON.
              }
            }
          }
          await writer.write(encoder.encode(`${line}\n`))
        }
      }

      if (assistantBuffer.trim()) {
        await recordTurn({ userId, persona: persona.id, clientId, threadId: thread.id, role: 'assistant', content: assistantBuffer.trim(), modelUsed: provider.modelId })
        logServerEvent('ai.call.completed', { userId, persona: persona.id, clientId, threadId: thread.id })
        const toolCall = parseToolCall(assistantBuffer)
        if (toolCall) {
          const toolResult = await dispatchTool(toolCall.name, toolCall.args, { userId, clientId, threadId: thread.id })
          await recordTurn({
            userId,
            persona: persona.id,
            clientId,
            threadId: thread.id,
            role: 'tool',
            content: toolResult.outputMarkdown ?? JSON.stringify(toolResult.output ?? toolResult.error),
            toolName: toolCall.name,
            toolCallsJson: { args: toolCall.args, result: toolResult },
          })
          await writer.write(encoder.encode(`event: tool\ndata: ${JSON.stringify(toolResult)}\n\n`))
        }
      }
      await writer.write(encoder.encode('data: [DONE]\n\n'))
    } catch (error) {
      logServerError('ai.call.stream_failed', error, { userId, persona: persona.id, clientId, threadId: thread.id })
    } finally {
      clearTimeout(timeout)
      try { await reader.cancel() } catch { /* upstream already closed */ }
      try { await writer.close() } catch { /* noop */ }
    }
  })()

  return new Response(ts.readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
