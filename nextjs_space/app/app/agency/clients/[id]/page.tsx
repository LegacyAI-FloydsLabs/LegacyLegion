import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { ClientWorkspace } from './_components/client-workspace'

export const dynamic = 'force-dynamic'

export default async function ClientWorkspacePage({ params }: { params: { id: string } }) {
  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      workOrders: { orderBy: { createdAt: 'desc' } },
      clientNotes: { orderBy: { createdAt: 'desc' }, include: { author: { select: { name: true, email: true } } } },
      prospects: { orderBy: { createdAt: 'desc' } },
      intelligence: true,
      accessRequests: {
        orderBy: { updatedAt: 'desc' },
        include: {
          requester: { select: { name: true, email: true } },
          approver: { select: { name: true, email: true } },
          events: {
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: { actor: { select: { name: true, email: true } } },
          },
        },
      },
    },
  })
  if (!client) notFound()

  const session = await getServerSession(authOptions)

  return (
    <ClientWorkspace
      client={{
        ...client,
        createdAt: client.createdAt.toISOString(),
        updatedAt: client.updatedAt.toISOString(),
        onboardedAt: client.onboardedAt?.toISOString() ?? null,
        churnedAt: client.churnedAt?.toISOString() ?? null,
        workOrders: client.workOrders.map((w: any) => ({
          ...w,
          createdAt: w.createdAt.toISOString(),
          updatedAt: w.updatedAt.toISOString(),
          generatedAt: w.generatedAt?.toISOString() ?? null,
          deliveredAt: w.deliveredAt?.toISOString() ?? null,
        })),
        clientNotes: client.clientNotes.map((n: any) => ({
          ...n,
          createdAt: n.createdAt.toISOString(),
        })),
        prospects: client.prospects.map((p: any) => ({
          ...p,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        })),
        intelligence: client.intelligence ? {
          gbpSnapshotJson: client.intelligence.gbpSnapshotJson,
          gscSummaryJson: client.intelligence.gscSummaryJson,
          fetchedAt: client.intelligence.fetchedAt.toISOString(),
        } : null,
        accessRequests: client.accessRequests.map((request: any) => ({
          ...request,
          requestedAt: request.requestedAt.toISOString(),
          receivedAt: request.receivedAt?.toISOString() ?? null,
          approvedAt: request.approvedAt?.toISOString() ?? null,
          revokedAt: request.revokedAt?.toISOString() ?? null,
          createdAt: request.createdAt.toISOString(),
          updatedAt: request.updatedAt.toISOString(),
          events: request.events.map((event: any) => ({
            ...event,
            createdAt: event.createdAt.toISOString(),
          })),
        })),
      }}
      currentUserRole={session?.user?.role ?? null}
    />
  )
}
