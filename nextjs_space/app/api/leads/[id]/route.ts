export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { tierMRR } from '@/lib/scoring'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const lead = await prisma.lead.findUnique({
    where: { id: params.id },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      notes: { orderBy: { createdAt: 'desc' }, include: { author: { select: { id: true, name: true } } } },
      activities: { orderBy: { createdAt: 'desc' }, include: { author: { select: { id: true, name: true } } } },
      referralPartner: true,
    },
  })
  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ lead })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  const body = await req.json().catch(() => ({}))
  const allowed: Record<string, any> = {}
  const fields = [
    'status', 'assignedToId', 'proposedTier', 'estimatedMRR',
    'phone', 'website', 'biggestPainPoint', 'currentProvider',
    'lostReason', 'signedTier', 'signedMRR', 'qualification',
  ] as const
  for (const f of fields) if (f in body) allowed[f] = body[f]

  const before = await prisma.lead.findUnique({ where: { id: params.id } })
  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Auto-transition timestamps
  if (allowed.status === 'WON' && before.status !== 'WON') {
    allowed.wonAt = new Date()
    if (!allowed.signedTier) allowed.signedTier = before.proposedTier
    if (!allowed.signedMRR && before.proposedTier) allowed.signedMRR = tierMRR(before.proposedTier)
  }
  if (allowed.status === 'LOST' && before.status !== 'LOST') {
    allowed.lostAt = new Date()
  }

  const lead = await prisma.lead.update({ where: { id: params.id }, data: allowed })

  if (allowed.status && allowed.status !== before.status) {
    await prisma.activity.create({
      data: {
        leadId: lead.id, authorId: userId, type: 'STATUS_CHANGE',
        title: `Status: ${before.status} → ${lead.status}`,
      },
    })
  }
  if (allowed.assignedToId && allowed.assignedToId !== before.assignedToId) {
    const assignee = await prisma.user.findUnique({ where: { id: allowed.assignedToId } })
    await prisma.activity.create({
      data: {
        leadId: lead.id, authorId: userId, type: 'SYSTEM',
        title: `Assigned to ${assignee?.name ?? assignee?.email ?? 'team member'}`,
      },
    })
  }

  return NextResponse.json({ lead })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  await prisma.lead.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
