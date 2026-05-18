export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireInternalUser } from '@/lib/authz'
import { prisma } from '@/lib/db'

export async function GET() {
  const auth = await requireInternalUser()
  if ('response' in auth) return auth.response
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { workOrders: true, clientNotes: true } },
    },
  })
  return NextResponse.json({ clients })
}

export async function POST(req: NextRequest) {
  const auth = await requireInternalUser()
  if ('response' in auth) return auth.response
  const body = await req.json().catch(() => ({}))
  const businessName = String(body?.businessName ?? '').trim()
  const industry = String(body?.industry ?? '').trim()
  if (!businessName || !industry) {
    return NextResponse.json({ error: 'businessName and industry are required' }, { status: 400 })
  }
  const client = await prisma.client.create({
    data: {
      businessName,
      industry: industry.toUpperCase(),
      ownerName: body?.ownerName ?? null,
      email: body?.email ?? null,
      phone: body?.phone ?? null,
      city: body?.city ?? null,
      state: body?.state ?? null,
      website: body?.website ?? null,
      gbpUrl: body?.gbpUrl ?? null,
      facebookUrl: body?.facebookUrl ?? null,
      linkedinUrl: body?.linkedinUrl ?? null,
      tier: (body?.tier ?? 'LAUNCH_PAD').toString().toUpperCase(),
      monthlyMRR: Number(body?.monthlyMRR ?? 0) || 0,
      status: (body?.status ?? 'ACTIVE').toString().toUpperCase(),
      strategyBrief: body?.strategyBrief ?? null,
      onboardedAt: body?.onboardedAt ? new Date(body.onboardedAt) : new Date(),
      fromLeadId: body?.fromLeadId ?? null,
    },
  })
  return NextResponse.json({ client })
}
