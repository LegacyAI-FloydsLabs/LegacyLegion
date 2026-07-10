import { Intelligence } from './_components/intelligence'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function IntelligencePage() {
  const clients = await prisma.client.findMany({
    orderBy: { businessName: 'asc' },
    select: { id: true, businessName: true, industry: true, city: true, state: true, strategyBrief: true },
  })

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Intelligence</h1>
        <p className="text-muted-foreground mt-1">Search client-scoped evidence first, or explicitly switch to global knowledge search.</p>
      </div>
      <Intelligence clients={clients} defaultClientId={clients[0]?.id ?? ''} />
    </div>
  )
}
