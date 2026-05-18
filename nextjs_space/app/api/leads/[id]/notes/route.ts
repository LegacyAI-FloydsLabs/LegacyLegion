export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireInternalUser } from '@/lib/authz'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireInternalUser()
  if ('response' in auth) return auth.response
  const userId = auth.userId
  const body = await req.json().catch(() => ({}))
  const text = String(body?.body ?? '').trim()
  if (!text) return NextResponse.json({ error: 'Empty note' }, { status: 400 })
  const note = await prisma.note.create({
    data: { leadId: params.id, authorId: userId, body: text },
    include: { author: { select: { id: true, name: true } } },
  })
  await prisma.activity.create({
    data: { leadId: params.id, authorId: userId, type: 'NOTE_ADDED', title: 'Note added', body: text.slice(0, 200) },
  })
  return NextResponse.json({ note })
}
