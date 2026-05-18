import { NextRequest, NextResponse } from 'next/server'
import { requireInternalUser } from '@/lib/authz'
import { promoteProspectToLead, ProspectSearchError } from '@/lib/prospects/service'

export const dynamic = 'force-dynamic'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireInternalUser()
  if ('response' in auth) return auth.response
  const userId = auth.userId

  try {
    const result = await promoteProspectToLead({ userId, prospectId: params.id })
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    if (error instanceof ProspectSearchError) {
      return NextResponse.json({ code: error.code, error: error.message }, { status: error.status })
    }
    return NextResponse.json({ code: 'PROSPECT_PROMOTE_FAILED', error: 'Prospect promotion failed.' }, { status: 500 })
  }
}
