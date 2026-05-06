'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Container } from '@/components/layouts/container'
import { PageHeader } from '@/components/layouts/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Wrench, FileText, StickyNote, Edit3, Globe, MapPin, Sparkles, Trash2, ExternalLink, Copy, CheckCircle2 } from 'lucide-react'
import { AgencyToolPanel } from './agency-tool-panel'
import { WorkOrderViewer } from './work-order-viewer'

interface WorkOrder {
  id: string
  type: string
  title: string
  status: string
  outputMarkdown: string | null
  createdAt: string
  updatedAt: string
  generatedAt: string | null
  deliveredAt: string | null
  inputJson: any
}

interface ClientNote {
  id: string
  body: string
  pinned: boolean
  createdAt: string
  author?: { name: string | null; email: string | null } | null
}

interface Prospect {
  id: string
  source: string
  companyName: string | null
  companyDomain: string | null
  personFirstName: string | null
  personLastName: string | null
  personTitle: string | null
  personEmail: string | null
  city: string | null
  state: string | null
  promotedToLeadId: string | null
  createdAt: string
}

interface Client {
  id: string
  businessName: string
  ownerName: string | null
  email: string | null
  phone: string | null
  industry: string
  city: string | null
  state: string | null
  website: string | null
  gbpUrl: string | null
  facebookUrl: string | null
  linkedinUrl: string | null
  tier: string
  status: string
  monthlyMRR: number
  strategyBrief: string | null
  createdAt: string
  updatedAt: string
  onboardedAt: string | null
  churnedAt: string | null
  workOrders: WorkOrder[]
  clientNotes: ClientNote[]
  prospects: Prospect[]
}

export function ClientWorkspace({ client }: { client: Client }) {
  const router = useRouter()
  const [activeWorkOrder, setActiveWorkOrder] = useState<WorkOrder | null>(null)
  const [optimisticOrders, setOptimisticOrders] = useState<WorkOrder[]>(client.workOrders)
  const [noteText, setNoteText] = useState('')
  const [busyNote, setBusyNote] = useState(false)

  const orders = optimisticOrders
  const inProgress = orders.filter(o => o.status === 'IN_PROGRESS' || o.status === 'REVIEW').length
  const delivered = orders.filter(o => o.status === 'DELIVERED').length

  function tierBadge(t: string) {
    if (t === 'MARKET_DOMINATOR') return 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30'
    if (t === 'GROWTH_ENGINE') return 'bg-violet-500/15 text-violet-300 border-violet-500/30'
    return 'bg-slate-500/15 text-slate-300 border-slate-500/30'
  }

  async function addNote() {
    if (!noteText.trim()) return
    setBusyNote(true)
    try {
      const res = await fetch(`/api/agency/clients/${client.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: noteText }),
      })
      if (!res.ok) throw new Error('Failed')
      setNoteText('')
      toast.success('Note added')
      router.refresh()
    } catch { toast.error('Could not save note') } finally { setBusyNote(false) }
  }

  function handleNewWorkOrder(wo: WorkOrder) {
    setOptimisticOrders(prev => [wo, ...prev.filter(p => p.id !== wo.id)])
    setActiveWorkOrder(wo)
  }

  async function deleteClient() {
    if (!confirm(`Delete ${client.businessName}? This removes all work orders and notes.`)) return
    const res = await fetch(`/api/agency/clients/${client.id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Client deleted'); router.push('/app/agency') } else toast.error('Failed')
  }

  return (
    <Container size="xl">
      <div className="mb-3">
        <Link href="/app/agency" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><ArrowLeft className="h-3 w-3"/>Back to clients</Link>
      </div>
      <PageHeader
        title={client.businessName}
        description={`${client.industry} • ${client.city ?? 'Indianapolis'}, ${client.state ?? 'IN'}${client.ownerName ? ` • ${client.ownerName}` : ''}`}
        actions={
          <>
            <Badge variant="outline" className={tierBadge(client.tier)}>{client.tier.replace('_',' ')}</Badge>
            <Badge variant="outline">${client.monthlyMRR}/mo</Badge>
            <Button variant="ghost" size="sm" onClick={deleteClient}><Trash2 className="h-4 w-4 text-rose-400"/></Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Status</div><div className="text-lg font-display font-semibold mt-1">{client.status}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Work in progress</div><div className="text-lg font-display font-semibold mt-1">{inProgress}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Delivered</div><div className="text-lg font-display font-semibold mt-1">{delivered}</div></Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Onboarded</div>
          <div className="text-sm font-medium mt-1">{client.onboardedAt ? new Date(client.onboardedAt).toLocaleDateString() : '—'}</div>
        </Card>
      </div>

      <Tabs defaultValue="tools" className="mt-8">
        <TabsList>
          <TabsTrigger value="tools"><Wrench className="h-4 w-4 mr-2"/>Agency Tools</TabsTrigger>
          <TabsTrigger value="work-orders"><FileText className="h-4 w-4 mr-2"/>Work Orders ({orders.length})</TabsTrigger>
          <TabsTrigger value="prospects"><Sparkles className="h-4 w-4 mr-2"/>Prospects ({client.prospects.length})</TabsTrigger>
          <TabsTrigger value="notes"><StickyNote className="h-4 w-4 mr-2"/>Notes ({client.clientNotes.length})</TabsTrigger>
          <TabsTrigger value="profile"><Edit3 className="h-4 w-4 mr-2"/>Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="tools" className="mt-6">
          <AgencyToolPanel client={{
            id: client.id, businessName: client.businessName, industry: client.industry, city: client.city, state: client.state,
          }} onWorkOrderCreated={handleNewWorkOrder} onOpenWorkOrder={(wo) => setActiveWorkOrder(wo)} />
        </TabsContent>

        <TabsContent value="prospects" className="mt-6 space-y-3">
          <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-medium">Client prospecting</div>
              <div className="text-sm text-muted-foreground">Run a focused Lead-Gen Manager search, then promote qualified prospects into Leads.</div>
            </div>
            <Link href={`/app/agency/chat?persona=lead-gen-manager&clientId=${client.id}`}>
              <Button>Run Prospect Search</Button>
            </Link>
          </Card>
          {client.prospects.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">No prospects persisted for this client yet.</Card>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {client.prospects.map((prospect) => <ProspectCard key={prospect.id} prospect={prospect} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="work-orders" className="mt-6">
          {orders.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              No work orders yet. Open the <strong>Agency Tools</strong> tab to generate the first deliverable.
            </Card>
          ) : (
            <div className="grid lg:grid-cols-2 gap-3">
              {orders.map(wo => (
                <Card key={wo.id} className="p-4 cursor-pointer hover:border-primary/50" onClick={() => setActiveWorkOrder(wo)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">{wo.type.replace(/_/g,' ')}</div>
                      <div className="font-medium truncate mt-0.5">{wo.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">{new Date(wo.createdAt).toLocaleString()}</div>
                    </div>
                    <Badge variant="outline" className={
                      wo.status === 'DELIVERED' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' :
                      wo.status === 'REVIEW' ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' :
                      wo.status === 'IN_PROGRESS' ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' :
                      'bg-slate-500/15 text-slate-300 border-slate-500/30'
                    }>{wo.status}</Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="notes" className="mt-6 space-y-4">
          <Card className="p-4">
            <Label className="text-xs">Add internal note</Label>
            <Textarea rows={3} placeholder="Strategy adjustments, call recap, blockers..." value={noteText} onChange={e => setNoteText(e.target.value)} />
            <div className="flex justify-end mt-2"><Button size="sm" disabled={busyNote} onClick={addNote}>{busyNote ? 'Saving…' : 'Save note'}</Button></div>
          </Card>
          <div className="space-y-2">
            {client.clientNotes.map(n => (
              <Card key={n.id} className="p-3 text-sm">
                <div className="text-[10px] text-muted-foreground mb-1">{n.author?.name ?? n.author?.email ?? 'Team'} • {new Date(n.createdAt).toLocaleString()}</div>
                <div className="whitespace-pre-wrap">{n.body}</div>
              </Card>
            ))}
            {client.clientNotes.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-6">No notes yet.</div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="profile" className="mt-6">
          <Card className="p-5 space-y-3 text-sm">
            <ProfileRow label="Owner" value={client.ownerName} />
            <ProfileRow label="Email" value={client.email} />
            <ProfileRow label="Phone" value={client.phone} />
            <ProfileRow label="Website" value={client.website} link />
            <ProfileRow label="Google Business Profile" value={client.gbpUrl} link />
            <ProfileRow label="Strategy brief" value={client.strategyBrief} block />
          </Card>
        </TabsContent>
      </Tabs>

      {activeWorkOrder && (
        <WorkOrderViewer
          workOrder={activeWorkOrder}
          onClose={() => setActiveWorkOrder(null)}
          onUpdated={(updated) => {
            setOptimisticOrders(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p))
            setActiveWorkOrder({ ...activeWorkOrder, ...updated })
          }}
          onDeleted={() => {
            setOptimisticOrders(prev => prev.filter(p => p.id !== activeWorkOrder.id))
            setActiveWorkOrder(null)
          }}
        />
      )}
    </Container>
  )
}

function ProspectCard({ prospect }: { prospect: Prospect }) {
  const name = [prospect.personFirstName, prospect.personLastName].filter(Boolean).join(' ')
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{prospect.source}</div>
          <div className="font-medium truncate">{name || prospect.companyName || 'Unnamed prospect'}</div>
          <div className="text-sm text-muted-foreground truncate">{prospect.personTitle || prospect.companyName || '—'}</div>
        </div>
        <Badge variant="outline" className={prospect.promotedToLeadId ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300' : ''}>
          {prospect.promotedToLeadId ? 'Promoted' : 'Prospect'}
        </Badge>
      </div>
      <div className="mt-3 grid gap-1 text-xs text-muted-foreground">
        <div>{prospect.personEmail ?? 'No email yet'}</div>
        <div>{prospect.companyDomain ?? prospect.companyName ?? 'No company domain'}</div>
        <div>{[prospect.city, prospect.state].filter(Boolean).join(', ') || 'No location'}</div>
      </div>
    </Card>
  )
}

function ProfileRow({ label, value, link, block }: { label: string; value: string | null; link?: boolean; block?: boolean }) {
  return (
    <div className={block ? '' : 'flex items-start justify-between gap-4'}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground shrink-0">{label}</div>
      <div className={block ? 'mt-1 whitespace-pre-wrap text-sm' : 'text-sm text-right break-all'}>
        {value ? (
          link ? <a href={value} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">{value}<ExternalLink className="h-3 w-3"/></a> : value
        ) : <span className="text-muted-foreground">—</span>}
      </div>
    </div>
  )
}
