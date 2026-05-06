import { AGENCY_TOOLS, type AgencyToolType, buildAgencyPrompt } from '@/lib/agency-prompts'
import { prisma } from '@/lib/db'
import { searchSEOIntelligence, summarizeMatches } from '@/lib/pinecone'
import type { AgentToolName } from '@/lib/agents/registry'
import { promoteProspectToLead, ProspectSearchError, searchProspects } from '@/lib/prospects/service'

export type ToolName = AgentToolName

export interface ToolContext {
  userId: string
  clientId?: string
  threadId?: string
}

export interface ToolResult {
  ok: boolean
  output?: any
  outputMarkdown?: string
  workOrderId?: string
  error?: { code: string; message: string }
}

const AGENCY_TOOL_TYPES = new Set<AgencyToolType>(AGENCY_TOOLS.map((tool) => tool.type))

function isAgencyTool(name: ToolName): name is AgencyToolType {
  return AGENCY_TOOL_TYPES.has(name as AgencyToolType)
}

function toolError(code: string, message: string): ToolResult {
  return { ok: false, error: { code, message } }
}

async function readRouteLLMStream(response: Response): Promise<string> {
  if (!response.body) return ''
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let partial = ''
  let output = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    partial += decoder.decode(value, { stream: true })
    const lines = partial.split('\n')
    partial = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (!data || data === '[DONE]') continue
      try {
        const parsed = JSON.parse(data)
        output += parsed?.choices?.[0]?.delta?.content ?? ''
      } catch {
        // Ignore malformed upstream stream frames; the final work order reflects accumulated text only.
      }
    }
  }

  return output.trim()
}

export async function dispatchTool(
  name: ToolName,
  args: Record<string, any>,
  ctx: ToolContext
): Promise<ToolResult> {
  if (name === 'PROSPECT_SEARCH') {
    try {
      const result = await searchProspects({
        userId: ctx.userId,
        clientId: ctx.clientId ?? args?.clientId ?? null,
        nlQuery: typeof args?.nlQuery === 'string' ? args.nlQuery : undefined,
        criteria: args?.criteria,
        source: args?.source,
        limit: args?.limit,
      })
      return { ok: true, output: result, outputMarkdown: `Found ${result.counts.found}; deduped ${result.counts.deduped}; persisted ${result.counts.persisted}.` }
    } catch (error) {
      if (error instanceof ProspectSearchError) return toolError(error.code, error.message)
      throw error
    }
  }

  if (name === 'PROSPECT_PROMOTE') {
    try {
      const prospectId = String(args?.prospectId ?? args?.id ?? '')
      if (!prospectId) return toolError('PROSPECT_ID_REQUIRED', 'prospectId is required.')
      const result = await promoteProspectToLead({ userId: ctx.userId, prospectId })
      return { ok: true, output: result, outputMarkdown: `Promoted prospect to lead ${result.leadId}.` }
    } catch (error) {
      if (error instanceof ProspectSearchError) return toolError(error.code, error.message)
      throw error
    }
  }

  if (!isAgencyTool(name)) return toolError('UNKNOWN_TOOL', `Unknown tool: ${name}`)
  if (!ctx.clientId) return toolError('CLIENT_REQUIRED', `${name} requires a clientId.`)

  const apiKey = process.env.ABACUSAI_API_KEY
  if (!apiKey) return toolError('ROUTELLM_NOT_CONFIGURED', 'ABACUSAI_API_KEY is not configured.')

  const client = await prisma.client.findUnique({ where: { id: ctx.clientId }, include: { intelligence: true } })
  if (!client) return toolError('CLIENT_NOT_FOUND', `Client not found: ${ctx.clientId}`)

  const prompt = buildAgencyPrompt(name, {
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
      liveGBP: client.intelligence?.gbpSnapshotJson as any,
    },
    intelligenceContext: '',
    userInput: String(args?.userInput ?? args?.input ?? '').trim(),
  })

  const matches = await searchSEOIntelligence(prompt.intelQuery, 6).catch(() => [])
  const intelContext = summarizeMatches(matches as any)
  const userPrompt = intelContext
    ? `${prompt.user.replace('[no indexed insights matched — proceed using best practice]', intelContext)}\n\nKnowledge-base context to weave in:\n${intelContext}`
    : prompt.user

  const tool = AGENCY_TOOLS.find((candidate) => candidate.type === name)
  const workOrder = await prisma.clientWorkOrder.create({
    data: {
      clientId: client.id,
      authorId: ctx.userId,
      type: name,
      title: `${tool?.label ?? name} — ${client.businessName}`,
      status: 'IN_PROGRESS',
      inputJson: { args, threadId: ctx.threadId, intelQuery: prompt.intelQuery } as any,
      intelligenceJson: { matches } as any,
    },
  })

  const upstream = await fetch('https://routellm.abacus.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'route-llm',
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: userPrompt },
      ],
      stream: true,
      max_tokens: 1800,
    }),
  })

  if (!upstream.ok) {
    await prisma.clientWorkOrder.update({ where: { id: workOrder.id }, data: { status: 'DRAFT' } })
    return toolError('GENERATION_FAILED', `RouteLLM returned HTTP ${upstream.status}.`)
  }

  const outputMarkdown = await readRouteLLMStream(upstream)
  await prisma.clientWorkOrder.update({
    where: { id: workOrder.id },
    data: {
      outputMarkdown: outputMarkdown || null,
      status: outputMarkdown ? 'REVIEW' : 'DRAFT',
      generatedAt: outputMarkdown ? new Date() : null,
    },
  })

  return {
    ok: Boolean(outputMarkdown),
    output: { type: name, clientId: client.id },
    outputMarkdown,
    workOrderId: workOrder.id,
    error: outputMarkdown ? undefined : { code: 'EMPTY_GENERATION', message: 'RouteLLM returned an empty response.' },
  }
}
