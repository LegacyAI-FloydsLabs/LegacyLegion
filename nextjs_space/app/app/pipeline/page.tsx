import { prisma } from '@/lib/db'
import { Pipeline } from './_components/pipeline'

export const dynamic = 'force-dynamic'

export default async function PipelinePage() {
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: {
      id: true, businessName: true, ownerName: true, industry: true, status: true,
      score: true, qualification: true, proposedTier: true, estimatedMRR: true,
      city: true, source: true, createdAt: true,
    },
  })
  return (
    <Pipeline leads={leads.map(l => ({ ...l, createdAt: l.createdAt.toISOString() }))} />
  )
}
