import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { refreshAllActiveClientGBP } from '@/lib/intelligence/service'

export const dynamic = 'force-dynamic'

function hasCronSecret(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

async function hasUserSession() {
  const session = await getServerSession(authOptions)
  return Boolean((session?.user as any)?.id)
}

function isIndianapolisRunWindow(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Indiana/Indianapolis',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now)
  const hour = parts.find((part) => part.type === 'hour')?.value
  const minute = parts.find((part) => part.type === 'minute')?.value
  return hour === '07' && minute === '30'
}

async function runRefresh() {
  const result = await refreshAllActiveClientGBP()
  return NextResponse.json({ ok: true, ...result })
}

export async function POST(req: NextRequest) {
  if (!hasCronSecret(req) && !(await hasUserSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return runRefresh()
}

export async function GET(req: NextRequest) {
  if (!hasCronSecret(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isIndianapolisRunWindow()) return NextResponse.json({ ok: true, skipped: true, reason: 'outside_0730_america_indianapolis' })
  return runRefresh()
}
