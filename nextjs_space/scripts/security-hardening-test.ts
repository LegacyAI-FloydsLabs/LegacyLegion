import { readFileSync } from 'node:fs'
import { NextRequest } from 'next/server'
import { middleware } from '../middleware'
import { isAdminRole, isInternalRole, isPartnerRole } from '@/lib/authz'
import { createLeadAssessmentToken, verifyLeadAssessmentToken } from '@/lib/public-assessment-token'
import { checkRateLimit } from '@/lib/rate-limit'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function readSetBody(source: string, name: string): string {
  const match = source.match(new RegExp(`const ${name} = new Set\\(\\[([\\s\\S]*?)\\]\\)`))
  assert(match, `${name} must be declared as a Set literal`)
  return match[1]
}

function testRolePredicates() {
  assert(isAdminRole('admin'), 'admin role must be recognized as admin')
  assert(isAdminRole('superadmin'), 'superadmin role must be recognized as admin')
  assert(isInternalRole('superadmin'), 'superadmin role must be internal')
  assert(isInternalRole('admin'), 'admin role must be internal')
  assert(isInternalRole('team'), 'team role must be internal')
  assert(!isInternalRole('partner'), 'partner role must not be internal')
  assert(isPartnerRole('partner'), 'partner role must be recognized as partner')
  assert(!isPartnerRole('team'), 'team role must not be partner')
}

function testLeadAssessmentToken() {
  const previousSecret = process.env.NEXTAUTH_SECRET
  process.env.NEXTAUTH_SECRET = '0123456789abcdef0123456789abcdef'
  try {
    const issuedAt = 1_000
    const token = createLeadAssessmentToken('lead_123', issuedAt)
    assert(token, 'expected token when signing secret is configured')
    assert(verifyLeadAssessmentToken(token, 'lead_123', issuedAt), 'token must verify for matching lead before expiry')
    assert(!verifyLeadAssessmentToken(token, 'lead_456', issuedAt), 'token must not verify for a different lead')
    assert(!verifyLeadAssessmentToken(`${token}x`, 'lead_123', issuedAt), 'tampered token must not verify')
    assert(!verifyLeadAssessmentToken(token, 'lead_123', issuedAt + 16 * 60 * 1000), 'expired token must not verify')
  } finally {
    if (previousSecret === undefined) delete process.env.NEXTAUTH_SECRET
    else process.env.NEXTAUTH_SECRET = previousSecret
  }
}

function testRateLimit() {
  const req = new NextRequest('http://localhost/api/test', { headers: { 'x-forwarded-for': '198.51.100.10' } })
  const bucket = `security-test-${Date.now()}-${Math.random()}`
  const first = checkRateLimit(req, { bucket, limit: 2, windowMs: 1_000 }, 10_000)
  const second = checkRateLimit(req, { bucket, limit: 2, windowMs: 1_000 }, 10_001)
  const third = checkRateLimit(req, { bucket, limit: 2, windowMs: 1_000 }, 10_002)
  const afterReset = checkRateLimit(req, { bucket, limit: 2, windowMs: 1_000 }, 11_001)

  assert(first.allowed && first.remaining === 1, 'first request should be allowed')
  assert(second.allowed && second.remaining === 0, 'second request should consume remaining quota')
  assert(!third.allowed && third.remaining === 0, 'third request should be rate limited')
  assert(afterReset.allowed && afterReset.remaining === 1, 'request after reset should be allowed')
}

function testStaticSecurityContracts() {
  const middlewareSource = readFileSync('middleware.ts', 'utf8')
  assert(!middlewareSource.includes("pathname.startsWith('/api/')) return true"), 'middleware must not mark every API route public')
  assert(middlewareSource.includes('PUBLIC_API_PATHS'), 'middleware must use an explicit public API allowlist')
  assert(middlewareSource.includes('const TEAM_ONLY_DOGFOOD_MODE = true'), 'team-only dogfood mode must be enabled')
  assert(middlewareSource.includes('TEAM_ONLY_PAGE_PATHS'), 'team-only mode must hide public self-service pages')
  assert(middlewareSource.includes('TEAM_ONLY_DISABLED_API_PATHS'), 'team-only mode must hard-disable public self-service APIs')
  assert(middlewareSource.includes('TEAM_ONLY_INTERNAL_API_PATHS'), 'team-only mode must require auth for internal lead APIs')
  assert(middlewareSource.includes('SAFE_API_METHODS'), 'middleware must explicitly define safe read-only API methods')
  assert(middlewareSource.includes('PREVIEW_WRITES_ENABLED'), 'Preview API writes must require an explicit deploy-time enable flag')
  assert(middlewareSource.includes('PREVIEW_WRITES_DISABLED'), 'Preview write guard must return a machine-readable block code')
  assert(middlewareSource.includes('isAuthApi'), 'Preview write guard must keep NextAuth routes callable')

  const publicApiPaths = readSetBody(middlewareSource, 'PUBLIC_API_PATHS')
  for (const path of ['/api/signup', '/api/partner/signup', '/api/agent/chat', '/api/agent/stub', '/api/leads', '/api/leads/assess']) {
    assert(!publicApiPaths.includes(path), `${path} must not be in the public API allowlist during team-only dogfood`)
  }

  const login = readFileSync('app/login/page.tsx', 'utf8')
  assert(!login.includes('href="/signup"'), 'login page must not expose public signup during team-only dogfood')
  assert(!login.includes('href="/partner/login"'), 'login page must not expose partner login during team-only dogfood')
  assert(login.includes('Team Sign In'), 'login page must present the team sign-in entry point')

  const teamShell = readFileSync('app/app/_components/team-shell.tsx', 'utf8')
  assert(!teamShell.includes('href="/get-started"'), 'team shell must not link operators to public intake during team-only dogfood')
  assert(teamShell.includes('href="/app/leads/new"'), 'team shell must route lead creation to the internal workspace')

  const referrals = readFileSync('app/app/referrals/_components/referrals-client.tsx', 'utf8')
  assert(!referrals.includes('/partner/signup'), 'internal referrals screen must not link to partner signup during team-only dogfood')

  const agentSettings = readFileSync('app/app/agent/_components/agent-settings.tsx', 'utf8')
  assert(agentSettings.includes('Embeddable Widget Paused'), 'agent settings must show widget pause state during team-only dogfood')

  const leadsRoute = readFileSync('app/api/leads/route.ts', 'utf8')
  assert(leadsRoute.includes('const auth = await requireInternalUser()'), 'lead creation must require an internal user during team-only dogfood')

  const partnerSignup = readFileSync('app/api/partner/signup/route.ts', 'utf8')
  assert(partnerSignup.includes('const TEAM_ONLY_DOGFOOD_MODE = true'), 'partner signup API must be route-level disabled during dogfood')

  const publicChat = readFileSync('app/api/agent/chat/route.ts', 'utf8')
  assert(publicChat.includes('const TEAM_ONLY_DOGFOOD_MODE = true'), 'public chat API must be route-level disabled during dogfood')

  const publicStub = readFileSync('app/api/agent/stub/route.ts', 'utf8')
  assert(publicStub.includes('const TEAM_ONLY_DOGFOOD_MODE = true'), 'public agent stub API must be route-level disabled during dogfood')

  const signup = readFileSync('app/api/signup/route.ts', 'utf8')
  assert(signup.includes('TEAM_SIGNUP_ENABLED'), 'team signup must be disabled unless explicitly enabled')
  assert(signup.includes('TEAM_SIGNUP_INVITE_CODE'), 'team signup must require an invite code when enabled')

  const seed = readFileSync('scripts/seed.ts', 'utf8')
  assert(seed.trim() === "import './bootstrap-operators'", 'seed must delegate to env-only operator bootstrap')
}

async function testTeamOnlyMiddlewareContracts() {
  const previousSecret = process.env.NEXTAUTH_SECRET
  process.env.NEXTAUTH_SECRET = '0123456789abcdef0123456789abcdef'
  try {
    const home = await middleware(new NextRequest('https://legacy.test/'))
    assert(home.status >= 300 && home.status < 400, 'home page must redirect during team-only dogfood')
    assert(home.headers.get('location') === 'https://legacy.test/login', 'home page must redirect to team login')

    const intake = await middleware(new NextRequest('https://legacy.test/get-started'))
    assert(intake.status >= 300 && intake.status < 400, 'public intake page must redirect during team-only dogfood')
    assert(intake.headers.get('location') === 'https://legacy.test/login', 'public intake page must redirect to team login')

    const partnerSignup = await middleware(new NextRequest('https://legacy.test/api/partner/signup', { method: 'POST' }))
    assert(partnerSignup.status === 404, 'partner signup API must be hidden during team-only dogfood')

    const publicChat = await middleware(new NextRequest('https://legacy.test/api/agent/chat', { method: 'POST' }))
    assert(publicChat.status === 404, 'public chat API must be hidden during team-only dogfood')

    const leadCreate = await middleware(new NextRequest('https://legacy.test/api/leads', { method: 'POST' }))
    assert(leadCreate.status === 404, 'lead creation API must not be publicly callable during team-only dogfood')
  } finally {
    if (previousSecret === undefined) delete process.env.NEXTAUTH_SECRET
    else process.env.NEXTAUTH_SECRET = previousSecret
  }
}

async function testPreviewWriteGuardContracts() {
  const previousSecret = process.env.NEXTAUTH_SECRET
  const previousVercelEnv = process.env.VERCEL_ENV
  const previousPreviewWritesEnabled = process.env.PREVIEW_WRITES_ENABLED

  process.env.NEXTAUTH_SECRET = '0123456789abcdef0123456789abcdef'
  process.env.VERCEL_ENV = 'preview'
  delete process.env.PREVIEW_WRITES_ENABLED

  try {
    const blockedWrite = await middleware(new NextRequest('https://legacy.test/api/agency/work-orders', { method: 'POST' }))
    assert(blockedWrite.status === 403, 'Preview POST writes must be blocked by default')
    const blockedBody = await blockedWrite.json()
    assert(blockedBody.code === 'PREVIEW_WRITES_DISABLED', 'Preview write block must return a machine-readable code')

    const leadStatusUpdate = await middleware(new NextRequest('https://legacy.test/api/leads/lead_123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CONTACTED' }),
    }))
    assert(leadStatusUpdate.status !== 403, 'Preview must allow the authenticated lead status update used by Kanban and lead detail')

    const otherLeadUpdate = await middleware(new NextRequest('https://legacy.test/api/leads/lead_123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignedToId: 'user_123' }),
    }))
    assert(otherLeadUpdate.status === 403, 'Preview must keep non-status lead updates blocked by default')

    const authCallback = await middleware(new NextRequest('https://legacy.test/api/auth/callback/credentials', { method: 'POST' }))
    assert(authCallback.status !== 403, 'Preview write guard must not block NextAuth credential callback')

    const health = await middleware(new NextRequest('https://legacy.test/api/health', { method: 'GET' }))
    assert(health.status !== 403, 'Preview write guard must allow read-only health checks')

    process.env.PREVIEW_WRITES_ENABLED = 'true'
    const enabledWrite = await middleware(new NextRequest('https://legacy.test/api/agency/work-orders', { method: 'POST' }))
    assert(enabledWrite.status !== 403, 'Preview writes must be allowed only when PREVIEW_WRITES_ENABLED=true')
  } finally {
    if (previousSecret === undefined) delete process.env.NEXTAUTH_SECRET
    else process.env.NEXTAUTH_SECRET = previousSecret

    if (previousVercelEnv === undefined) delete process.env.VERCEL_ENV
    else process.env.VERCEL_ENV = previousVercelEnv

    if (previousPreviewWritesEnabled === undefined) delete process.env.PREVIEW_WRITES_ENABLED
    else process.env.PREVIEW_WRITES_ENABLED = previousPreviewWritesEnabled
  }
}

async function main() {
  testRolePredicates()
  testLeadAssessmentToken()
  testRateLimit()
  testStaticSecurityContracts()
  await testTeamOnlyMiddlewareContracts()
  await testPreviewWriteGuardContracts()
  console.log('Security hardening contract tests passed')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
