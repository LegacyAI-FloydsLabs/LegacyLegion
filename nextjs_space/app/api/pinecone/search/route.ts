export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { searchSEOIntelligence } from '@/lib/pinecone'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const query = String(body?.query ?? '').trim()
  const topK = Math.min(20, Math.max(1, Number(body?.topK ?? 5)))
  if (!query) return NextResponse.json({ error: 'query required' }, { status: 400 })
  const matches = await searchSEOIntelligence(query, topK)
  return NextResponse.json({ matches })
}
