'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Copy, CheckCircle2, Trash2, FileDown } from 'lucide-react'

interface WorkOrder {
  id: string
  type: string
  title: string
  status: string
  outputMarkdown: string | null
  createdAt: string
  generatedAt: string | null
  deliveredAt: string | null
}

export function WorkOrderViewer({ workOrder, onClose, onUpdated, onDeleted }: {
  workOrder: WorkOrder
  onClose: () => void
  onUpdated: (w: Partial<WorkOrder> & { id: string }) => void
  onDeleted: () => void
}) {
  const [content, setContent] = useState<string>(workOrder.outputMarkdown ?? '')
  const [loading, setLoading] = useState<boolean>(!workOrder.outputMarkdown)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!workOrder.outputMarkdown) {
      setLoading(true)
      fetch(`/api/agency/work-orders/${workOrder.id}`)
        .then(r => r.json())
        .then(d => {
          if (cancelled) return
          setContent(d?.item?.outputMarkdown ?? '')
          setLoading(false)
        })
        .catch(() => setLoading(false))
    } else {
      setContent(workOrder.outputMarkdown)
      setLoading(false)
    }
    return () => { cancelled = true }
  }, [workOrder.id, workOrder.outputMarkdown])

  async function setStatus(status: string) {
    setBusy(true)
    try {
      const res = await fetch(`/api/agency/work-orders/${workOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error()
      onUpdated({ id: workOrder.id, status })
      toast.success(`Marked ${status}`)
    } catch { toast.error('Failed') } finally { setBusy(false) }
  }

  async function del() {
    if (!confirm('Delete this work order?')) return
    const res = await fetch(`/api/agency/work-orders/${workOrder.id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Deleted'); onDeleted() } else toast.error('Failed')
  }

  function copy() {
    if (!content) return
    navigator.clipboard.writeText(content).then(() => toast.success('Copied to clipboard'))
  }

  function download() {
    if (!content) return
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${workOrder.title.replace(/[^a-z0-9]/gi,'_').toLowerCase()}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">{workOrder.type.replace(/_/g,' ')}</span>
            <span>{workOrder.title}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <Badge variant="outline" className={
            workOrder.status === 'DELIVERED' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' :
            workOrder.status === 'REVIEW' ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' :
            'bg-slate-500/15 text-slate-300 border-slate-500/30'
          }>{workOrder.status}</Badge>
          {workOrder.generatedAt && <span className="text-muted-foreground">Generated {new Date(workOrder.generatedAt).toLocaleString()}</span>}
        </div>

        <div className="flex-1 overflow-y-auto mt-3 p-4 rounded-md border border-border bg-background/50 text-sm whitespace-pre-wrap font-mono leading-relaxed">
          {loading ? 'Loading…' : (content || '(no output yet)')}
        </div>

        <div className="flex items-center justify-between gap-2 pt-3 border-t mt-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={copy} disabled={!content}><Copy className="h-4 w-4 mr-1"/>Copy</Button>
            <Button size="sm" variant="outline" onClick={download} disabled={!content}><FileDown className="h-4 w-4 mr-1"/>Download .md</Button>
            <Button size="sm" variant="ghost" onClick={del} disabled={busy}><Trash2 className="h-4 w-4 text-rose-400"/></Button>
          </div>
          <div className="flex items-center gap-2">
            {workOrder.status !== 'DELIVERED' && (
              <Button size="sm" onClick={() => setStatus('DELIVERED')} disabled={busy}><CheckCircle2 className="h-4 w-4 mr-1"/>Mark Delivered</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
