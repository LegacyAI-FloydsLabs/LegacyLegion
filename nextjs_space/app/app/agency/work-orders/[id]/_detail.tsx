'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { ArrowLeft, Archive, CheckCircle2, Copy, FileDown, ShieldCheck } from 'lucide-react'
import { Container } from '@/components/layouts/container'
import { PageHeader } from '@/components/layouts/page-header'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface WorkOrderEvent {
  id: string
  type: string
  fromStatus: string | null
  toStatus: string | null
  notes: string | null
  createdAt: string
  actor?: { name: string | null; email: string | null } | null
}

interface WorkOrderDetailModel {
  id: string
  type: string
  title: string
  status: string
  approvalStatus: string
  priority: string
  ownerKind: string
  ownerLabel: string | null
  dueAt: string | null
  outputMarkdown: string | null
  internalNotes: string | null
  clientSummary: string | null
  evidenceLinks: string[]
  createdAt: string
  generatedAt: string | null
  deliveredAt: string | null
  approvedAt: string | null
  client: { id: string; businessName: string; industry: string; city: string | null; state: string | null }
  author?: { name: string | null; email: string | null } | null
  events: WorkOrderEvent[]
}

function statusClass(status: string) {
  if (status === 'DELIVERED') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
  if (status === 'REVIEW') return 'bg-amber-500/15 text-amber-300 border-amber-500/30'
  if (status === 'IN_PROGRESS') return 'bg-blue-500/15 text-blue-300 border-blue-500/30'
  if (status === 'ARCHIVED') return 'bg-slate-500/15 text-slate-400 border-slate-500/30'
  return 'bg-slate-500/15 text-slate-300 border-slate-500/30'
}

function canDeliver(workOrder: WorkOrderDetailModel) {
  return workOrder.approvalStatus === 'APPROVED' || workOrder.approvalStatus === 'NOT_REQUIRED'
}

async function readError(res: Response) {
  const body = await res.json().catch(() => ({}))
  return typeof body?.error === 'string' ? body.error : 'Request failed'
}

function normalize(item: WorkOrderDetailModel): WorkOrderDetailModel {
  return {
    ...item,
    evidenceLinks: Array.isArray(item.evidenceLinks) ? item.evidenceLinks : [],
    events: Array.isArray(item.events) ? item.events : [],
  }
}

export function WorkOrderDetail({ initialWorkOrder }: { initialWorkOrder: WorkOrderDetailModel }) {
  const router = useRouter()
  const [workOrder, setWorkOrder] = useState(() => normalize(initialWorkOrder))
  const [busy, setBusy] = useState(false)
  const content = workOrder.outputMarkdown ?? ''

  async function patch(body: Record<string, unknown>, success: string) {
    setBusy(true)
    try {
      const res = await fetch(`/api/agency/work-orders/${workOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(await readError(res))
      const data = await res.json()
      setWorkOrder(normalize(data.item as WorkOrderDetailModel))
      toast.success(success)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Work order update failed')
    } finally {
      setBusy(false)
    }
  }

  async function archive() {
    if (!confirm('Archive this work order? It remains in history and reports.')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/agency/work-orders/${workOrder.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await readError(res))
      const data = await res.json()
      if (data?.item) setWorkOrder(normalize(data.item as WorkOrderDetailModel))
      toast.success('Work order archived')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Archive failed')
    } finally {
      setBusy(false)
    }
  }

  function copy() {
    if (!content) return
    navigator.clipboard.writeText(content).then(() => toast.success('Copied work order output'))
  }

  function download() {
    if (!content) return
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${workOrder.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'work-order'}.md`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <Container size="xl">
      <div className="mb-3">
        <Link href="/app/agency/work-orders" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" />Back to work orders</Link>
      </div>
      <PageHeader
        title={workOrder.title}
        description={`${workOrder.client.businessName} • ${workOrder.type.replace(/_/g, ' ')}`}
        actions={<Link href={`/app/agency/clients/${workOrder.client.id}`}><Button variant="outline" size="sm">Open client</Button></Link>}
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <Card className="p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline" className={statusClass(workOrder.status)}>{workOrder.status.replace(/_/g, ' ')}</Badge>
              <Badge variant="outline">{workOrder.approvalStatus.replace(/_/g, ' ')}</Badge>
              <span className="text-muted-foreground">{workOrder.ownerKind.replace(/_/g, ' ')} • {workOrder.priority}</span>
              {workOrder.dueAt && <span className="text-muted-foreground">Due {new Date(workOrder.dueAt).toLocaleDateString()}</span>}
            </div>
            <div className="min-h-[360px] whitespace-pre-wrap rounded-md border border-border bg-background/50 p-4 font-mono text-sm leading-relaxed">
              {content || '(no deliverable output yet)'}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={copy} disabled={!content}><Copy className="mr-1 h-4 w-4" />Copy</Button>
              <Button size="sm" variant="outline" onClick={download} disabled={!content}><FileDown className="mr-1 h-4 w-4" />Download .md</Button>
              <Button size="sm" variant="ghost" onClick={archive} disabled={busy || workOrder.status === 'ARCHIVED'} aria-label="Archive work order" title="Archive work order"><Archive className="h-4 w-4 text-rose-400" /></Button>
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-3 font-medium">History / audit trail</div>
            <div className="space-y-2 text-sm text-muted-foreground">
              {workOrder.events.length === 0 && <div>No history yet.</div>}
              {workOrder.events.map((event) => (
                <div key={event.id} className="rounded-md border border-border p-3">
                  <div>{new Date(event.createdAt).toLocaleString()} • {event.actor?.name ?? event.actor?.email ?? 'Team'} • {event.type.replace(/_/g, ' ')}</div>
                  {event.toStatus && <div>→ {event.toStatus.replace(/_/g, ' ')}</div>}
                  {event.notes && <div className="mt-1 whitespace-pre-wrap">{event.notes}</div>}
                </div>
              ))}
            </div>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="p-4">
            <div className="font-medium">Delivery controls</div>
            <div className="mt-3 flex flex-col gap-2">
              {workOrder.approvalStatus === 'PENDING' && (
                <Button size="sm" variant="outline" onClick={() => patch({ approvalStatus: 'APPROVED', eventNotes: 'Human approval recorded before delivery.' }, 'Work order approved')} disabled={busy}>
                  <ShieldCheck className="mr-1 h-4 w-4" />Approve
                </Button>
              )}
              {workOrder.status !== 'REVIEW' && workOrder.status !== 'DELIVERED' && workOrder.status !== 'ARCHIVED' && (
                <Button size="sm" variant="outline" onClick={() => patch({ status: 'REVIEW' }, 'Moved to review')} disabled={busy}>Move to Review</Button>
              )}
              {workOrder.status !== 'DELIVERED' && workOrder.status !== 'ARCHIVED' && (
                <Button size="sm" onClick={() => patch({ status: 'DELIVERED' }, 'Marked delivered')} disabled={busy || !canDeliver(workOrder)}>
                  <CheckCircle2 className="mr-1 h-4 w-4" />Mark Delivered
                </Button>
              )}
              {!canDeliver(workOrder) && <p className="text-xs text-amber-300">Human approval is required before delivery.</p>}
            </div>
          </Card>

          <Card className="p-4 text-sm">
            <div className="font-medium">Client-facing summary</div>
            <div className="mt-2 whitespace-pre-wrap text-muted-foreground">{workOrder.clientSummary || 'No client-safe summary yet.'}</div>
          </Card>
          <Card className="p-4 text-sm">
            <div className="font-medium">Internal notes</div>
            <div className="mt-2 whitespace-pre-wrap text-muted-foreground">{workOrder.internalNotes || 'No internal notes yet.'}</div>
          </Card>
          <Card className="p-4 text-sm">
            <div className="font-medium">Evidence</div>
            <div className="mt-2 space-y-1 text-muted-foreground">
              {workOrder.evidenceLinks.length === 0 && <div>No evidence links yet.</div>}
              {workOrder.evidenceLinks.map((link) => <div key={link} className="break-all">{link}</div>)}
            </div>
          </Card>
        </aside>
      </div>
    </Container>
  )
}
