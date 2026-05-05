import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { LeadDetail } from './_components/lead-detail'

export const dynamic = 'force-dynamic'

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const [lead, users] = await Promise.all([
    prisma.lead.findUnique({
      where: { id: params.id },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        notes: { orderBy: { createdAt: 'desc' }, include: { author: { select: { id: true, name: true } } } },
        activities: { orderBy: { createdAt: 'desc' }, take: 100, include: { author: { select: { id: true, name: true } } } },
        referralPartner: { select: { id: true, name: true, partnerCode: true, tier: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: { in: ['admin', 'team'] } },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
  ])

  if (!lead) notFound()

  // Serialize dates
  const safeLead = {
    ...lead,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
    aiAssessedAt: lead.aiAssessedAt?.toISOString() ?? null,
    wonAt: lead.wonAt?.toISOString() ?? null,
    lostAt: lead.lostAt?.toISOString() ?? null,
    notes: lead.notes.map((n: any) => ({ ...n, createdAt: n.createdAt.toISOString() })),
    activities: lead.activities.map((a: any) => ({ ...a, createdAt: a.createdAt.toISOString() })),
  }

  return <LeadDetail lead={safeLead as any} teamMembers={users} />
}
