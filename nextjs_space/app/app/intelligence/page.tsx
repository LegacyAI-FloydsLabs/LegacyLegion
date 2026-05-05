import { Intelligence } from './_components/intelligence'

export const dynamic = 'force-dynamic'

export default function IntelligencePage() {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Intelligence</h1>
        <p className="text-muted-foreground mt-1">Search the LegacyAI knowledge base for SEO and competitive intel.</p>
      </div>
      <Intelligence />
    </div>
  )
}
