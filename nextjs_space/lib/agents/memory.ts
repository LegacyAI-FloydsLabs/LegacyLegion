import { prisma } from '@/lib/db'
import { getPersona } from '@/lib/agents/registry'

export type AgentTurnRole = 'user' | 'assistant' | 'tool'

export interface RecordTurnInput {
  userId: string
  persona: string
  content: string
  role: AgentTurnRole
  clientId?: string
  threadId?: string
  title?: string
  toolName?: string
  toolCallsJson?: any
  modelUsed?: string
  tokenUsage?: any
}

export interface AgentMemoryHit {
  id: string
  namespace: string
  text: string
  score: number
}

export function memoryNamespace(personaId: string, userId: string, clientId?: string): string {
  const persona = getPersona(personaId)
  const template = persona?.memoryNamespaceTemplate ?? `agent:${personaId}:user:{userId}`
  if (template.includes('{clientId}') && !clientId) {
    throw new Error(`clientId is required for persona ${personaId}`)
  }

  return template
    .replace(':client:{clientId?}', clientId ? `:client:${clientId}` : '')
    .replace('{personaId}', personaId)
    .replace('{userId}', userId)
    .replace('{clientId}', clientId ?? '')
    .replace(/:+$/, '')
}

export async function recordTurn(input: RecordTurnInput) {
  const db = prisma as any
  const thread = input.threadId
    ? await db.agentThread.findFirst({ where: { id: input.threadId, userId: input.userId } })
    : await db.agentThread.create({
        data: {
          userId: input.userId,
          persona: input.persona,
          clientId: input.clientId,
          title: input.title ?? input.content.slice(0, 80),
        },
      })

  if (!thread) throw new Error(`AgentThread not found: ${input.threadId}`)

  const turn = await db.agentTurn.create({
    data: {
      threadId: thread.id,
      role: input.role,
      content: input.content,
      toolName: input.toolName,
      toolCallsJson: input.toolCallsJson,
      modelUsed: input.modelUsed,
      tokenUsage: input.tokenUsage,
    },
  })

  await embedAndUpsert({
    id: turn.id,
    text: `[${input.role}] ${input.content}`,
    namespace: memoryNamespace(input.persona, input.userId, input.clientId),
    metadata: {
      threadId: thread.id,
      userId: input.userId,
      persona: input.persona,
      clientId: input.clientId,
      role: input.role,
      createdAt: turn.createdAt.toISOString(),
      kind: 'turn',
    },
  })

  return { thread, turn }
}

export async function recallMemory(input: {
  userId: string
  persona: string
  query: string
  clientId?: string
  topK?: number
}): Promise<AgentMemoryHit[]> {
  const db = prisma as any
  const threadWhere = {
    userId: input.userId,
    persona: input.persona,
    ...(input.clientId ? { clientId: input.clientId } : {}),
  }
  const turns = await db.agentTurn.findMany({
    where: { thread: threadWhere },
    orderBy: { createdAt: 'desc' },
    take: input.topK ?? 5,
  })
  const namespace = memoryNamespace(input.persona, input.userId, input.clientId)

  return turns.map((turn: any, index: number) => ({
    id: turn.id,
    namespace,
    text: `[${turn.role}] ${turn.content}`,
    score: 1 - index * 0.01,
  }))
}

export async function embedAndUpsert(_item: {
  id: string
  text: string
  namespace: string
  metadata?: Record<string, any>
}): Promise<{ ok: boolean; skipped: true; reason: string }> {
  // Phase 1 persists memory in Postgres. Pinecone vector upsert is finalized in Phase 4.
  return { ok: true, skipped: true, reason: 'PINECONE_UPSERT_PHASE_4' }
}
