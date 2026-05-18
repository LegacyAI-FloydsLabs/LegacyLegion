import { NextRequest, NextResponse } from 'next/server'
import { requireInternalUser } from '@/lib/authz'
import { ClientIntelligenceError, saveClientGscSummary } from '@/lib/intelligence/service'

export const dynamic = 'force-dynamic'

function errorResponse(error: unknown) {
  if (error instanceof ClientIntelligenceError) return NextResponse.json({ code: error.code, error: error.message }, { status: error.status })
  return NextResponse.json({ code: 'GSC_IMPORT_FAILED', error: error instanceof Error ? error.message : 'GSC import failed.' }, { status: 400 })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireInternalUser()
  if ('response' in auth) return auth.response

  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ code: 'GSC_FILE_REQUIRED', error: 'CSV file is required.' }, { status: 400 })
    const result = await saveClientGscSummary(params.id, await file.text())
    return NextResponse.json({ ok: true, summary: result.summary, memory: result.memory })
  } catch (error) {
    return errorResponse(error)
  }
}
