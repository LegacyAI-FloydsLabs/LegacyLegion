export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireInternalUser } from '@/lib/authz'
import { searchSEOIntelligence } from '@/lib/pinecone'

export async function POST(req: NextRequest) {
  const auth = await requireInternalUser()
  if ('response' in auth) return auth.response
  const body = await req.json().catch(() => ({}))
  const query = String(body?.query ?? '').trim()
  const topK = Math.min(20, Math.max(1, Number(body?.topK ?? 5)))
  if (!query) return NextResponse.json({ error: 'query required' }, { status: 400 })
  const matches = await searchSEOIntelligence(query, topK)
  return NextResponse.json({ matches })
}
