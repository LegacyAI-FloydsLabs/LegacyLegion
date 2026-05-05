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
  const type = String(body?.type ?? 'CALL')
  const title = String(body?.title ?? '').trim() || `Logged ${type.toLowerCase()}`
  const text = String(body?.body ?? '').trim() || null
  const activity = await prisma.activity.create({
    data: { leadId: params.id, authorId: userId, type, title, body: text },
    include: { author: { select: { id: true, name: true } } },
  })
  return NextResponse.json({ activity })
}
