export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  buildDailyDigestTemplate,
  collectDailyDigestData,
  ensureDailyDigestNotificationTypeConfigured,
  isIndianapolisDigestRunWindow,
  sendDailyAgencyDigest,
} from '@/lib/notifications/daily-digest'

function hasCronSecret(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

async function hasUserSession() {
  const session = await getServerSession(authOptions)
  return Boolean((session?.user as any)?.id)
}

async function previewDigest() {
  const data = await collectDailyDigestData()
  return NextResponse.json({ ok: true, digest: buildDailyDigestTemplate(data), data })
}

export async function POST(req: NextRequest) {
  if (!hasCronSecret(req) && !(await hasUserSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  if (body?.preview === true) return previewDigest()

  const notification = ensureDailyDigestNotificationTypeConfigured()
  if (!notification.ok) return NextResponse.json({ error: notification.code, message: notification.message }, { status: 503 })

  const result = await sendDailyAgencyDigest()
  return NextResponse.json(result, { status: result.ok ? 200 : 503 })
}

export async function GET(req: NextRequest) {
  if (!hasCronSecret(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isIndianapolisDigestRunWindow()) return NextResponse.json({ ok: true, skipped: true, reason: 'outside_0700_america_indianapolis' })
  const result = await sendDailyAgencyDigest()
  return NextResponse.json(result, { status: result.ok ? 200 : 503 })
}
