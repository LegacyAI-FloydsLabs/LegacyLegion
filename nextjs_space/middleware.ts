import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'


const TEAM_ONLY_DOGFOOD_MODE = true

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/signup',
  '/partner/login',
  '/partner/signup',
  '/get-started',
  '/widget',
  '/embed',
]

const TEAM_ONLY_PAGE_PATHS = new Set([
  '/',
  '/signup',
  '/partner/login',
  '/partner/signup',
  '/get-started',
  '/widget',
  '/embed',
])

const TEAM_ONLY_PAGE_PREFIXES = [
  '/get-started/',
  '/widget/',
  '/embed/',
]

const TEAM_ONLY_DISABLED_API_PATHS = new Set([
  '/api/agent/chat',
  '/api/agent/stub',
  '/api/partner/signup',
  '/api/signup',
])

const TEAM_ONLY_INTERNAL_API_PATHS = new Set([
  '/api/leads',
  '/api/leads/assess',
])

const SAFE_API_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])


const PUBLIC_API_PATHS = new Set([
  '/api/agency/digest/daily',
  '/api/agency/intelligence/refresh-all',
  '/api/health',
])

const SELF_SERVICE_PUBLIC_API_PATHS = new Set([
  '/api/agent/chat',
  '/api/agent/stub',
  '/api/leads',
  '/api/leads/assess',
  '/api/partner/signup',
  '/api/signup',
])

function isPublicApi(pathname: string): boolean {
  if (isAuthApi(pathname)) return true
  if (PUBLIC_API_PATHS.has(pathname)) return true
  return !TEAM_ONLY_DOGFOOD_MODE && SELF_SERVICE_PUBLIC_API_PATHS.has(pathname)
}

function isAuthApi(pathname: string): boolean {
  return pathname === '/api/auth' || pathname.startsWith('/api/auth/')
}

function previewWritesEnabled(): boolean {
  return process.env.PREVIEW_WRITES_ENABLED === 'true'
}

function isMutatingApiRequest(req: NextRequest, pathname: string): boolean {
  return pathname.startsWith('/api/') && !SAFE_API_METHODS.has(req.method.toUpperCase())
}

async function isPreviewLeadStatusUpdate(req: NextRequest, pathname: string): Promise<boolean> {
  if (req.method.toUpperCase() !== 'PATCH' || !/^\/api\/leads\/[^/]+$/.test(pathname)) return false

  const body = await req.clone().json().catch(() => null)
  if (!body || typeof body !== 'object' || Array.isArray(body)) return false
  const fields = Object.keys(body)
  return fields.length === 1 && fields[0] === 'status'
}

async function previewWriteBlocked(req: NextRequest, pathname: string): Promise<boolean> {
  return (
    process.env.VERCEL_ENV === 'preview' &&
    !previewWritesEnabled() &&
    isMutatingApiRequest(req, pathname) &&
    !isAuthApi(pathname) &&
    !(await isPreviewLeadStatusUpdate(req, pathname))
  )
}

function isTeamOnlyHiddenPage(pathname: string): boolean {
  if (!TEAM_ONLY_DOGFOOD_MODE) return false
  return TEAM_ONLY_PAGE_PATHS.has(pathname) || TEAM_ONLY_PAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

function isTeamOnlyDisabledApi(pathname: string): boolean {
  return TEAM_ONLY_DOGFOOD_MODE && TEAM_ONLY_DISABLED_API_PATHS.has(pathname)
}

function isTeamOnlyInternalApi(pathname: string): boolean {
  return TEAM_ONLY_DOGFOOD_MODE && TEAM_ONLY_INTERNAL_API_PATHS.has(pathname)
}

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true
  if (pathname.startsWith('/api/')) return isPublicApi(pathname)
  if (pathname.startsWith('/_next/')) return true
  if (pathname.startsWith('/widget/')) return true
  if (pathname.startsWith('/embed/')) return true
  if (pathname.startsWith('/get-started/')) return true
  if (/\.(svg|png|jpg|jpeg|webp|ico|gif|js|css|map|txt|woff2?)$/i.test(pathname)) return true
  return false
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (isTeamOnlyHiddenPage(pathname)) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    const url = req.nextUrl.clone()
    url.pathname = token ? '/app' : '/login'
    url.search = ''
    return NextResponse.redirect(url)
  }

  if (isTeamOnlyDisabledApi(pathname)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  let token: Awaited<ReturnType<typeof getToken>> | null = null
  if (isTeamOnlyInternalApi(pathname)) {
    token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (await previewWriteBlocked(req, pathname)) {
    return NextResponse.json({
      error: 'Preview writes are disabled until Preview credentials are isolated.',
      code: 'PREVIEW_WRITES_DISABLED',
    }, { status: 403 })
  }

  if (isPublic(pathname)) return NextResponse.next()

  token = token ?? await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  if (pathname.startsWith('/api/')) {
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.next()
  }

  // Partner portal routes
  if (pathname.startsWith('/partner')) {
    if (!token) {
      const url = req.nextUrl.clone()
      url.pathname = '/partner/login'
      url.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  // App (team) routes
  if (pathname.startsWith('/app')) {
    if (!token) {
      const url = req.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|og-image.png).*)'],
}
