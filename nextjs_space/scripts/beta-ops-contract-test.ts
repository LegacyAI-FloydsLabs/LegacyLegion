import { readFileSync } from 'node:fs'
import { NextRequest } from 'next/server'
import { middleware } from '../middleware'
import { BETA_WORK_ORDER_TEMPLATES, WORK_ORDER_OWNER_KINDS, WORK_ORDER_STATUSES } from '@/lib/work-orders'
import { renderWeeklyReportMarkdown, type ClientSnapshot } from '@/lib/exports/client-snapshot'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function read(path: string) {
  return readFileSync(path, 'utf8')
}

function assertIncludes(source: string, needle: string, message: string) {
  assert(source.includes(needle), message)
}

async function testAppRouteGuards() {
  const previousSecret = process.env.NEXTAUTH_SECRET
  process.env.NEXTAUTH_SECRET = '0123456789abcdef0123456789abcdef'
  try {
    for (const path of ['/app', '/app/leads', '/app/agency', '/app/agency/work-orders', '/app/intelligence', '/app/import', '/app/roi-calculator']) {
      const res = await middleware(new NextRequest(`https://legacy.test${path}`))
      assert(res.status >= 300 && res.status < 400, `${path} must redirect when unauthenticated`)
      const location = res.headers.get('location') ?? ''
      assert(location.startsWith('https://legacy.test/login'), `${path} must redirect to /login, got ${location}`)
    }
  } finally {
    if (previousSecret === undefined) delete process.env.NEXTAUTH_SECRET
    else process.env.NEXTAUTH_SECRET = previousSecret
  }
}

function testAuthAndRoles() {
  const bootstrap = read('scripts/bootstrap-operators.ts')
  assertIncludes(bootstrap, "primaryPrefix: 'OPERATOR_DOUGLAS'", 'Douglas operator env prefix must exist')
  assertIncludes(bootstrap, "role: 'superadmin'", 'Douglas must bootstrap as SUPERADMIN')
  assertIncludes(bootstrap, "primaryPrefix: 'OPERATOR_RYAN'", 'Ryan operator env prefix must exist')
  assertIncludes(bootstrap, "role: 'admin'", 'Ryan must bootstrap as ADMIN')
  assertIncludes(bootstrap, "fallbackPrefixes: ['OPERATOR_ADMIN']", 'legacy Douglas fallback must remain supported')
  assertIncludes(bootstrap, "fallbackPrefixes: ['OPERATOR_FIELD']", 'legacy Ryan fallback must remain supported')

  const middlewareSource = read('middleware.ts')
  assertIncludes(middlewareSource, "url.pathname = token ? '/app' : '/login'", 'authenticated users must be bounced away from public signup/onboarding into /app')
  assertIncludes(middlewareSource, "'/api/health'", 'health route must be explicitly public')
  for (const path of ["'/signup'", "'/partner/signup'", "'/get-started'", "'/widget'", "'/embed'"]) {
    assertIncludes(middlewareSource, path, `${path} must be hidden in team-only mode`)
  }

  const teamShell = read('app/app/_components/team-shell.tsx')
  assertIncludes(teamShell, 'user?.role', 'operator shell must visibly display the current role')
  assertIncludes(teamShell, "role === 'superadmin'", 'non-superadmin operators must lose superadmin-only navigation')

  const agentPage = read('app/app/agent/page.tsx')
  assertIncludes(agentPage, 'isSuperAdminRole', 'agent settings page must enforce SUPERADMIN access')
  assertIncludes(agentPage, 'PermissionDenied', 'restricted settings must render permission-denied screen')
}

function testClientAndLeadCreationContracts() {
  const clientRoute = read('app/api/agency/clients/route.ts')
  for (const field of ['businessName', 'industry', 'ownerName', 'email', 'phone', 'city', 'state', 'website', 'gbpUrl', 'tier', 'monthlyMRR', 'strategyBrief']) {
    assertIncludes(clientRoute, `fieldErrors.${field}`, `client create must validate ${field}`)
  }
  assertIncludes(clientRoute, 'Client already exists.', 'client create must handle duplicates intentionally')
  assertIncludes(clientRoute, 'diagnosticId', 'client create failures must return diagnostic IDs')
  assertIncludes(clientRoute, 'requireInternalUser', 'client create/list must require internal auth')

  const clientForm = read('app/app/agency/clients/new/_form.tsx')
  assertIncludes(clientForm, '/api/agency/clients', 'new client form must post to the persisted API route')
  assertIncludes(clientForm, 'router.push(`/app/agency/clients/${data.client.id}`)', 'new client form must redirect to detail after save')

  const leadRoute = read('app/api/leads/route.ts')
  for (const field of ['businessName', 'ownerName', 'industry', 'email', 'notes']) {
    assertIncludes(leadRoute, `fieldErrors.${field}`, `lead create must validate ${field}`)
  }
  assertIncludes(leadRoute, 'Email or phone is required.', 'lead create must allow email-or-phone contact')
  assertIncludes(leadRoute, 'Lead already exists.', 'lead create must handle duplicates intentionally')
  assertIncludes(leadRoute, 'diagnosticId', 'lead create failures must return diagnostic IDs')
  assertIncludes(leadRoute, 'requireInternalUser', 'lead create/list must require internal auth')

  const leadForm = read('app/app/leads/new/new-lead-form.tsx')
  assertIncludes(leadForm, '/api/leads', 'new lead form must call /api/leads')
  assertIncludes(leadForm, 'router.push(`/app/leads/${data?.leadId}`)', 'new lead form must redirect to detail after save')
}

function testWorkOrdersAndTemplates() {
  const required = [
    'Google Business Profile Audit',
    'GBP Category / Services Optimization',
    'GBP Review Response',
    'GBP Review Request Campaign',
    'Website SEO Audit',
    'Local Service-Area Page Plan',
    'Competitor Snapshot',
    'Social Content Calendar',
    'Lead Response Script',
    'Weekly Client Report',
    'Referral Partner Prospecting',
    'Reputation / Trust Proof Audit',
  ]
  const labels = new Set(BETA_WORK_ORDER_TEMPLATES.map((template) => template.label))
  for (const label of required) assert(labels.has(label), `${label} template must exist`)
  for (const template of BETA_WORK_ORDER_TEMPLATES) {
    assert(template.requiredEvidence.length > 0, `${template.label} must define required evidence`)
    assert(template.aiInstructions.length > 20, `${template.label} must define AI instructions`)
    assert(typeof template.approvalRequired === 'boolean', `${template.label} must define a human approval gate`)
  }
  for (const status of ['DRAFT', 'IN_PROGRESS', 'REVIEW', 'DELIVERED', 'ARCHIVED'] as const) assert(WORK_ORDER_STATUSES.includes(status), `${status} status must be supported`)
  for (const owner of ['DOUGLAS', 'RYAN', 'AI_PERSONA'] as const) assert(WORK_ORDER_OWNER_KINDS.includes(owner), `${owner} owner must be supported`)

  const list = read('app/app/agency/work-orders/_list.tsx')
  for (const phrase of ['Client *', 'Goal *', 'Required evidence', 'AI instructions', 'Approval gate', 'Deliverable output', 'Owner', 'Next action']) {
    assertIncludes(list, phrase, `work order create flow must expose ${phrase}`)
  }
  assertIncludes(list, '/app/agency/work-orders/${item.id}', 'work order list must link to the dedicated detail page')

  const detailPage = read('app/app/agency/work-orders/[id]/page.tsx')
  const detail = read('app/app/agency/work-orders/[id]/_detail.tsx')
  assertIncludes(detailPage, 'prisma.clientWorkOrder.findUnique', 'work order detail page must load persisted data')
  for (const phrase of ['History / audit trail', 'Approve', 'Move to Review', 'Mark Delivered', 'Human approval is required before delivery']) {
    assertIncludes(detail, phrase, `work order detail must expose ${phrase}`)
  }
  const api = read('app/api/agency/work-orders/[id]/route.ts')
  assertIncludes(api, 'Approval is required before delivery.', 'work order API must block delivery before approval')
  assertIncludes(api, 'events:', 'work order API must write audit events')
}

function testAiAccessProspectingIntelligenceReports() {
  const chatRoute = read('app/api/agents/[persona]/chat/route.ts')
  assertIncludes(chatRoute, "persona.id === 'account-manager' && !clientId", 'Account Manager must require selected client')
  assertIncludes(chatRoute, '<CLIENT_CONTEXT>', 'AI prompts must include client context')
  assertIncludes(chatRoute, 'Do not claim account access', 'AI prompts must prevent unsupported access claims')
  assertIncludes(chatRoute, 'Mark unsupported claims as assumptions', 'AI prompts must require assumptions for unsupported claims')

  const chatUi = read('app/app/agency/chat/_components/agency-chat-client.tsx')
  assertIncludes(chatUi, 'Client context', 'agent chat must expose client selector')
  assertIncludes(chatUi, 'Create work order from response', 'AI responses must be convertible into work orders')

  const accessRoute = read('app/api/agency/clients/[id]/access-requests/[requestId]/route.ts')
  assertIncludes(accessRoute, 'SUPERADMIN role required for credential references', 'Ryan must not write credential references')
  assertIncludes(accessRoute, 'redactAccessRequestForRole', 'Ryan must receive redacted access-request payloads')
  const clientPage = read('app/app/agency/clients/[id]/page.tsx')
  assertIncludes(clientPage, 'externalVaultRef: isSuperAdmin ? request.externalVaultRef : null', 'SSR client access data must redact external references for Ryan')
  assertIncludes(clientPage, 'decisionNotes: isSuperAdmin ? request.decisionNotes : null', 'SSR client access data must redact credential notes for Ryan')

  const prospect = read('app/app/agency/prospects/_components/prospect-workflow.tsx')
  for (const phrase of ['Structured prospect search', 'Radius', 'Provider', 'Target count', 'Email required', 'Dedupe skipped', 'Source confidence', 'Import selected prospects to Leads', 'Ryan follow-up script']) {
    assertIncludes(prospect, phrase, `prospecting workflow must expose ${phrase}`)
  }

  const intelligence = read('app/app/intelligence/_components/intelligence.tsx')
  for (const phrase of ['Client scoped', 'Global search', 'No evidence matched', 'Save note', 'Make work order', 'Copy report section', 'Save client insight']) {
    assertIncludes(intelligence, phrase, `intelligence workflow must expose ${phrase}`)
  }

  const exportRoute = read('app/api/agency/clients/[id]/export/route.ts')
  assertIncludes(exportRoute, 'weekly-internal', 'exports must support internal weekly report')
  assertIncludes(exportRoute, 'weekly-client', 'exports must support client-facing weekly report')
  assertIncludes(exportRoute, 'report.generate.succeeded', 'report generation must emit structured logs')

  const health = read('app/api/health/route.ts')
  assertIncludes(health, 'prisma.$queryRaw`SELECT 1`', 'health check must verify DB connectivity')
  assertIncludes(health, 'health.check.failed', 'health failures must emit structured logs')
}

function testReportRedaction() {
  const snapshot: ClientSnapshot = {
    generatedAt: '2026-05-19T00:00:00.000Z',
    exportedById: 'tester',
    client: { businessName: 'Restore & Renew', industry: 'RESTORATION', city: 'Indianapolis', state: 'IN', website: 'https://restore.invalid', gbpUrl: 'https://maps.invalid/restore', tier: 'GROWTH_ENGINE' },
    workOrders: [{ title: 'GBP Audit', type: 'GBP_AUDIT', status: 'DELIVERED', approvalStatus: 'APPROVED', internalNotes: 'password: never-ship-this', clientSummary: 'Reviewed GBP trust proof.', outputMarkdown: 'Done', evidenceLinks: ['https://evidence.invalid/gbp'] }],
    notes: [],
    conversations: [],
    accessRequests: [{ platform: 'GBP', status: 'BLOCKED', resourceUrl: 'https://maps.invalid/restore', requestNotes: 'api key: never-ship-this' }],
    prospects: [{ companyName: 'Prospect Co', companyDomain: null, personFirstName: null, personLastName: null, source: 'apollo', promotedToLeadId: 'lead_1' }],
    intelligenceBrief: null,
  }
  const internal = renderWeeklyReportMarkdown(snapshot, 'internal')
  const client = renderWeeklyReportMarkdown(snapshot, 'client')
  for (const report of [internal, client]) {
    assert(!report.includes('never-ship-this'), 'weekly reports must redact raw secret values')
    assert(report.includes('Completed Work Orders'), 'weekly reports must include completed work orders')
    assert(report.includes('Pending Approvals'), 'weekly reports must include pending approvals')
    assert(report.includes('Blocked Account Access'), 'weekly reports must include blocked access')
    assert(report.includes('Evidence Links'), 'weekly reports must include evidence links')
  }
}

async function main() {
  testAuthAndRoles()
  await testAppRouteGuards()
  testClientAndLeadCreationContracts()
  testWorkOrdersAndTemplates()
  testAiAccessProspectingIntelligenceReports()
  testReportRedaction()
  console.log('Beta operations contract tests passed')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
