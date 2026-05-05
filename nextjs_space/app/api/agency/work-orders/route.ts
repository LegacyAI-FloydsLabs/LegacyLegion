export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
