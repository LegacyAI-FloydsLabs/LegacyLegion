import { prisma } from '@/lib/db'
import { WorkOrdersList } from './_list'

export const dynamic = 'force-dynamic'

export default async function WorkOrdersPage() {
  const items = await prisma.clientWorkOrder.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      client: { select: { id: true, businessName: true, industry: true } },
      author: { select: { name: true, email: true } },
    },
  })
  return (
    <WorkOrdersList
      items={items.map(i => ({
        id: i.id,
        type: i.type,
        title: i.title,
        status: i.status,
        createdAt: i.createdAt.toISOString(),
        generatedAt: i.generatedAt?.toISOString() ?? null,
        deliveredAt: i.deliveredAt?.toISOString() ?? null,
        client: i.client,
        author: i.author ? { name: i.author.name, email: i.author.email } : null,
      }))}
    />
  )
}
