export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { requireInternalUser } from '@/lib/authz'
import { AGENCY_TOOLS, BRAND_RULES } from '@/lib/agency-prompts'
import { prisma } from '@/lib/db'
import { checkRateLimit, rateLimited } from '@/lib/rate-limit'
import { runAgentLoop, type ChatMessage } from '@/lib/agents/loop'
import { getPersona, type AgentPersona } from '@/lib/agents/registry'
import { formatMemoryBlock, recallMemory, recordTurn } from '@/lib/agents/memory'
import { getLLMProvider, type LLMProviderId } from '@/lib/llm-providers'

import { logServerError, logServerEvent } from '@/lib/diagnostics'

const PERSONA_CHAT_WINDOW_MS = 60 * 60 * 1000
const PERSONA_CHAT_LIMIT = 60

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

  const limit = checkRateLimit(req, { bucket: 'agent-persona-chat', limit: PERSONA_CHAT_LIMIT, windowMs: PERSONA_CHAT_WINDOW_MS, identifier: userId })
  if (!limit.allowed) return rateLimited(limit)

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

  const ts = new TransformStream()
  const writer = ts.writable.getWriter()
  const encoder = new TextEncoder()

  ;(async () => {
    const sse = (chunk: string) => writer.write(encoder.encode(chunk))
    const dataFrame = (content: string) => sse(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`)
    try {
      await sse(`event: meta\ndata: ${JSON.stringify({ threadId: thread.id, turnId: turn.id, persona: persona.id })}\n\n`)

      const result = await runAgentLoop({
        persona,
        userId,
        clientId,
        threadId: thread.id,
        modelId: provider.modelId,
        modelHint: persona.modelHint,
        apiKey,
        messages,
        signal: req.signal,
        onEvent: async (event) => {
          switch (event.type) {
            case 'delta':
              await dataFrame(event.content)
              break
            case 'status':
              await dataFrame(`\n_${event.content}_\n`)
              break
            case 'tool_call':
              await sse(`event: tool_call\ndata: ${JSON.stringify({ name: event.name, args: event.args })}\n\n`)
              break
            case 'tool_result':
              await sse(`event: tool\ndata: ${JSON.stringify(event.result)}\n\n`)
              break
            case 'error':
              await dataFrame(`\n_[agent: ${event.message}]_\n`)
              break
            case 'final':
              break
          }
        },
      })

      logServerEvent('ai.call.completed', {
        userId,
        persona: persona.id,
        clientId,
        threadId: thread.id,
        iterations: result.iterations,
        tools: result.toolTurns.length,
        stop: result.stopReason,
      })
      await sse('data: [DONE]\n\n')
    } catch (error) {
      logServerError('ai.call.stream_failed', error, { userId, persona: persona.id, clientId, threadId: thread.id })
      try { await writer.write(encoder.encode('data: [DONE]\n\n')) } catch { /* stream already closed */ }
    } finally {
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
