import dotenv from 'dotenv'
import { prisma } from '@/lib/db'
import { MarketingRuntimeError, runMarketingRuntime } from '@/lib/agents/marketing-runtime'

dotenv.config({ path: '.env.local' })

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

async function testNotConfiguredPath(userId: string) {
  try {
    await runMarketingRuntime({
      userId,
      goal: 'not-configured smoke',
      apiKey: '',
      modelId: 'route-llm',
      stageIds: ['strategy'],
    })
    throw new Error('runMarketingRuntime should reject missing apiKey')
  } catch (error) {
    assert(error instanceof MarketingRuntimeError, 'missing apiKey must raise MarketingRuntimeError')
    assert(error.code === 'ROUTELLM_NOT_CONFIGURED', `expected ROUTELLM_NOT_CONFIGURED, got ${error.code}`)
  }
}

async function testRealRuntimeSmoke(userId: string) {
  const apiKey = process.env.ABACUSAI_API_KEY
  assert(Boolean(apiKey), 'ABACUSAI_API_KEY must be configured for the real marketing runtime smoke test')

  const marker = `LL_MARKETING_RUNTIME_SMOKE_${Date.now()}`
  let threadId: string | null = null

  try {
    const result = await runMarketingRuntime({
      userId,
      goal: `${marker}: Build a concise internal launch order for LegacyAI dogfood marketing.`,
      cashflowNotes: 'Smoke test: no spend approval; assign no external action.',
      apiKey: apiKey!,
      modelId: 'route-llm',
      stageIds: ['strategy'],
      stageMaxTokens: 500,
      stageTimeoutMs: 90_000,
    })

    threadId = result.threadId
    assert(result.stages.length === 1, `expected one smoke-test stage, got ${result.stages.length}`)
    assert(result.stages[0]?.id === 'strategy', `expected strategy stage, got ${result.stages[0]?.id}`)
    assert(result.stages[0]?.iterations >= 1, 'real smoke stage must execute at least one RouteLLM iteration')
    assert(result.stages[0]?.finalText.trim().length > 40, 'real smoke stage must return non-empty final text')
    assert(result.finalMarkdown.includes(marker), 'final dossier must include the mission marker')

    const thread = await prisma.agentThread.findUnique({
      where: { id: result.threadId },
      include: { turns: true },
    })
    assert(thread?.persona === 'senior-marketing-runtime', 'runtime must persist a senior-marketing-runtime thread')
    assert((thread.turns?.length ?? 0) >= 3, `runtime thread must persist mission, stage, and final turns; got ${thread.turns?.length ?? 0}`)
    assert(!result.workOrderId, 'no-client smoke run must not create a client work order')

    console.log(`marketing-runtime-smoke-test: PASS thread=${result.threadId} stageStop=${result.stages[0]?.stopReason} iterations=${result.stages[0]?.iterations}`)
  } finally {
    if (threadId) {
      await prisma.agentThread.delete({ where: { id: threadId } }).catch(() => null)
    }
  }
}

async function main() {
  const user = await prisma.user.findFirst({
    where: { role: { in: ['superadmin', 'admin', 'team'] } },
    select: { id: true },
    orderBy: { updatedAt: 'desc' },
  })
  assert(user, 'at least one internal user is required for the marketing runtime smoke test')

  await testNotConfiguredPath(user.id)
  await testRealRuntimeSmoke(user.id)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
