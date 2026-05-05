import { prisma } from '@/lib/db'
import { DashboardClient } from './_components/dashboard-client'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const [leads, partners] = await Promise.all([
    prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        id: true, businessName: true, ownerName: true, email: true, industry: true,
        status: true, source: true, score: true, qualification: true, proposedTier: true,
        estimatedMRR: true, signedMRR: true, createdAt: true, city: true, state: true,
      },
    }),
    prisma.referralPartner.count(),
  ])

  const total = leads.length
  const won = leads.filter((l: any) => l.status === 'WON').length
  const lost = leads.filter((l: any) => l.status === 'LOST').length
  const active = total - won - lost
  const winRate = total > 0 ? Math.round((won / Math.max(1, won + lost)) * 100) : 0
  const pipelineValue = leads
    .filter((l: any) => l.status !== 'WON' && l.status !== 'LOST')
    .reduce((sum: number, l: any) => sum + (l.estimatedMRR ?? 0), 0)
  const wonMRR = leads
    .filter((l: any) => l.status === 'WON')
    .reduce((sum: number, l: any) => sum + (l.signedMRR ?? l.estimatedMRR ?? 0), 0)

  return (
    <DashboardClient
      leads={leads.map((l: any) => ({ ...l, createdAt: l.createdAt.toISOString() }))}
      stats={{ total, won, lost, active, winRate, pipelineValue, wonMRR, partners }}
    />
  )
}
