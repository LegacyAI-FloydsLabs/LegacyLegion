import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

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

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true
  if (pathname.startsWith('/api/')) return true
  if (pathname.startsWith('/_next/')) return true
  if (pathname.startsWith('/widget/')) return true
  if (pathname.startsWith('/embed/')) return true
  if (pathname.startsWith('/get-started/')) return true
  if (/\.(svg|png|jpg|jpeg|webp|ico|gif|js|css|map|txt|woff2?)$/i.test(pathname)) return true
  return false
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (isPublic(pathname)) return NextResponse.next()

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

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
