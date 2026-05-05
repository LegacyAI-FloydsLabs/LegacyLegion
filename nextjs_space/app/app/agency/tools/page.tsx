import { Container } from '@/components/layouts/container'
import { PageHeader } from '@/components/layouts/page-header'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, FileSearch, MapPin, Users, Megaphone, FileText, Mail, MessageSquare, KeySquare, Globe } from 'lucide-react'

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
        <strong className="text-foreground">How to use:</strong> open a client from the <Link href="/app/agency" className="text-primary hover:underline">Clients</Link> tab, then go to the <em>Agency Tools</em> tab in the client workspace. Each tool streams a markdown deliverable, persists it as a Work Order (DRAFT → REVIEW → DELIVERED), and pulls Pinecone context for that client's industry and city.
      </Card>
    </Container>
  )
}
