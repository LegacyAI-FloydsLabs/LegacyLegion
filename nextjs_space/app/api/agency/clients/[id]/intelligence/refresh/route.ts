import { NextRequest, NextResponse } from 'next/server'
import { requireInternalUser } from '@/lib/authz'
import { ClientIntelligenceError, refreshClientGBP } from '@/lib/intelligence/service'

export const dynamic = 'force-dynamic'

function errorResponse(error: unknown) {
  if (error instanceof ClientIntelligenceError) return NextResponse.json({ code: error.code, error: error.message }, { status: error.status })
  return NextResponse.json({ code: 'GBP_REFRESH_FAILED', error: error instanceof Error ? error.message : 'GBP refresh failed.' }, { status: 502 })
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireInternalUser()
  if ('response' in auth) return auth.response

  try {
    const result = await refreshClientGBP(params.id)
    return NextResponse.json({ ok: true, snapshot: result.snapshot, memory: result.memory })
  } catch (error) {
    return errorResponse(error)
  }
}
