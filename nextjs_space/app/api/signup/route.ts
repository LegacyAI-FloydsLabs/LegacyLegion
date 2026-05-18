export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { checkRateLimit, rateLimited } from '@/lib/rate-limit'


const SIGNUP_WINDOW_MS = 60 * 60 * 1000

function teamSignupEnabled(inviteCode: string): boolean {
  if (process.env.TEAM_SIGNUP_ENABLED !== 'true') return false
  const expected = process.env.TEAM_SIGNUP_INVITE_CODE
  return Boolean(expected && inviteCode && inviteCode === expected)
}
export async function POST(req: NextRequest) {
  try {
    const limit = checkRateLimit(req, { bucket: 'team-signup', limit: 5, windowMs: SIGNUP_WINDOW_MS })
    if (!limit.allowed) return rateLimited(limit)

    const body = await req.json().catch(() => ({}))
    const inviteCode = String(body?.inviteCode ?? req.headers.get('x-team-signup-invite') ?? '').trim()
    if (!teamSignupEnabled(inviteCode)) {
      return NextResponse.json({ error: 'Team signup is not available' }, { status: 404 })
    }

    const email = String(body?.email ?? '').toLowerCase().trim()
    const password = String(body?.password ?? '')
    const name = String(body?.name ?? '').trim()
    if (!email || !password || password.length < 6) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 })
    }

    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { email, name, password: hashed, role: 'team' },
    })

    return NextResponse.json({ ok: true, id: user.id })
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }
}
