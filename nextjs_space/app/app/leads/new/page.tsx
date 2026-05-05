import { NewLeadForm } from './new-lead-form'
import { Card, CardContent } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export default function NewLeadPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Add Lead</h1>
        <p className="text-muted-foreground mt-1">Manual entry for LinkedIn outreach, networking events, or referrals.</p>
      </div>
      <Card>
        <CardContent className="p-6"><NewLeadForm /></CardContent>
      </Card>
    </div>
  )
}
