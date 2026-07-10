import { Container } from '@/components/layouts/container'
import { PageHeader } from '@/components/layouts/page-header'
import { prisma } from '@/lib/db'
import { AgencyChatClient } from './_components/agency-chat-client'

export const dynamic = 'force-dynamic'

export default async function AgencyChatPage() {
  const clients = await prisma.client.findMany({
    where: { status: { not: 'CHURNED' } },
    orderBy: { businessName: 'asc' },
    select: { id: true, businessName: true },
  })

  return (
    <>
      {/* Desktop: standard container + header */}
      <div className="hidden lg:block">
        <Container size="xl">
          <PageHeader
            title="Agent Chat"
            description="Talk to personas or run the senior marketing runtime for LLM work, Douglas HIL tasks, and Ryan field assignments."
          />
          <div className="mt-6 pb-8">
            <AgencyChatClient clients={clients} />
          </div>
        </Container>
      </div>

      {/* Mobile: no container/header padding — terminal fills viewport */}
      <div className="lg:hidden">
        <AgencyChatClient clients={clients} />
      </div>
    </>
  )
}
