export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      workOrders: { orderBy: { createdAt: 'desc' } },
      clientNotes: { orderBy: { createdAt: 'desc' }, include: { author: { select: { name: true, email: true } } } },
    },
  })
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ client })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const allowed: any = {}
  for (const k of ['businessName','ownerName','email','phone','industry','city','state','website','gbpUrl','facebookUrl','linkedinUrl','tier','status','strategyBrief']) {
    if (k in body) allowed[k] = body[k]
  }
  if ('monthlyMRR' in body) allowed.monthlyMRR = Number(body.monthlyMRR ?? 0) || 0
  if (allowed.industry) allowed.industry = String(allowed.industry).toUpperCase()
  if (allowed.tier) allowed.tier = String(allowed.tier).toUpperCase()
  if (allowed.status) allowed.status = String(allowed.status).toUpperCase()
  const client = await prisma.client.update({ where: { id: params.id }, data: allowed })
  return NextResponse.json({ client })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await prisma.client.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
