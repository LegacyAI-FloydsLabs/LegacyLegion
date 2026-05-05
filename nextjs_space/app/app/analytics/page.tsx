import { prisma } from '@/lib/db'
import { AnalyticsClient } from './_components/analytics-client'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1000,
    select: {
      id: true, industry: true, source: true, status: true, score: true,
      estimatedMRR: true, signedMRR: true, createdAt: true, lostReason: true,
    },
  })
  return <AnalyticsClient leads={leads.map(l => ({ ...l, createdAt: l.createdAt.toISOString() }))} />
}
