export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireInternalUser } from '@/lib/authz'
import { prisma } from '@/lib/db'

export async function GET() {
  const auth = await requireInternalUser()
  if ('response' in auth) return auth.response
  const items = await prisma.clientWorkOrder.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      client: { select: { id: true, businessName: true, industry: true } },
      author: { select: { name: true, email: true } },
    },
  })
  return NextResponse.json({ items })
}
