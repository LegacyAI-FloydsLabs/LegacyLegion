export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
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
