'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { Container } from '@/components/layouts/container'
import { PageHeader } from '@/components/layouts/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Building2, Plus, ArrowUpRight, Sparkles, Briefcase, ClipboardList, FileText, Trophy } from 'lucide-react'

interface ClientRow {
  id: string
  businessName: string
  industry: string
  city: string | null
  state: string | null
  tier: string
  status: string
  monthlyMRR: number
  website: string | null
  createdAt: string
  onboardedAt: string | null
  _count: { workOrders: number; clientNotes: number }
}

interface WonLead {
  id: string
  businessName: string
  ownerName: string
  industry: string
  city: string | null
  state: string | null
  signedTier: string | null
  proposedTier: string | null
  signedMRR: number | null
  estimatedMRR: number | null
  wonAt: string | null
  alreadyConverted: boolean
}

function tierBadge(t: string) {
  if (t === 'MARKET_DOMINATOR') return 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30'
  if (t === 'GROWTH_ENGINE') return 'bg-violet-500/15 text-violet-300 border-violet-500/30'
  return 'bg-slate-500/15 text-slate-300 border-slate-500/30'
}
function statusBadge(s: string) {
  if (s === 'ACTIVE') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
  if (s === 'ONBOARDING') return 'bg-amber-500/15 text-amber-300 border-amber-500/30'
  if (s === 'PAUSED') return 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30'
  return 'bg-rose-500/15 text-rose-300 border-rose-500/30'
}

export function ClientsRoster({ clients, wonLeads }: { clients: ClientRow[]; wonLeads: WonLead[] }) {
  const router = useRouter()
  const [busyLeadId, setBusyLeadId] = useState<string | null>(null)

  async function convertLead(leadId: string) {
    setBusyLeadId(leadId)
    try {
      const res = await fetch(`/api/agency/convert-lead/${leadId}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'Failed')
      toast.success(data.alreadyExisted ? 'Already a client — opening workspace' : 'Client created')
      router.push(`/app/agency/clients/${data.client.id}`)
      router.refresh()
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not convert')
    } finally {
      setBusyLeadId(null)
    }
  }

  const totalMRR = clients.filter(c => c.status === 'ACTIVE').reduce((s, c) => s + c.monthlyMRR, 0)
  const activeCount = clients.filter(c => c.status === 'ACTIVE').length
  const onboardingCount = clients.filter(c => c.status === 'ONBOARDING').length
  const totalWO = clients.reduce((s, c) => s + c._count.workOrders, 0)

  return (
    <Container size="xl">
      <PageHeader
        title="Agency — Client Workspace"
        description="This is where Ryan and the team execute work FOR active clients. Pick a client to launch SEO audits, GBP optimizations, content briefs, and more — all powered by the LegacyAI knowledge base."
        actions={
          <>
            <Link href="/app/agency/work-orders"><Button variant="outline" size="sm"><ClipboardList className="h-4 w-4 mr-2"/>Work Orders</Button></Link>
            <Link href="/app/agency/clients/new"><Button size="sm"><Plus className="h-4 w-4 mr-2"/>New Client</Button></Link>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Active clients</div><div className="text-2xl font-display font-semibold mt-1">{activeCount}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Onboarding</div><div className="text-2xl font-display font-semibold mt-1">{onboardingCount}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Active MRR</div><div className="text-2xl font-display font-semibold mt-1">${totalMRR.toLocaleString()}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Work orders</div><div className="text-2xl font-display font-semibold mt-1">{totalWO}</div></Card>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-semibold">Active Client Roster</h2>
          <span className="text-xs text-muted-foreground">{clients.length} total</span>
        </div>

        {clients.length === 0 ? (
          <Card className="p-8 text-center">
            <Building2 className="h-8 w-8 mx-auto text-muted-foreground mb-3"/>
            <h3 className="font-medium">No clients yet</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Convert a won lead below, or add a client manually to start delivering work.</p>
            <Link href="/app/agency/clients/new"><Button size="sm"><Plus className="h-4 w-4 mr-2"/>Create First Client</Button></Link>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map(c => (
              <Link key={c.id} href={`/app/agency/clients/${c.id}`}>
                <Card className="p-4 hover:border-primary/50 transition-colors h-full">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{c.businessName}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{c.industry}{c.city ? ` • ${c.city}, ${c.state ?? 'IN'}` : ''}</div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground shrink-0"/>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <Badge variant="outline" className={statusBadge(c.status)}>{c.status}</Badge>
                    <Badge variant="outline" className={tierBadge(c.tier)}>{c.tier.replace('_',' ')}</Badge>
                    <Badge variant="outline">${c.monthlyMRR}/mo</Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><FileText className="h-3 w-3"/>{c._count.workOrders} work orders</span>
                    <span className="flex items-center gap-1"><Sparkles className="h-3 w-3"/>{c._count.clientNotes} notes</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {wonLeads.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2"><Trophy className="h-4 w-4 text-emerald-400"/>Won Leads ready to onboard</h2>
            <span className="text-xs text-muted-foreground">{wonLeads.filter(l => !l.alreadyConverted).length} pending</span>
          </div>
          <Card className="divide-y divide-border">
            {wonLeads.map(l => (
              <div key={l.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="font-medium truncate">{l.businessName}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{l.industry} • {l.signedTier ?? l.proposedTier ?? 'LAUNCH_PAD'} • ${(l.signedMRR ?? l.estimatedMRR ?? 0).toLocaleString()}/mo</div>
                </div>
                {l.alreadyConverted ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30">Onboarded</Badge>
                ) : (
                  <Button size="sm" disabled={busyLeadId === l.id} onClick={() => convertLead(l.id)}>
                    {busyLeadId === l.id ? 'Converting…' : <><Briefcase className="h-4 w-4 mr-2"/>Onboard as Client</>}
                  </Button>
                )}
              </div>
            ))}
          </Card>
        </div>
      )}
    </Container>
  )
}
