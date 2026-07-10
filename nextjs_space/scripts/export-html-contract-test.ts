import { buildClientSnapshotHtml, type ClientSnapshot } from '@/lib/exports/client-snapshot'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const snapshot: ClientSnapshot = {
  generatedAt: '2026-05-06T12:00:00.000Z',
  exportedById: 'test-user',
  client: {
    businessName: 'Phase 5 HTML Contract',
    ownerName: 'Casey Client',
    email: 'casey@example.invalid',
    phone: '317-555-0100',
    industry: 'HVAC',
    city: 'Indianapolis',
    state: 'IN',
    website: 'https://example.invalid',
    gbpUrl: 'https://maps.google.com/?q=phase5',
    status: 'ACTIVE',
    tier: 'GROWTH_ENGINE',
    monthlyMRR: 2500,
    onboardedAt: '2026-05-01T12:00:00.000Z',
    churnedAt: null,
    strategyBrief: 'Partner, not vendor. Client owns assets. Month-to-month execution.',
  },
  workOrders: [],
  notes: [],
  conversations: [],
  intelligenceBrief: null,
  accessRequests: [],
  prospects: [],
}

const html = buildClientSnapshotHtml(snapshot)
const openedSections = (html.match(/<section\b/g) ?? []).length
const closedSections = (html.match(/<\/section>/g) ?? []).length

assert(openedSections > 0, 'expected snapshot HTML to render section panels')
assert(openedSections === closedSections, `expected balanced snapshot sections, got ${openedSections} opens and ${closedSections} closes`)
assert(html.includes('data-design-system="legacy-legion-enterprise"'), 'expected enterprise design marker to remain present')

console.log('export-html-contract-test: PASS')
