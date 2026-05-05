import { prisma } from '@/lib/db'
import { LeadsList } from './_components/leads-list'

export const dynamic = 'force-dynamic'

export default async function LeadsPage() {
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: 'desc' },
    take: 500,
    include: { assignedTo: { select: { id: true, name: true, email: true } } },
  })
  return <LeadsList
    leads={leads.map((l: any) => ({
      id: l.id, businessName: l.businessName, ownerName: l.ownerName, email: l.email,
      phone: l.phone, industry: l.industry, status: l.status, source: l.source,
      score: l.score, qualification: l.qualification, proposedTier: l.proposedTier,
      estimatedMRR: l.estimatedMRR, signedMRR: l.signedMRR, city: l.city, state: l.state,
      createdAt: l.createdAt.toISOString(),
      assignedTo: l.assignedTo,
    }))}
  />
}
