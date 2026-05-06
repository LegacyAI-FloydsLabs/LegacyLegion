import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { ClientWorkspace } from './_components/client-workspace'

export const dynamic = 'force-dynamic'

export default async function ClientWorkspacePage({ params }: { params: { id: string } }) {
  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      workOrders: { orderBy: { createdAt: 'desc' } },
      clientNotes: { orderBy: { createdAt: 'desc' }, include: { author: { select: { name: true, email: true } } } },
      prospects: { orderBy: { createdAt: 'desc' } },
    },
  })
  if (!client) notFound()

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
      }}
    />
  )
}
