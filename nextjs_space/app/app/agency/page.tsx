import { prisma } from '@/lib/db'
import { ClientsRoster } from './_components/clients-roster'

export const dynamic = 'force-dynamic'

export default async function AgencyHomePage() {
  const [clients, wonLeads] = await Promise.all([
    prisma.client.findMany({
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: {
        _count: { select: { workOrders: true, clientNotes: true } },
      },
    }),
    prisma.lead.findMany({
      where: { status: 'WON' },
      orderBy: { wonAt: 'desc' },
      take: 25,
      select: {
        id: true, businessName: true, ownerName: true, industry: true, city: true, state: true,
        signedTier: true, signedMRR: true, estimatedMRR: true, proposedTier: true, wonAt: true,
      },
    }),
  ])
  // determine which won leads are already converted
  const converted = new Set(
    (await prisma.client.findMany({ where: { fromLeadId: { not: null } }, select: { fromLeadId: true } }))
      .map(c => c.fromLeadId as string)
  )
  return (
    <ClientsRoster
      clients={clients.map(c => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        onboardedAt: c.onboardedAt?.toISOString() ?? null,
      }))}
      wonLeads={wonLeads.map(l => ({
        ...l,
        wonAt: l.wonAt?.toISOString() ?? null,
        alreadyConverted: converted.has(l.id),
      }))}
    />
  )
}
