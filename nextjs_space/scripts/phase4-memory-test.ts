import dotenv from 'dotenv'
import { prisma } from '@/lib/db'
import { describeNamespaceVectorCount, searchNamespace, upsertVectors } from '@/lib/pinecone'
import {
  formatMemoryBlock,
  memoryNamespace,
  recordTurn,
  recallMemory,
  upsertClientIntelligenceMemory,
  upsertClientNoteMemory,
  upsertClientWorkOrderMemory,
} from '@/lib/agents/memory'

dotenv.config({ path: '.env.local' })

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function uniqueId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

async function eventually<T>(label: string, fn: () => Promise<T | null>, attempts = 8): Promise<T> {
  let last: T | null = null
  for (let attempt = 0; attempt < attempts; attempt++) {
    last = await fn()
    if (last) return last
    await new Promise((resolve) => setTimeout(resolve, 1500))
  }
  throw new Error(`${label} did not become true; last=${JSON.stringify(last)}`)
}

async function testPineconeRoundTrip() {
  assert(process.env.PINECONE_API_KEY, 'PINECONE_API_KEY is required for Phase 4 memory verification')
  const namespace = 'legion:_diagnostics:probe'
  const stamp = uniqueId('phase4')
  const before = await describeNamespaceVectorCount(namespace)
  await upsertVectors([
    { id: `${stamp}-t1`, text: 'Indianapolis HVAC emergency keywords are competitive in winter.', metadata: { kind: 'diagnostic', label: 'hvac' } },
    { id: `${stamp}-t2`, text: 'GBP categories should match the customer search intent.', metadata: { kind: 'diagnostic', label: 'gbp' } },
    { id: `${stamp}-t3`, text: 'Carmel IN dental practices have lower review velocity than Fishers IN.', metadata: { kind: 'diagnostic', label: 'dental' } },
    { id: `${stamp}-t4`, text: 'Apollo and Explorium dedupe by domain plus last name.', metadata: { kind: 'diagnostic', label: 'dedupe' } },
    { id: `${stamp}-t5`, text: 'LegacyAI tier MARKET_DOMINATOR is 4000 dollars per month month-to-month.', metadata: { kind: 'diagnostic', label: 'pricing' } },
  ], namespace)
  const hits = await eventually('diagnostic search hit', async () => {
    const found = await searchNamespace('how do we price the top tier?', namespace, 10)
    return found.some((hit) => hit.id === `${stamp}-t5`) ? found : null
  })
  const after = await describeNamespaceVectorCount(namespace)
  console.log(`phase4 diagnostic namespace counts: before=${before} after=${after}`)
  assert(hits.some((hit) => hit.id === `${stamp}-t5`), 'expected searchNamespace to retrieve the MARKET_DOMINATOR diagnostic vector')
}

async function createUserAndClient() {
  const suffix = uniqueId('memory')
  const user = await prisma.user.create({
    data: { email: `${suffix}@example.invalid`, name: 'Phase 4 Memory Tester', password: 'not-used' },
  })
  const client = await prisma.client.create({
    data: {
      businessName: `Phase 4 Memory Client ${suffix}`,
      industry: 'HVAC',
      city: 'Indianapolis',
      state: 'IN',
      tier: 'MARKET_DOMINATOR',
      monthlyMRR: 4000,
      status: 'ACTIVE',
    },
  })
  return { user, client, suffix }
}

async function testAgentTurnMemory() {
  const { user, client, suffix } = await createUserAndClient()
  const phrase = `phase4 account memory ${suffix} emergency furnace recall`
  const namespace = memoryNamespace('account-manager', user.id, client.id)
  assert(namespace === `agent:account-manager:user:${user.id}:client:${client.id}`, `unexpected account-manager namespace: ${namespace}`)

  const { turn } = await recordTurn({ userId: user.id, persona: 'account-manager', clientId: client.id, role: 'user', content: phrase })
  const directHits = await eventually('agent turn vector search', async () => {
    const found = await searchNamespace(phrase, namespace, 5)
    return found.some((hit) => hit.id === turn.id && hit.metadata?.kind === 'turn') ? found : null
  })
  const recalled = await recallMemory({ userId: user.id, persona: 'account-manager', clientId: client.id, query: phrase, topK: 7 })
  const block = formatMemoryBlock(recalled)

  assert(directHits.some((hit) => hit.id === turn.id), 'expected direct namespace query to return the recorded turn')
  assert(recalled.some((hit) => hit.id === turn.id), 'expected recallMemory to include the recorded turn')
  assert(block.includes('<MEMORY>') && block.includes(phrase), 'expected formatted MEMORY block to include the recalled turn')
}

async function testClientArtifactMemory() {
  const { user, client, suffix } = await createUserAndClient()
  const namespace = `client:${client.id}`

  const notePhrase = `phase4 pinned note ${suffix} prioritize emergency service pages`
  const note = await prisma.clientNote.create({ data: { clientId: client.id, authorId: user.id, body: notePhrase, pinned: true } })
  await upsertClientNoteMemory(note.id)
  const noteHits = await eventually('note vector search', async () => {
    const found = await searchNamespace(notePhrase, namespace, 5)
    return found.some((hit) => hit.id === `note:${note.id}` && hit.metadata?.kind === 'note') ? found : null
  })

  const workOrderPhrase = `phase4 work order ${suffix} publish neighborhood landing pages`
  const workOrder = await prisma.clientWorkOrder.create({
    data: {
      clientId: client.id,
      authorId: user.id,
      type: 'SEO_AUDIT',
      title: 'Phase 4 Memory SEO Audit',
      status: 'REVIEW',
      outputMarkdown: workOrderPhrase,
    },
  })
  await upsertClientWorkOrderMemory(workOrder.id)
  const workOrderHits = await eventually('work order vector search', async () => {
    const found = await searchNamespace(workOrderPhrase, namespace, 5)
    return found.some((hit) => hit.id === `wo:${workOrder.id}` && hit.metadata?.kind === 'workOrder') ? found : null
  })

  const intelligence = await prisma.clientIntelligence.upsert({
    where: { clientId: client.id },
    create: {
      clientId: client.id,
      gbpSnapshotJson: { name: client.businessName, reviewCount: 77, photoCount: 12, primaryCategory: 'HVAC contractor', fetchedAt: '2026-05-06T07:30:00.000Z' },
      gscSummaryJson: { rowCount: 2, queryCount: 1, topMovers: [{ query: `phase4 intelligence ${suffix}`, positionDelta: 4 }], lostQueries: [] },
    },
    update: {},
  })
  await upsertClientIntelligenceMemory(client.id)
  const intelligenceHits = await eventually('intelligence vector search', async () => {
    const found = await searchNamespace(`phase4 intelligence ${suffix}`, namespace, 5)
    return found.some((hit) => hit.id === `intel:${intelligence.id}` && hit.metadata?.kind === 'intelligence') ? found : null
  })

  assert(noteHits.some((hit) => hit.id === `note:${note.id}`), 'expected note vector hit')
  assert(workOrderHits.some((hit) => hit.id === `wo:${workOrder.id}`), 'expected work order vector hit')
  assert(intelligenceHits.some((hit) => hit.id === `intel:${intelligence.id}`), 'expected intelligence vector hit')
}

async function main() {
  await testPineconeRoundTrip()
  await testAgentTurnMemory()
  await testClientArtifactMemory()
  console.log('phase4-memory-test: PASS')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
