import { Intelligence } from '../../intelligence/_components/intelligence'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function AgencyIntelligencePage() {
  const clients = await prisma.client.findMany({
    orderBy: { businessName: 'asc' },
    select: { id: true, businessName: true, industry: true, city: true, state: true, strategyBrief: true },
  })

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Agency Intelligence</h1>
        <p className="text-muted-foreground mt-1">Client-scoped search for evidence, next actions, work orders, notes, and report sections.</p>
      </div>
      <Intelligence clients={clients} defaultClientId={clients[0]?.id ?? ''} />
    </div>
  )
}
