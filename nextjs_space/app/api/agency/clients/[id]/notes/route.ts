export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { upsertClientNoteMemory } from '@/lib/agents/memory'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const text = String(body?.body ?? '').trim()
  if (!text) return NextResponse.json({ error: 'body required' }, { status: 400 })
  const note = await prisma.clientNote.create({
    data: {
      clientId: params.id,
      authorId: userId,
      body: text,
      pinned: Boolean(body?.pinned ?? false),
    },
    include: { author: { select: { name: true, email: true } } },
  })
  const memory = await upsertClientNoteMemory(note.id)
  return NextResponse.json({ note, memory })
}
