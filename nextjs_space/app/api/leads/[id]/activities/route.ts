export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireInternalUser } from '@/lib/authz'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireInternalUser()
  if ('response' in auth) return auth.response
  const userId = auth.userId
  const body = await req.json().catch(() => ({}))
  const type = String(body?.type ?? 'CALL')
  const title = String(body?.title ?? '').trim() || `Logged ${type.toLowerCase()}`
  const text = String(body?.body ?? '').trim() || null
  const activity = await prisma.activity.create({
    data: { leadId: params.id, authorId: userId, type, title, body: text },
    include: { author: { select: { id: true, name: true } } },
  })
  return NextResponse.json({ activity })
}
