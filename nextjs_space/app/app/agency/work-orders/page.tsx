import { prisma } from '@/lib/db'
import { WorkOrdersList } from './_list'

export const dynamic = 'force-dynamic'

export default async function WorkOrdersPage() {
  const [items, clients] = await Promise.all([
    prisma.clientWorkOrder.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        client: { select: { id: true, businessName: true, industry: true } },
        author: { select: { name: true, email: true } },
      },
    }),
    prisma.client.findMany({
      orderBy: { businessName: 'asc' },
      select: { id: true, businessName: true, industry: true },
    }),
  ])

  return (
    <WorkOrdersList
      clients={clients}
      items={items.map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        status: item.status,
        priority: item.priority,
        ownerKind: item.ownerKind,
        ownerLabel: item.ownerLabel,
        approvalStatus: item.approvalStatus,
        dueAt: item.dueAt?.toISOString() ?? null,
        createdAt: item.createdAt.toISOString(),
        generatedAt: item.generatedAt?.toISOString() ?? null,
        deliveredAt: item.deliveredAt?.toISOString() ?? null,
        client: item.client,
        author: item.author ? { name: item.author.name, email: item.author.email } : null,
      }))}
    />
  )
}
