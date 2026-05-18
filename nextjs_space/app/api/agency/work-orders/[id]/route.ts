export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { upsertClientWorkOrderMemory } from '@/lib/agents/memory'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const item = await prisma.clientWorkOrder.findUnique({
    where: { id: params.id },
    include: {
      client: { select: { id: true, businessName: true, industry: true, city: true, state: true } },
      author: { select: { name: true, email: true } },
    },
  })
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ item })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const allowed: any = {}
  if ('status' in body) allowed.status = String(body.status).toUpperCase()
  if ('title' in body) allowed.title = String(body.title).slice(0, 200)
  if ('outputMarkdown' in body) allowed.outputMarkdown = body.outputMarkdown
  if (allowed.status === 'DELIVERED') allowed.deliveredAt = new Date()
  const item = await prisma.clientWorkOrder.update({ where: { id: params.id }, data: allowed })
  const memory = item.outputMarkdown && ['REVIEW', 'DELIVERED'].includes(item.status)
    ? await upsertClientWorkOrderMemory(item.id)
    : { ok: true, skipped: true as const, reason: 'WORK_ORDER_NOT_READY_FOR_MEMORY' }
  return NextResponse.json({ item, memory })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await prisma.clientWorkOrder.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
