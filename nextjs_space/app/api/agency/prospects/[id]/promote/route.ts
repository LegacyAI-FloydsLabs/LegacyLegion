import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { promoteProspectToLead, ProspectSearchError } from '@/lib/prospects/service'

export const dynamic = 'force-dynamic'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
