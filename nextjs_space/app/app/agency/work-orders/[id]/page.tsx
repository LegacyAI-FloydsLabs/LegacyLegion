import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { WorkOrderDetail } from './_detail'

export const dynamic = 'force-dynamic'

export default async function WorkOrderDetailPage({ params }: { params: { id: string } }) {
  const item = await prisma.clientWorkOrder.findUnique({
    where: { id: params.id },
    include: {
      client: { select: { id: true, businessName: true, industry: true, city: true, state: true } },
      author: { select: { name: true, email: true } },
      events: { orderBy: { createdAt: 'desc' }, take: 50, include: { actor: { select: { name: true, email: true } } } },
    },
  })
  if (!item) notFound()

  return (
    <WorkOrderDetail
      initialWorkOrder={{
        id: item.id,
        type: item.type,
        title: item.title,
        status: item.status,
        approvalStatus: item.approvalStatus,
        priority: item.priority,
        ownerKind: item.ownerKind,
        ownerLabel: item.ownerLabel,
        dueAt: item.dueAt?.toISOString() ?? null,
        outputMarkdown: item.outputMarkdown,
        internalNotes: item.internalNotes,
        clientSummary: item.clientSummary,
        evidenceLinks: Array.isArray(item.evidenceLinks) ? item.evidenceLinks.filter((value): value is string => typeof value === 'string') : [],
        createdAt: item.createdAt.toISOString(),
        generatedAt: item.generatedAt?.toISOString() ?? null,
        deliveredAt: item.deliveredAt?.toISOString() ?? null,
        approvedAt: item.approvedAt?.toISOString() ?? null,
        client: item.client,
        author: item.author ? { name: item.author.name, email: item.author.email } : null,
        events: item.events.map((event) => ({
          id: event.id,
          type: event.type,
          fromStatus: event.fromStatus,
          toStatus: event.toStatus,
          notes: event.notes,
          createdAt: event.createdAt.toISOString(),
          actor: event.actor ? { name: event.actor.name, email: event.actor.email } : null,
        })),
      }}
    />
  )
}
