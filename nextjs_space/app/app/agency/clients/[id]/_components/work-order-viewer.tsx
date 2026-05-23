'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Copy, CheckCircle2, Archive, FileDown, ShieldCheck } from 'lucide-react'

interface WorkOrderEvent {
  id: string
  type: string
  fromStatus: string | null
  toStatus: string | null
  notes: string | null
  createdAt: string
  actor?: { name: string | null; email: string | null } | null
}

interface WorkOrder {
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
  events?: WorkOrderEvent[]
}

async function readError(res: Response) {
  const body = await res.json().catch(() => ({}))
  return typeof body?.error === 'string' ? body.error : 'Request failed'
}

function statusClass(status: string) {
  if (status === 'DELIVERED') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
  if (status === 'REVIEW') return 'bg-amber-500/15 text-amber-300 border-amber-500/30'
  if (status === 'IN_PROGRESS') return 'bg-blue-500/15 text-blue-300 border-blue-500/30'
  return 'bg-slate-500/15 text-slate-300 border-slate-500/30'
}

function canDeliver(workOrder: WorkOrder) {
  return workOrder.approvalStatus === 'APPROVED' || workOrder.approvalStatus === 'NOT_REQUIRED'
}

function normalizeWorkOrder(item: WorkOrder): WorkOrder {
  return {
    ...item,
    evidenceLinks: Array.isArray(item.evidenceLinks) ? item.evidenceLinks : [],
    events: Array.isArray(item.events) ? item.events : [],
  }
}

export function WorkOrderViewer({ workOrder, onClose, onUpdated, onDeleted }: {
  workOrder: WorkOrder
  onClose: () => void
  onUpdated: (w: Partial<WorkOrder> & { id: string }) => void
  onDeleted: () => void
}) {
  const [current, setCurrent] = useState(() => normalizeWorkOrder(workOrder))
  const [content, setContent] = useState<string>(workOrder.outputMarkdown ?? '')
  const [loading, setLoading] = useState<boolean>(!workOrder.outputMarkdown)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    setCurrent(normalizeWorkOrder(workOrder))
    if (!workOrder.outputMarkdown) {
      setLoading(true)
      fetch(`/api/agency/work-orders/${workOrder.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (cancelled) return
          const item = data?.item as WorkOrder | undefined
          if (item) {
            const normalized = normalizeWorkOrder(item)
            setCurrent(normalized)
            setContent(normalized.outputMarkdown ?? '')
          }
          setLoading(false)
        })
        .catch(() => setLoading(false))
    } else {
      setContent(workOrder.outputMarkdown)
      setLoading(false)
    }
    return () => { cancelled = true }
  }, [workOrder])

  async function patch(body: Record<string, unknown>, success: string) {
    setBusy(true)
    try {
      const res = await fetch(`/api/agency/work-orders/${current.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(await readError(res))
      const data = await res.json()
      const item = normalizeWorkOrder(data.item as WorkOrder)
      setCurrent(item)
      setContent(item.outputMarkdown ?? '')
      onUpdated(item)
      toast.success(success)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Work order update failed')
    } finally {
      setBusy(false)
    }
  }

  async function archive() {
    if (!confirm('Archive this work order? It will remain in history.')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/agency/work-orders/${current.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await readError(res))
      const data = await res.json()
      if (data?.item) {
        const item = normalizeWorkOrder(data.item as WorkOrder)
        setCurrent(item)
        onUpdated(item)
      } else {
        onDeleted()
      }
      toast.success('Work order archived')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Archive failed')
    } finally {
      setBusy(false)
    }
  }

  function copy() {
    if (!content) return
    navigator.clipboard.writeText(content).then(() => toast.success('Copied to clipboard'))
  }

  function download() {
    if (!content) return
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${current.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">{current.type.replace(/_/g, ' ')}</span>
            <span>{current.title}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="outline" className={statusClass(current.status)}>{current.status.replace(/_/g, ' ')}</Badge>
          <Badge variant="outline">{current.approvalStatus.replace(/_/g, ' ')}</Badge>
          <span className="text-muted-foreground">{current.ownerKind.replace(/_/g, ' ')} • {current.priority}</span>
          {current.dueAt && <span className="text-muted-foreground">Due {new Date(current.dueAt).toLocaleDateString()}</span>}
          {current.generatedAt && <span className="text-muted-foreground">Generated {new Date(current.generatedAt).toLocaleString()}</span>}
        </div>

        {(current.evidenceLinks.length > 0 || current.clientSummary || current.internalNotes) && (
          <div className="grid gap-3 rounded-md border border-border bg-muted/30 p-3 text-xs md:grid-cols-3">
            {current.evidenceLinks.length > 0 && <div><div className="font-medium">Evidence</div>{current.evidenceLinks.map((link) => <div key={link} className="break-all text-muted-foreground">{link}</div>)}</div>}
            {current.clientSummary && <div><div className="font-medium">Client summary</div><div className="whitespace-pre-wrap text-muted-foreground">{current.clientSummary}</div></div>}
            {current.internalNotes && <div><div className="font-medium">Internal notes</div><div className="whitespace-pre-wrap text-muted-foreground">{current.internalNotes}</div></div>}
          </div>
        )}

        <div className="mt-3 flex-1 overflow-y-auto rounded-md border border-border bg-background/50 p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap">
          {loading ? 'Loading…' : (content || '(no output yet)')}
        </div>

        {current.events && current.events.length > 0 && (
          <div className="max-h-24 overflow-y-auto border-t pt-2 text-xs text-muted-foreground">
            {current.events.slice(0, 4).map((event) => (
              <div key={event.id}>{new Date(event.createdAt).toLocaleString()} • {event.type.replace(/_/g, ' ')}{event.toStatus ? ` → ${event.toStatus.replace(/_/g, ' ')}` : ''}</div>
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={copy} disabled={!content}><Copy className="mr-1 h-4 w-4" />Copy</Button>
            <Button size="sm" variant="outline" onClick={download} disabled={!content}><FileDown className="mr-1 h-4 w-4" />Download .md</Button>
            <Button size="sm" variant="ghost" onClick={archive} disabled={busy || current.status === 'ARCHIVED'} aria-label="Archive work order" title="Archive work order"><Archive className="h-4 w-4 text-rose-400" /></Button>
          </div>
          <div className="flex items-center gap-2">
            {current.approvalStatus === 'PENDING' && (
              <Button size="sm" variant="outline" onClick={() => patch({ approvalStatus: 'APPROVED', eventNotes: 'Human approval recorded before delivery.' }, 'Work order approved')} disabled={busy}>
                <ShieldCheck className="mr-1 h-4 w-4" />Approve
              </Button>
            )}
            {current.status !== 'REVIEW' && current.status !== 'DELIVERED' && current.status !== 'ARCHIVED' && (
              <Button size="sm" variant="outline" onClick={() => patch({ status: 'REVIEW' }, 'Moved to review')} disabled={busy}>Move to Review</Button>
            )}
            {current.status !== 'DELIVERED' && current.status !== 'ARCHIVED' && (
              <Button size="sm" onClick={() => patch({ status: 'DELIVERED' }, 'Marked delivered')} disabled={busy || !canDeliver(current)}>
                <CheckCircle2 className="mr-1 h-4 w-4" />Mark Delivered
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
