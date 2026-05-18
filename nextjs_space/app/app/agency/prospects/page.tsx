import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Container } from '@/components/layouts/container'
import { PageHeader } from '@/components/layouts/page-header'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default async function AllProspectsPage({ searchParams }: { searchParams?: { clientId?: string; source?: string; hasEmail?: string } }) {
  const where: any = {}
  if (searchParams?.clientId) where.clientId = searchParams.clientId
  if (searchParams?.source) where.source = searchParams.source.toUpperCase()
  if (searchParams?.hasEmail === 'true') where.personEmail = { not: null }
  if (searchParams?.hasEmail === 'false') where.personEmail = null

  const [prospects, clients] = await Promise.all([
    prisma.prospect.findMany({ where, orderBy: { createdAt: 'desc' }, include: { client: { select: { businessName: true } } }, take: 100 }),
    prisma.client.findMany({ orderBy: { businessName: 'asc' }, select: { id: true, businessName: true } }),
  ])

  const query = new URLSearchParams()
  if (searchParams?.clientId) query.set('clientId', searchParams.clientId)
  if (searchParams?.source) query.set('source', searchParams.source)
  if (searchParams?.hasEmail) query.set('hasEmail', searchParams.hasEmail)

  return (
    <Container size="xl">
      <PageHeader
        title="All Prospects"
        description="Net-new prospects persisted from Explorium and Apollo searches."
        actions={<Link href="/app/agency/chat?persona=lead-gen-manager"><Button>Run Prospect Search</Button></Link>}
      />

      <Card className="mt-6 flex flex-wrap gap-2 p-3 text-sm">
        <Link href="/app/agency/prospects"><Button variant={!query.toString() ? 'default' : 'outline'} size="sm">All</Button></Link>
        <Link href="/app/agency/prospects?hasEmail=true"><Button variant={searchParams?.hasEmail === 'true' ? 'default' : 'outline'} size="sm">Has email</Button></Link>
        <Link href="/app/agency/prospects?source=EXPLORIUM"><Button variant={searchParams?.source === 'EXPLORIUM' ? 'default' : 'outline'} size="sm">Explorium</Button></Link>
        <Link href="/app/agency/prospects?source=APOLLO"><Button variant={searchParams?.source === 'APOLLO' ? 'default' : 'outline'} size="sm">Apollo</Button></Link>
        {clients.map((client) => (
          <Link key={client.id} href={`/app/agency/prospects?clientId=${client.id}`}>
            <Button variant={searchParams?.clientId === client.id ? 'default' : 'outline'} size="sm">{client.businessName}</Button>
          </Link>
        ))}
      </Card>

      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        {prospects.map((prospect: any) => {
          const name = [prospect.personFirstName, prospect.personLastName].filter(Boolean).join(' ')
          return (
            <Card key={prospect.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">{prospect.source}{prospect.client?.businessName ? ` • ${prospect.client.businessName}` : ''}</div>
                  <div className="font-medium truncate">{name || prospect.companyName || 'Unnamed prospect'}</div>
                  <div className="text-sm text-muted-foreground truncate">{prospect.personTitle || prospect.companyName || '—'}</div>
                </div>
                <Badge variant="outline">{prospect.personEmail ? 'Email' : 'No email'}</Badge>
              </div>
              <div className="mt-3 grid gap-1 text-xs text-muted-foreground">
                <div>{prospect.personEmail ?? 'No email yet'}</div>
                <div>{prospect.companyDomain ?? prospect.companyName ?? 'No company domain'}</div>
                <div>{[prospect.city, prospect.state].filter(Boolean).join(', ') || 'No location'}</div>
              </div>
            </Card>
          )
        })}
        {prospects.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground lg:col-span-2">No prospects match these filters.</Card>}
      </div>
    </Container>
  )
}
