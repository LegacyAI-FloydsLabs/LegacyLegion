export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { diagnosticId, logServerError, logServerEvent } from '@/lib/diagnostics'

export async function GET() {
  const checkedAt = new Date().toISOString()
  const started = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    const latencyMs = Date.now() - started
    logServerEvent('health.check.succeeded', { latencyMs })
    return NextResponse.json({ ok: true, runtime: 'ok', database: 'ok', checkedAt, latencyMs })
  } catch (error) {
    const id = diagnosticId('health')
    logServerError('health.check.failed', error, { diagnosticId: id })
    return NextResponse.json(
      { ok: false, runtime: 'ok', database: 'unavailable', checkedAt, diagnosticId: id },
      { status: 503 },
    )
  }
}
