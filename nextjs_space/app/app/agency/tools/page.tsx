import { Container } from '@/components/layouts/container'
import { PageHeader } from '@/components/layouts/page-header'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, FileSearch, MapPin, Users, Megaphone, FileText, Mail, MessageSquare, KeySquare, Globe } from 'lucide-react'
import { MARKETING_PUBLIC_APIS, PUBLIC_API_CATALOG_SOURCE, PUBLIC_API_WORKFLOW_LABELS } from '@/lib/public-api-catalog'
import {
  OPEN_SOURCE_MARKETING_SOURCE_REPOS,
  OPEN_SOURCE_MARKETING_TOOLS,
  OPEN_SOURCE_TOOL_WORKFLOW_LABELS,
} from '@/lib/open-source-marketing-tool-catalog'

export const dynamic = 'force-dynamic'

const TOOLS = [
  { type: 'SEO_AUDIT', label: 'SEO Audit', description: 'Full local SEO audit for a client website.', icon: FileSearch },
  { type: 'GBP_OPTIMIZATION', label: 'GBP Optimization', description: 'Google Business Profile audit + plan.', icon: MapPin },
  { type: 'COMPETITOR_SWEEP', label: 'Competitor Sweep', description: 'Identify and dissect local competitors.', icon: Users },
  { type: 'KEYWORD_RESEARCH', label: 'Keyword Research', description: 'Local high-intent keyword universe.', icon: KeySquare },
  { type: 'CONTENT_BRIEF', label: 'Content Brief', description: 'Outline + entities for a target page.', icon: FileText },
  { type: 'AD_COPY', label: 'Ad Copy Pack', description: 'Google + Meta ad copy variants.', icon: Megaphone },
  { type: 'LOCAL_LANDING_PAGE', label: 'Local Landing Page', description: 'City/service landing page draft.', icon: Globe },
  { type: 'REVIEW_RESPONSE', label: 'Review Response', description: 'Public reply to a customer review.', icon: MessageSquare },
  { type: 'EMAIL_CAMPAIGN', label: 'Email Campaign', description: '5-touch nurture sequence.', icon: Mail },
]

const PUBLIC_API_WORKFLOWS = Object.entries(PUBLIC_API_WORKFLOW_LABELS).map(([workflow, label]) => ({
  workflow,
  label,
  apis: MARKETING_PUBLIC_APIS.filter((api) => api.workflow === workflow),
}))

const INSTALLED_OPEN_SOURCE_TOOL_GROUPS = Object.entries(OPEN_SOURCE_TOOL_WORKFLOW_LABELS).map(([workflow, label]) => ({
  workflow,
  label,
  tools: OPEN_SOURCE_MARKETING_TOOLS.filter((tool) => tool.workflow === workflow),
}))


export default function AgencyToolsPage() {
  return (
    <Container size="xl">
      <PageHeader
        title="Agency Tools"
        description="All tools live inside a client workspace — they pull the client's industry, city, and tier into the prompt and persist deliverables as Work Orders."
        actions={<Link href="/app/agency"><Button size="sm" variant="outline">Pick a client <ArrowRight className="h-4 w-4 ml-2"/></Button></Link>}
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {TOOLS.map(t => (
          <Card key={t.type} className="p-4">
            <t.icon className="h-5 w-5 text-primary mb-2"/>
            <div className="font-medium">{t.label}</div>
            <div className="text-xs text-muted-foreground mt-1">{t.description}</div>
          </Card>
        ))}
      </div>
      <Card className="mt-6 p-5 text-sm text-muted-foreground">
        <strong className="text-foreground">How to use:</strong> open a client from the <Link href="/app/agency" className="text-primary hover:underline">Clients</Link> tab, then go to the <em>Agency Tools</em> tab in the client workspace. Each tool streams a markdown deliverable, persists it as a Work Order (DRAFT → REVIEW → DELIVERED), and pulls Pinecone context for that client&apos;s industry and city.
      </Card>
      <section className="mt-8 space-y-4">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">Installed open-source tool packs</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {OPEN_SOURCE_MARKETING_TOOLS.length} tools installed from {OPEN_SOURCE_MARKETING_SOURCE_REPOS.length} local source archives. They run from the client workspace as work-order generators using the downloaded sources; they do not auto-call upstream services or report telemetry.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {INSTALLED_OPEN_SOURCE_TOOL_GROUPS.map((group) => (
            <Card key={group.workflow} className="p-4">
              <div className="text-sm font-semibold text-foreground">{group.label}</div>
              <div className="mt-3 space-y-3">
                {group.tools.map((tool) => (
                  <div key={tool.name} className="rounded-md border border-border/70 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-primary">{tool.name}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {tool.integrationMode.replace(/-/g, ' ')}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{tool.sourceRepo}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{tool.platformUse}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">Local source: {tool.localSourcePath}</p>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-8 space-y-4">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">Public API add-ons</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Curated public APIs from{' '}
            <a href={PUBLIC_API_CATALOG_SOURCE.url} className="text-primary hover:underline" target="_blank" rel="noreferrer">
              public-apis/public-apis
            </a>{' '}
            that can extend lead enrichment, local SEO intelligence, campaign delivery, creative production, and safety workflows.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {PUBLIC_API_WORKFLOWS.map((group) => (
            <Card key={group.workflow} className="p-4">
              <div className="text-sm font-semibold text-foreground">{group.label}</div>
              <div className="mt-3 space-y-3">
                {group.apis.map((api) => (
                  <div key={api.name} className="rounded-md border border-border/70 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <a href={api.url} className="text-sm font-medium text-primary hover:underline" target="_blank" rel="noreferrer">
                        {api.name}
                      </a>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {api.auth === 'No' ? 'No auth' : api.auth}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{api.sourceCategory}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{api.platformUse}</p>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>
    </Container>
  )
}
