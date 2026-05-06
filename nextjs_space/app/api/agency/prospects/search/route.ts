import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ProspectSearchError, searchProspects } from '@/lib/prospects/service'

export const dynamic = 'force-dynamic'

function errorResponse(error: unknown) {
  if (error instanceof ProspectSearchError) {
    const body: any = { code: error.code, error: error.message }
    if (error.details && typeof error.details === 'object' && 'service' in error.details) body.service = (error.details as any).service
    return NextResponse.json(body, { status: error.status })
  }
  return NextResponse.json({ code: 'PROSPECT_SEARCH_FAILED', error: 'Prospect search failed.' }, { status: 500 })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  try {
    const result = await searchProspects({
      userId,
      clientId: body.clientId ?? null,
      nlQuery: typeof body.nlQuery === 'string' ? body.nlQuery : undefined,
      criteria: body.criteria && typeof body.criteria === 'object' ? body.criteria : undefined,
      source: body.source === 'apollo' || body.source === 'explorium' || body.source === 'auto' ? body.source : 'auto',
      limit: body.limit,
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    return errorResponse(error)
  }
}
