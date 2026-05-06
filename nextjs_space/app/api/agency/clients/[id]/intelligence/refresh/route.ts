import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ClientIntelligenceError, refreshClientGBP } from '@/lib/intelligence/service'

export const dynamic = 'force-dynamic'

function errorResponse(error: unknown) {
  if (error instanceof ClientIntelligenceError) return NextResponse.json({ code: error.code, error: error.message }, { status: error.status })
  return NextResponse.json({ code: 'GBP_REFRESH_FAILED', error: error instanceof Error ? error.message : 'GBP refresh failed.' }, { status: 502 })
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const snapshot = await refreshClientGBP(params.id)
    return NextResponse.json({ ok: true, snapshot })
  } catch (error) {
    return errorResponse(error)
  }
}
