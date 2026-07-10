import { AGENCY_TOOLS, BRAND_RULES } from '@/lib/agency-prompts'
import { prisma } from '@/lib/db'
import { runAgentLoop, type AgentLoopToolTurn, type ChatMessage } from '@/lib/agents/loop'
import {
  accountManager,
  intelligenceAgent,
  leadGenManager,
  marketingGuru,
  seniorAdvisor,
  toolBuilder,
  type AgentPersona,
} from '@/lib/agents/registry'
import { formatMemoryBlock, recallMemory } from '@/lib/agents/memory'
import { defaultApprovalStatus } from '@/lib/work-orders'

const RUNTIME_THREAD_PERSONA = 'senior-marketing-runtime'
const RUNTIME_WORK_ORDER_TYPE = 'SENIOR_MARKETING_RUNTIME'
const STAGE_TIMEOUT_MS = 45_000

export type MarketingOperatorLane =
  | 'SENIOR_LLM'
  | 'DOUGLAS_OFFICE_HIL'
  | 'RYAN_FIELD_SALES'
  | 'CASHFLOW_DECISION'
  | 'APPROVAL_GATE'

export type MarketingRuntimeStageId =
  | 'strategy'
  | 'account'
  | 'intelligence'
  | 'llm-computer-work'
  | 'cashflow'
  | 'sales-field'
  | 'operations-hil'
  | 'automation'
  | 'final-router'

export interface MarketingRuntimeStage {
  id: MarketingRuntimeStageId
  label: string
  persona: AgentPersona
  lane: MarketingOperatorLane
  mission: string
  modelHint: AgentPersona['modelHint']
  maxIterations: number
  maxTokens: number
}

export interface MarketingRuntimeToolTurn {
  name: string
  ok: boolean
  workOrderId?: string
  errorCode?: string
  errorMessage?: string
}

export interface MarketingRuntimeStageResult {
  id: MarketingRuntimeStageId
  label: string
  personaId: string
  personaName: string
  lane: MarketingOperatorLane
  mission: string
  modelId: string
  modelHint: AgentPersona['modelHint']
  finalText: string
  iterations: number
  stopReason: string
  toolTurns: MarketingRuntimeToolTurn[]
}

export interface RunMarketingRuntimeInput {
  userId: string
  goal: string
  apiKey: string
  modelId: string
  clientId?: string
  cashflowNotes?: string
  stageIds?: MarketingRuntimeStageId[]
  stageMaxTokens?: number
  stageTimeoutMs?: number
  signal?: AbortSignal
}

export interface RunMarketingRuntimeResult {
  threadId: string
  clientId?: string
  workOrderId?: string
  finalMarkdown: string
  stages: MarketingRuntimeStageResult[]
}

export class MarketingRuntimeError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message)
  }
}

export type ManagedCompanyRelationship =
  | 'MARKETING_FIRM_DOGFOOD'
  | 'OWNED_DOGFOOD'
  | 'CLOSE_UMBRELLA'
  | 'EXTERNAL_CLIENT'
  | 'UNCLASSIFIED'

type ManagedCompanyContext = {
  relationship: ManagedCompanyRelationship
  label: string
  notes: string
  operatingBias: string
}

const MANAGED_COMPANY_CONTEXTS: ManagedCompanyContext[] = [
  {
    relationship: 'MARKETING_FIRM_DOGFOOD',
    label: 'LegacyAI / LegacyLegion marketing firm',
    notes: 'The marketing firm manages itself as a client. This is first-party dogfooding for the senior LLM teammates and the agency operating system.',
    operatingBias: 'Optimize for reusable process, fast learning loops, and proof that the firm can manage itself before selling the pattern externally.',
  },
  {
    relationship: 'OWNED_DOGFOOD',
    label: 'Precision Sewer Inspection',
    notes: 'Douglas and Ryan own Precision Sewer Inspection. Treat PSI as an owned dogfood client and a real revenue/customer operation, not a demo account.',
    operatingBias: 'Favor direct operational improvement, sales enablement, booking/reporting clarity, and honest proof because failures affect an owned business.',
  },
  {
    relationship: 'CLOSE_UMBRELLA',
    label: 'Simple Man Plumbing',
    notes: 'Simple Man Plumbing is Dave the certified plumber’s company and sits inside the close personal/umbrella relationship set.',
    operatingBias: 'Treat relationship risk and trust as high. Give practical plumbing-market work, but keep approvals and claims precise.',
  },
  {
    relationship: 'EXTERNAL_CLIENT',
    label: 'Restore & Renew',
    notes: 'Restore & Renew, the Noblesville restoration company, is the only fully outside client in the current managed-company set.',
    operatingBias: 'Treat this as the cleanest external-client proving ground: stricter evidence, clearer approvals, and cleaner client-facing language.',
  },
]

export const MARKETING_MODEL_ROUTER: Record<MarketingRuntimeStageId, { defaultModelId: string; modelHint: AgentPersona['modelHint']; purpose: string }> = {
  strategy: { defaultModelId: 'route-llm', modelHint: 'reasoning', purpose: 'senior strategy, budget framing, process leadership' },
  account: { defaultModelId: 'route-llm', modelHint: 'balanced', purpose: 'client state, access risk, work order review' },
  intelligence: { defaultModelId: 'route-llm', modelHint: 'balanced', purpose: 'evidence lookup, keyword and market read' },
  'llm-computer-work': { defaultModelId: 'route-llm', modelHint: 'balanced', purpose: 'ad creation, content generation, keyword work, plans and briefs' },
  cashflow: { defaultModelId: 'route-llm', modelHint: 'reasoning', purpose: 'cashflow constraint, spend cap, and budget-dependent sequencing' },
  'sales-field': { defaultModelId: 'route-llm', modelHint: 'balanced', purpose: 'Ryan sales pipeline and in-field tasks' },
  'operations-hil': { defaultModelId: 'route-llm', modelHint: 'reasoning', purpose: 'Douglas office, cashflow, physical and human-in-the-loop tasks' },
  automation: { defaultModelId: 'route-llm', modelHint: 'reasoning', purpose: 'repeatable tool and workflow gaps' },
  'final-router': { defaultModelId: 'route-llm', modelHint: 'reasoning', purpose: 'single operating order with owners and approval gates' },
}

export const MARKETING_RUNTIME_STAGES: MarketingRuntimeStage[] = [
  {
    id: 'strategy',
    label: 'Senior Strategy Lead',
    persona: seniorAdvisor,
    lane: 'SENIOR_LLM',
    mission: 'Lead the process. Define the business objective, budget assumptions, offer, ICP, likely bottlenecks, and operating sequence.',
    modelHint: 'reasoning',
    maxIterations: 1,
    maxTokens: 1400,
  },
  {
    id: 'account',
    label: 'Client Account Read',
    persona: accountManager,
    lane: 'APPROVAL_GATE',
    mission: 'Read client status, active work, blocked access, approvals, and what cannot be claimed or executed yet.',
    modelHint: 'balanced',
    maxIterations: 2,
    maxTokens: 1300,
  },
  {
    id: 'intelligence',
    label: 'Market Intelligence',
    persona: intelligenceAgent,
    lane: 'SENIOR_LLM',
    mission: 'Use available evidence for market, keyword, GBP, GSC, competitor, and data-gap analysis. Run one safe intelligence tool only when it creates useful work.',
    modelHint: 'balanced',
    maxIterations: 2,
    maxTokens: 1400,
  },
  {
    id: 'llm-computer-work',
    label: 'LLM Computer Work',
    persona: marketingGuru,
    lane: 'SENIOR_LLM',
    mission: 'Perform computer-native marketing work: ad creation, keyword planning, content generation, business planning, campaign strategy, briefs, and client work orders.',
    modelHint: 'balanced',
    maxIterations: 3,
    maxTokens: 1700,
  },
  {
    id: 'cashflow',
    label: 'Cashflow Router',
    persona: seniorAdvisor,
    lane: 'CASHFLOW_DECISION',
    mission: 'Convert Douglas-supplied cashflow into budget gates, spend caps, tool priorities, and no-spend fallback actions.',
    modelHint: 'reasoning',
    maxIterations: 1,
    maxTokens: 1100,
  },
  {
    id: 'sales-field',
    label: 'Ryan Sales / Field Assignments',
    persona: leadGenManager,
    lane: 'RYAN_FIELD_SALES',
    mission: 'Convert the plan into Ryan-owned prospecting, sales calls, visits, field observations, relationship work, and follow-up scripts.',
    modelHint: 'balanced',
    maxIterations: 2,
    maxTokens: 1300,
  },
  {
    id: 'operations-hil',
    label: 'Douglas Office / HIL Assignments',
    persona: seniorAdvisor,
    lane: 'DOUGLAS_OFFICE_HIL',
    mission: 'Assign Douglas only the office, cashflow, physical, credential, approval, walking, carrying, and other HIL tasks that cannot be done by the LLM runtime.',
    modelHint: 'reasoning',
    maxIterations: 1,
    maxTokens: 1200,
  },
  {
    id: 'automation',
    label: 'Workflow Automation Watch',
    persona: toolBuilder,
    lane: 'SENIOR_LLM',
    mission: 'Identify repeated patterns that should become reusable prompts, tools, templates, or automations. Do not request code changes unless the pattern is clear.',
    modelHint: 'reasoning',
    maxIterations: 1,
    maxTokens: 1000,
  },
  {
    id: 'final-router',
    label: 'Operating Order',
    persona: seniorAdvisor,
    lane: 'APPROVAL_GATE',
    mission: 'Produce the final operating order: senior LLM work, Douglas office/HIL work, Ryan sales/field work, cashflow asks, approval gates, and next execution sequence.',
    modelHint: 'reasoning',
    maxIterations: 1,
    maxTokens: 1700,
  },
]

function clip(value: unknown, max = 2_500) {
  const text = String(value ?? '').trim()
  if (text.length <= max) return text
  return `${text.slice(0, max - 20)}\n[truncated]`
}

function jsonSafe(value: unknown) {
  return JSON.parse(JSON.stringify(value ?? null))
}

function routeModelForStage(stage: MarketingRuntimeStage, requestedModelId: string) {
  const route = MARKETING_MODEL_ROUTER[stage.id]
  return requestedModelId || route.defaultModelId
}

function normalizeCompanyName(value: string) {
  return value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim()
}

function managedCompanyContext(client: Awaited<ReturnType<typeof loadClient>>): ManagedCompanyContext {
  if (!client) return MANAGED_COMPANY_CONTEXTS[0]
  const name = normalizeCompanyName(client.businessName)
  if (name.includes('precision sewer') || name.includes('psi')) return MANAGED_COMPANY_CONTEXTS[1]
  if (name.includes('simple man') && name.includes('plumb')) return MANAGED_COMPANY_CONTEXTS[2]
  if (name.includes('restore') && name.includes('renew')) return MANAGED_COMPANY_CONTEXTS[3]
  return {
    relationship: 'UNCLASSIFIED',
    label: client.businessName,
    notes: 'This client is not classified in the current ownership/umbrella map.',
    operatingBias: 'Ask Douglas whether this is owned, close umbrella, or fully external before making relationship-sensitive strategy decisions.',
  }
}

function toolsBlock(allowedTools: AgentPersona['allowedTools']): string {
  const tools = allowedTools === 'all'
    ? AGENCY_TOOLS
    : AGENCY_TOOLS.filter((tool) => allowedTools.includes(tool.type))

  const lines = tools.map((tool) => {
    const input = tool.needsInput ? `input: ${tool.needsInput}` : 'no input needed'
    return `- ${tool.type} - ${tool.description} (${input})`
  })

  if (allowedTools === 'all' || allowedTools.includes('PROSPECT_SEARCH')) {
    lines.push('- PROSPECT_SEARCH - Find net-new contacts via Explorium/Apollo (input: nlQuery or criteria)')
  }
  if (allowedTools === 'all' || allowedTools.includes('PROSPECT_PROMOTE')) {
    lines.push('- PROSPECT_PROMOTE - Promote a Prospect to a Lead (input: prospectId)')
  }

  return `<TOOLS_AVAILABLE>
TOOLS YOU CAN CALL:
${lines.join('\n') || '- No tools available for this stage.'}

To call a tool, output a single line in the form:
→ TOOL_CALL: <ToolName> { ...args }
</TOOLS_AVAILABLE>`
}

async function loadClient(clientId?: string) {
  if (!clientId) return null
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      workOrders: {
        orderBy: { updatedAt: 'desc' },
        take: 12,
        select: { id: true, title: true, type: true, status: true, approvalStatus: true, priority: true },
      },
      clientNotes: {
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: { body: true, pinned: true },
      },
      accessRequests: {
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: { platform: true, status: true, resourceUrl: true },
      },
      prospects: {
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          companyName: true,
          companyDomain: true,
          personFirstName: true,
          personLastName: true,
          personTitle: true,
          personEmail: true,
          city: true,
          state: true,
          promotedToLeadId: true,
        },
      },
      intelligence: true,
    },
  })
  if (!client) throw new MarketingRuntimeError('CLIENT_NOT_FOUND', 'Client not found.', 404)
  return client
}

function renderClientContext(client: Awaited<ReturnType<typeof loadClient>>) {
  const relationship = managedCompanyContext(client)
  if (!client) {
    return `<CLIENT_CONTEXT>
No client selected. Treat this as LegacyAI business planning. Do not run client-required tools. Ask Douglas for cashflow, approvals, and missing field facts before external action.
</CLIENT_CONTEXT>`
  }

  const work = client.workOrders.length
    ? client.workOrders.map((item) => `- ${item.title} (${item.type}, ${item.status}, ${item.approvalStatus}, ${item.priority})`).join('\n')
    : '- None recorded.'
  const notes = client.clientNotes.length
    ? client.clientNotes.map((note) => `- ${note.pinned ? '[pinned] ' : ''}${clip(note.body, 260)}`).join('\n')
    : '- None recorded.'
  const access = client.accessRequests.length
    ? client.accessRequests.map((item) => `- ${item.platform}: ${item.status}${item.resourceUrl ? ` (${item.resourceUrl})` : ''}`).join('\n')
    : '- None recorded.'
  const prospects = client.prospects.length
    ? client.prospects.map((item) => {
        const person = [item.personFirstName, item.personLastName].filter(Boolean).join(' ')
        return `- ${person || item.companyName || 'Unnamed prospect'}${item.personTitle ? `, ${item.personTitle}` : ''}${item.companyDomain ? ` at ${item.companyDomain}` : ''}${item.promotedToLeadId ? ' [promoted]' : ''}`
      }).join('\n')
    : '- None recorded.'

  return `<CLIENT_CONTEXT>
Client: ${client.businessName}
Industry: ${client.industry}
Location: ${client.city ?? 'Indianapolis'}, ${client.state ?? 'IN'}
Website: ${client.website ?? 'not provided'}
GBP: ${client.gbpUrl ?? 'not provided'}
Tier/MRR: ${client.tier} / $${client.monthlyMRR}
Status: ${client.status}
Strategy brief: ${client.strategyBrief || 'none'}

Managed-company relationship: ${relationship.relationship}
Relationship label: ${relationship.label}
Relationship notes: ${relationship.notes}
Operating bias: ${relationship.operatingBias}

Recent work orders:
${work}

Recent notes:
${notes}

Access / credential status:
${access}

Prospects:
${prospects}

GBP snapshot:
${client.intelligence?.gbpSnapshotJson ? JSON.stringify(client.intelligence.gbpSnapshotJson).slice(0, 1_200) : 'none'}

GSC summary:
${client.intelligence?.gscSummaryJson ? JSON.stringify(client.intelligence.gscSummaryJson).slice(0, 1_200) : 'none'}

Safety rules: do not claim website edits, GBP edits, ad spend, outreach, account access, traffic, rankings, delivery, or client-visible execution unless a work order and approval state prove it.
</CLIENT_CONTEXT>`
}

function priorStageBlock(stages: MarketingRuntimeStageResult[]) {
  if (!stages.length) return '<PRIOR_RUNTIME_OUTPUT>\nNo prior stage output yet.\n</PRIOR_RUNTIME_OUTPUT>'
  return `<PRIOR_RUNTIME_OUTPUT>
${stages.map((stage) => `## ${stage.label} (${stage.personaName}; ${stage.lane})\n${clip(stage.finalText, 1_500) || '[no final text]'}\nTools: ${stage.toolTurns.length ? stage.toolTurns.map((tool) => `${tool.name}:${tool.ok ? 'ok' : tool.errorCode ?? 'error'}`).join(', ') : 'none'}`).join('\n\n')}
</PRIOR_RUNTIME_OUTPUT>`
}

function systemPrompt(stage: MarketingRuntimeStage, clientContext: string, memoryBlock: string) {
  const route = MARKETING_MODEL_ROUTER[stage.id]
  return [
    stage.persona.systemPrompt,
    `<SENIOR_MARKETING_RUNTIME>
This is not CrewAI. This is LegacyLegion's first-party model-routed senior marketing runtime.
Operating model:
- Senior LLM team leads strategy and computer-native marketing work.
- LLM owns ad creation, keyword work, business planning, strategy, content generation, briefs, and draft work orders.
- Douglas is a junior operator for office tasks, cashflow decisions, credentials, approvals, physical errands, walking, carrying, and HIL steps.
- Ryan owns salesperson and in-field tasks: calls, visits, customer conversations, relationship work, and field observations.
- All client-visible or external actions stay behind work-order review and approval gates.
- Do not add or assume headless browser automation, CrewAI, Google ADK, Claude SDK, or new external automation frameworks. Repetitive tasks become Tool-Builder proposals for Douglas to approve separately.
- Teaching mandate: teach Douglas how to run a high-level marketing firm while doing the work. Keep teaching concise and embedded in the operating order; do not let lessons displace client execution.
- Competitive stance: win clients from larger incumbent marketing companies such as Scorpion by being low-pressure, field-level partners who fight alongside clients and understand what each battle can win or cost.
- Posture rule: never talk down to clients or operate from a higher position. Translate strategy into practical field reality, risks, tradeoffs, and next moves.
- LegacyAI site voice: bridge human experience with AI, preserve what operators already know, turn technical complexity into intuitive client-specific systems, and sell measurable operating results rather than technology for its own sake.
- Client promise: start from what is broken in the real workflow, build the fix on our side, show it working with real customers, real numbers, and real operations, then keep improving it with the client.
Current route: ${stage.id}; model hint: ${route.modelHint}; purpose: ${route.purpose}; operator lane: ${stage.lane}.
</SENIOR_MARKETING_RUNTIME>`,
    `<BRAND_RULES>\n${BRAND_RULES}\n</BRAND_RULES>`,
    clientContext,
    memoryBlock,
    toolsBlock(stage.persona.allowedTools),
  ].join('\n\n')
}

function stagePrompt(args: {
  goal: string
  cashflowNotes?: string
  stage: MarketingRuntimeStage
  priorStages: MarketingRuntimeStageResult[]
}) {
  return `<MISSION>
Goal: ${args.goal}
Cashflow / budget notes from Douglas: ${args.cashflowNotes || 'not supplied - ask for exact available cashflow before spend commitments'}
Stage: ${args.stage.label}
Stage assignment: ${args.stage.mission}
</MISSION>

${priorStageBlock(args.priorStages)}

Return this stage result:
## Stage Verdict
## LLM Computer Work
## Douglas Office / HIL Tasks
## Ryan Sales / Field Tasks
## Cashflow Needed From Douglas
## Approval Gates
## Douglas Learning Note
## Handoff

Only call a permitted tool when the tool can safely perform real computer work for this stage. Otherwise return the stage result without a tool call.`
}

function summarizeTools(toolTurns: AgentLoopToolTurn[]): MarketingRuntimeToolTurn[] {
  return toolTurns.map((turn) => ({
    name: String(turn.name),
    ok: Boolean(turn.result.ok),
    workOrderId: turn.result.workOrderId,
    errorCode: turn.result.error?.code,
    errorMessage: turn.result.error?.message,
  }))
}

function selectRuntimeStages(stageIds?: MarketingRuntimeStageId[]) {
  if (!stageIds?.length) return MARKETING_RUNTIME_STAGES
  const uniqueIds = [...new Set(stageIds)]
  const stages = uniqueIds.map((id) => MARKETING_RUNTIME_STAGES.find((stage) => stage.id === id))
  const missing = stages.findIndex((stage) => !stage)
  if (missing !== -1) throw new MarketingRuntimeError('UNKNOWN_STAGE', `Unknown runtime stage: ${uniqueIds[missing]}`, 400)
  return stages as MarketingRuntimeStage[]
}

function renderDossier(args: {
  goal: string
  cashflowNotes?: string
  client: Awaited<ReturnType<typeof loadClient>>
  stages: MarketingRuntimeStageResult[]
}) {
  const relationship = managedCompanyContext(args.client)
  const clientLine = args.client
    ? `${args.client.businessName} (${args.client.industry}, ${args.client.city ?? 'Indianapolis'} ${args.client.state ?? 'IN'})`
    : 'LegacyAI internal business planning'
  const generated = args.stages
    .flatMap((stage) => stage.toolTurns.map((tool) => ({ stage, tool })))
    .filter((item) => item.tool.workOrderId)

  return `# Senior Marketing Runtime Operating Order

## Mission
${args.goal}

## Client / Business Context
${clientLine}

## Managed-Company Relationship
${relationship.relationship}: ${relationship.notes}

Operating bias: ${relationship.operatingBias}

## Cashflow Constraint
${args.cashflowNotes || 'Not supplied. Douglas must provide available cashflow before spend commitments.'}

## Assignment Ledger
### Senior LLM Team Owns
- Strategy, positioning, keyword planning, content generation, ad drafts, business planning, campaign briefs, and draft client work orders.

### Douglas Owns
- Cashflow decisions, office/HIL tasks, credentials, approvals, client-visible signoff, and physical tasks that require walking, carrying, or being present.

### Ryan Owns
- Sales calls, in-field observations, relationship building, client conversations, prospect follow-up, and revenue feedback from the field.

## Teaching & Positioning Rule
- Teach Douglas one concise operating lesson per stage when useful, but keep real client execution first.
- Compete with larger incumbents by being low-pressure field partners, not by talking down to clients.
- Explain what each marketing battle can win, what it can cost, and what proof would change the next move.
- Keep LegacyAI's website voice: preserve experience, make AI practical, start from broken workflows, show results in real operations, and avoid technology-for-technology's-sake language.

## Runtime Stages
${args.stages.map((stage) => `### ${stage.label} - ${stage.personaName}
Lane: ${stage.lane}. Model: ${stage.modelId} (${stage.modelHint}). Stop: ${stage.stopReason}. Iterations: ${stage.iterations}. Tools: ${stage.toolTurns.length ? stage.toolTurns.map((tool) => `${tool.name} ${tool.ok ? 'ok' : tool.errorCode ?? 'error'}`).join(', ') : 'none'}.

${stage.finalText || '_No final text returned._'}`).join('\n\n')}

## Generated Work Orders
${generated.length ? generated.map((item) => `- ${item.tool.workOrderId} from ${item.stage.label} (${item.tool.name})`).join('\n') : '- No tool-generated work orders in this run.'}

## Execution Rule
Do the LLM-owned computer work inside LegacyLegion first. Douglas and Ryan only take the HIL, cashflow, office, sales, and field tasks assigned above.`
}

async function createRuntimeWorkOrder(args: {
  userId: string
  clientId?: string
  goal: string
  cashflowNotes?: string
  finalMarkdown: string
  threadId: string
  stages: MarketingRuntimeStageResult[]
}) {
  if (!args.clientId) return null
  const client = await prisma.client.findUnique({ where: { id: args.clientId }, select: { id: true, businessName: true } })
  if (!client) throw new MarketingRuntimeError('CLIENT_NOT_FOUND', 'Client not found.', 404)
  const approvalStatus = defaultApprovalStatus(RUNTIME_WORK_ORDER_TYPE, undefined)
  const item = await prisma.clientWorkOrder.create({
    data: {
      clientId: client.id,
      authorId: args.userId,
      type: RUNTIME_WORK_ORDER_TYPE,
      title: `Senior Marketing Runtime - ${client.businessName}`,
      status: 'REVIEW',
      inputJson: jsonSafe({
        goal: args.goal,
        cashflowNotes: args.cashflowNotes,
        threadId: args.threadId,
        stages: args.stages.map((stage) => ({ id: stage.id, lane: stage.lane, personaId: stage.personaId, modelId: stage.modelId, stopReason: stage.stopReason })),
      }) as any,
      outputMarkdown: args.finalMarkdown,
      intelligenceJson: jsonSafe({
        toolTurns: args.stages.flatMap((stage) => stage.toolTurns.map((tool) => ({ stageId: stage.id, ...tool }))),
      }) as any,
      generatedAt: new Date(),
      ownerKind: 'AI_PERSONA',
      ownerLabel: 'Senior Marketing Runtime',
      priority: 'HIGH',
      approvalStatus,
      approvedAt: approvalStatus === 'APPROVED' ? new Date() : null,
      events: {
        create: {
          actorId: args.userId,
          type: 'CREATED',
          toStatus: 'REVIEW',
          notes: args.goal,
        },
      },
    },
    select: { id: true },
  })
  return item.id
}

export async function runMarketingRuntime(input: RunMarketingRuntimeInput): Promise<RunMarketingRuntimeResult> {
  const goal = clip(input.goal, 4_000)
  if (!goal) throw new MarketingRuntimeError('GOAL_REQUIRED', 'Marketing mission is required.')
  if (!input.apiKey) throw new MarketingRuntimeError('ROUTELLM_NOT_CONFIGURED', 'ABACUSAI_API_KEY is not configured.', 503)

  const client = await loadClient(input.clientId)
  const clientContext = renderClientContext(client)
  const thread = await prisma.agentThread.create({
    data: {
      userId: input.userId,
      persona: RUNTIME_THREAD_PERSONA,
      clientId: input.clientId,
      title: `Runtime: ${goal.slice(0, 72)}`,
    },
  })
  await prisma.agentTurn.create({
    data: {
      threadId: thread.id,
      role: 'user',
      content: `Senior marketing runtime mission:\n${goal}\n\nCashflow notes:\n${input.cashflowNotes || 'not supplied'}`,
    },
  })

  const stages: MarketingRuntimeStageResult[] = []
  for (const stage of selectRuntimeStages(input.stageIds)) {
    if (!input.clientId && stage.id === 'account') continue
    const memory = await recallMemory({
      userId: input.userId,
      persona: stage.persona.id,
      clientId: input.clientId,
      query: `${goal}\n${stages.map((item) => item.finalText).join('\n')}`,
      topK: 5,
    }).catch(() => [])
    const routedModelId = routeModelForStage(stage, input.modelId)
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt(stage, clientContext, formatMemoryBlock(memory)) },
      { role: 'user', content: stagePrompt({ goal, cashflowNotes: input.cashflowNotes, stage, priorStages: stages }) },
    ]
    const result = await runAgentLoop({
      persona: stage.persona,
      userId: input.userId,
      clientId: input.clientId,
      threadId: thread.id,
      modelId: routedModelId,
      modelHint: stage.modelHint,
      apiKey: input.apiKey,
      messages,
      maxIterations: stage.maxIterations,
      maxTokens: input.stageMaxTokens ?? stage.maxTokens,
      perCallTimeoutMs: input.stageTimeoutMs ?? STAGE_TIMEOUT_MS,
      signal: input.signal,
    })
    stages.push({
      id: stage.id,
      label: stage.label,
      personaId: stage.persona.id,
      personaName: stage.persona.displayName,
      lane: stage.lane,
      mission: stage.mission,
      modelId: routedModelId,
      modelHint: stage.modelHint,
      finalText: result.finalText,
      iterations: result.iterations,
      stopReason: result.stopReason,
      toolTurns: summarizeTools(result.toolTurns),
    })
  }

  const finalMarkdown = renderDossier({ goal, cashflowNotes: input.cashflowNotes, client, stages })
  const workOrderId = await createRuntimeWorkOrder({
    userId: input.userId,
    clientId: input.clientId,
    goal,
    cashflowNotes: input.cashflowNotes,
    finalMarkdown,
    threadId: thread.id,
    stages,
  })

  await prisma.agentTurn.create({
    data: {
      threadId: thread.id,
      role: 'assistant',
      content: finalMarkdown,
      modelUsed: input.modelId,
      toolCallsJson: jsonSafe({ marketingRuntime: true, workOrderId, stages }) as any,
    },
  })

  return {
    threadId: thread.id,
    clientId: input.clientId,
    workOrderId: workOrderId ?? undefined,
    finalMarkdown,
    stages,
  }
}
