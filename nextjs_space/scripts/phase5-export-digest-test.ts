import dotenv from 'dotenv'
import { readFileSync } from 'node:fs'
import { prisma } from '@/lib/db'
import {
  DAILY_DIGEST_SECTION_TITLES,
  buildDailyDigestTemplate,
  dailyDigestCronSchedule,
  ensureDailyDigestNotificationTypeConfigured,
  isIndianapolisDigestRunWindow,
} from '@/lib/notifications/daily-digest'
import {
  EXPORT_MARKDOWN_H2_ORDER,
  getClientSnapshot,
  normalizeExportForDiff,
  renderClientSnapshotJson,
  renderClientSnapshotMarkdown,
  renderClientSnapshotPdf,
} from '@/lib/exports/client-snapshot'

dotenv.config({ path: '.env.local' })

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function uniqueId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function assertArrayEquals(actual: readonly string[], expected: readonly string[], label: string) {
  assert(actual.length === expected.length, `${label}: expected ${expected.length} entries, got ${actual.length}`)
  for (let i = 0; i < expected.length; i++) {
    assert(actual[i] === expected[i], `${label}: expected ${expected[i]} at ${i}, got ${actual[i]}`)
  }
}

function assertHeadingOrder(markdown: string, h1: string, h2Order: readonly string[]) {
  assert(markdown.startsWith(`# ${h1}\n`), 'expected Markdown export to start with H1 client name')
  let cursor = 0
  for (const heading of h2Order) {
    const marker = `\n## ${heading}\n`
    const index = markdown.indexOf(marker, cursor)
    assert(index >= 0, `expected Markdown export to include ${marker.trim()}`)
    cursor = index + marker.length
  }
}

function testDigestScheduleAndTemplateContracts() {
  assertArrayEquals(DAILY_DIGEST_SECTION_TITLES, [
    'Yesterday',
    'New Prospects',
    'GBP Changes',
    'Top 3 Suggested Actions',
    'Open Work Orders By Status',
  ], 'daily digest section titles')
  assert(dailyDigestCronSchedule === '0 11,12 * * *', `expected DST-safe 7am Indianapolis cron, got ${dailyDigestCronSchedule}`)
  assert(isIndianapolisDigestRunWindow(new Date('2026-01-15T12:00:00.000Z')), 'expected 12:00Z to be 07:00 Indianapolis in January')
  assert(isIndianapolisDigestRunWindow(new Date('2026-07-15T11:00:00.000Z')), 'expected 11:00Z to be 07:00 Indianapolis in July')
  assert(!isIndianapolisDigestRunWindow(new Date('2026-07-15T12:00:00.000Z')), 'expected non-7am Indianapolis time to be skipped')

  const template = buildDailyDigestTemplate({
    generatedForLocalDate: '2026-05-06',
    users: [{ id: 'user-1', email: 'ryan@example.invalid', name: 'Ryan' }],
    yesterdayWorkOrders: [{ clientName: 'Circle City HVAC', title: 'GBP Optimization — Circle City HVAC', status: 'REVIEW' }],
    newProspects: [{ clientName: 'Circle City HVAC', label: 'Fran Owner — Fresh HVAC', source: 'EXPLORIUM' }],
    gbpChanges: [{ clientName: 'Circle City HVAC', summary: 'Reviews increased by 2.' }],
    suggestedActions: [{ clientName: 'Circle City HVAC', actions: ['Approve the GBP optimization work order.', 'Call the new HVAC prospect.', 'Publish the emergency service page.'] }],
    openWorkOrdersByStatus: { DRAFT: 1, IN_PROGRESS: 2, REVIEW: 3, DELIVERED: 4, ARCHIVED: 5 },
  })
  let cursor = 0
  for (const section of DAILY_DIGEST_SECTION_TITLES) {
    const marker = `## ${section}`
    const index = template.indexOf(marker, cursor)
    assert(index >= 0, `expected digest template to include ${marker}`)
    cursor = index + marker.length
  }
  assert(template.includes('Partner, not vendor'), 'expected digest to preserve brand voice')
}

function testNotificationRegistrationContract() {
  const original = process.env.NOTIF_ID_DAILY_DIGEST
  delete process.env.NOTIF_ID_DAILY_DIGEST
  try {
    const missing = ensureDailyDigestNotificationTypeConfigured()
    assert(missing.ok === false, `expected missing notification env to fail explicitly, got ${JSON.stringify(missing)}`)
    assert(missing.code === 'NOTIF_ID_DAILY_DIGEST_MISSING', `unexpected missing env code ${missing.code}`)
  } finally {
    if (original) process.env.NOTIF_ID_DAILY_DIGEST = original
  }

  process.env.NOTIF_ID_DAILY_DIGEST = 'notif_daily_agency_digest_test'
  try {
    const configured = ensureDailyDigestNotificationTypeConfigured()
    assert(configured.ok === true, `expected configured notification env, got ${JSON.stringify(configured)}`)
    assert(configured.notificationType.name === 'Daily Agency Digest', 'expected registered notification type name')
    assert(configured.notificationType.recipient === 'USER', 'expected USER recipient')
    assert(configured.notificationType.critical === false, 'expected non-critical digest')
  } finally {
    if (original) process.env.NOTIF_ID_DAILY_DIGEST = original
    else delete process.env.NOTIF_ID_DAILY_DIGEST
  }
}

async function createExportFixture() {
  const suffix = uniqueId('phase5')
  const user = await prisma.user.create({ data: { email: `${suffix}@example.invalid`, name: 'Phase 5 Export Tester', password: 'not-used' } })
  const client = await prisma.client.create({
    data: {
      businessName: `Phase 5 Export Client ${suffix}`,
      ownerName: 'Casey Client',
      email: 'casey@example.invalid',
      phone: '317-555-0100',
      industry: 'HVAC',
      city: 'Indianapolis',
      state: 'IN',
      website: 'https://example.invalid',
      gbpUrl: 'https://maps.google.com/?q=phase5',
      tier: 'GROWTH_ENGINE',
      monthlyMRR: 2500,
      status: 'ACTIVE',
      strategyBrief: 'Partner, not vendor. Client owns assets. Month-to-month execution.',
    },
  })
  await prisma.clientWorkOrder.create({
    data: {
      clientId: client.id,
      authorId: user.id,
      type: 'GBP_OPTIMIZATION',
      title: 'GBP Optimization — Phase 5',
      status: 'REVIEW',
      outputMarkdown: 'Tighten categories and publish service photos.',
      createdAt: new Date('2026-05-05T14:00:00.000Z'),
    },
  })
  await prisma.clientNote.create({
    data: {
      clientId: client.id,
      authorId: user.id,
      body: 'Client wants transparent reporting and owns all assets.',
      pinned: true,
      createdAt: new Date('2026-05-05T15:00:00.000Z'),
    },
  })
  await prisma.agentThread.create({
    data: {
      userId: user.id,
      persona: 'account-manager',
      clientId: client.id,
      title: 'Phase 5 export conversation',
      turns: {
        create: [
          { role: 'user', content: 'What should we do next?', createdAt: new Date('2026-05-05T16:00:00.000Z') },
          { role: 'assistant', content: 'Approve the GBP work order and call the prospect.', createdAt: new Date('2026-05-05T16:01:00.000Z') },
        ],
      },
    },
  })
  await prisma.clientIntelligence.create({
    data: {
      clientId: client.id,
      gbpSnapshotJson: { reviewCount: 41, rating: 4.7, primaryCategory: 'HVAC contractor', fetchedAt: '2026-05-05T13:00:00.000Z' },
      gscSummaryJson: { rowCount: 2, queryCount: 1, topMovers: [{ query: 'ac repair indianapolis', clicksDelta: 3, positionDelta: -2.5 }], lostQueries: [] },
      fetchedAt: new Date('2026-05-05T13:00:00.000Z'),
    },
  })
  return { user, client }
}

async function testClientSnapshotExportContracts() {
  const { user, client } = await createExportFixture()
  assertArrayEquals(EXPORT_MARKDOWN_H2_ORDER, [
    'Profile',
    'Engagement',
    'Strategy',
    'Recent Work Orders',
    'Recent Notes',
    'Recent Conversations',
    'Intelligence Brief',
  ], 'export markdown H2 order')

  const generatedAt = new Date('2026-05-06T12:00:00.000Z')
  const snapshot = await getClientSnapshot({ clientId: client.id, exportedById: user.id, generatedAt })
  assert(snapshot.client.id === client.id, 'expected snapshot for fixture client')
  assert(snapshot.workOrders.length === 1, `expected one recent work order, got ${snapshot.workOrders.length}`)
  assert(snapshot.notes.length === 1, `expected one recent note, got ${snapshot.notes.length}`)
  assert(snapshot.conversations.length === 1, `expected one recent conversation, got ${snapshot.conversations.length}`)
  assert(snapshot.intelligenceBrief?.gbpSnapshotJson?.reviewCount === 41, 'expected latest intelligence in snapshot')

  const markdown = renderClientSnapshotMarkdown(snapshot)
  assertHeadingOrder(markdown, client.businessName, EXPORT_MARKDOWN_H2_ORDER)
  assert(markdown.includes('Client owns assets'), 'expected export to preserve client ownership language')
  assert(markdown.includes('GBP Optimization — Phase 5'), 'expected work order title in markdown export')

  const jsonA = renderClientSnapshotJson(snapshot)
  const jsonB = renderClientSnapshotJson({ ...snapshot, generatedAt: new Date('2026-05-06T12:00:30.000Z').toISOString() })
  assert(normalizeExportForDiff(jsonA) === normalizeExportForDiff(jsonB), 'expected JSON export to be idempotent after timestamp normalization')

  const pdf = await renderClientSnapshotPdf(snapshot)
  assert(pdf.contentType === 'application/pdf', `expected application/pdf, got ${pdf.contentType}`)
  assert(pdf.body.length > 1024, `expected PDF body > 1KB, got ${pdf.body.length}`)
  assert(pdf.body.subarray(0, 4).toString('utf8') === '%PDF', 'expected PDF body to start with %PDF')
}

function testVercelAndUiContracts() {
  const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'))
  const cronPaths = vercel.crons.map((cron: { path: string }) => cron.path)
  assert(cronPaths.includes('/api/agency/intelligence/refresh-all'), 'expected Phase 3 intelligence cron to be preserved')
  assert(cronPaths.includes('/api/agency/digest/daily'), 'expected Phase 5 daily digest cron to exist')
  const digestCron = vercel.crons.find((cron: { path: string }) => cron.path === '/api/agency/digest/daily')
  assert(digestCron.schedule === dailyDigestCronSchedule, `expected digest cron ${dailyDigestCronSchedule}, got ${digestCron.schedule}`)

  const workspace = readFileSync('app/app/agency/clients/[id]/_components/client-workspace.tsx', 'utf8')
  assert(workspace.includes('Export'), 'expected client workspace to expose Export UI')
  assert(workspace.includes('/export?format='), 'expected client workspace export UI to call export route')
  assert(workspace.includes('DropdownMenu'), 'expected client workspace to use a format dropdown')
}

async function main() {
  testDigestScheduleAndTemplateContracts()
  testNotificationRegistrationContract()
  await testClientSnapshotExportContracts()
  testVercelAndUiContracts()
  console.log('phase5-export-digest-test: PASS')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
