'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PIPELINE_STAGES, stageLabel, industryLabel } from '@/lib/types'
import { GripVertical } from 'lucide-react'
import { toast } from 'sonner'

interface LeadCard {
  id: string
  businessName: string
  ownerName: string
  industry: string
  status: string
  score: number
  qualification: string | null
  proposedTier: string | null
  estimatedMRR: number | null
  city: string | null
  source: string
  createdAt: string
}

export function Pipeline({ leads: initial }: { leads: LeadCard[] }) {
  const router = useRouter()
  const [leads, setLeads] = useState<LeadCard[]>(initial ?? [])
  const [dragId, setDragId] = useState<string | null>(null)

  const grouped = useMemo(() => {
    const map = new Map<string, LeadCard[]>()
    for (const s of PIPELINE_STAGES) map.set(s.value, [])
    for (const l of leads ?? []) {
      const arr = map.get(l.status) ?? map.get('NEW')!
      arr.push(l)
    }
    return map
  }, [leads])

  async function moveTo(leadId: string, newStatus: string) {
    const before = leads.find(l => l.id === leadId)
    if (!before || before.status === newStatus) return
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l))
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        toast.error('Failed to update stage')
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: before.status } : l))
        return
      }
      toast.success(`Moved to ${stageLabel(newStatus)}`)
      router.refresh()
    } catch {
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: before.status } : l))
      toast.error('Network error')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Pipeline</h1>
        <p className="text-muted-foreground mt-1">Drag cards between stages. Each move logs an activity.</p>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4">
        {PIPELINE_STAGES.map((stage) => {
          const items = grouped.get(stage.value) ?? []
          const total = items.reduce((s, i) => s + (i.estimatedMRR ?? 0), 0)
          return (
            <div
              key={stage.value}
              className="flex-shrink-0 w-72 rounded-lg border border-border bg-card/40"
              onDragOver={(e) => { e.preventDefault() }}
              onDrop={(e) => {
                e.preventDefault()
                const id = e.dataTransfer.getData('text/plain')
                if (id) moveTo(id, stage.value)
                setDragId(null)
              }}
            >
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={stage.color} variant="outline">{stage.label}</Badge>
                  <span className="text-xs text-muted-foreground">{items.length}</span>
                </div>
                <span className="font-mono text-xs text-muted-foreground">${total.toLocaleString()}</span>
              </div>
              <div className="p-2 space-y-2 min-h-[400px]">
                {items.map((l) => (
                  <Link key={l.id} href={`/app/leads/${l.id}`} aria-label={`Open lead ${l.businessName}`}>
                    <Card
                      draggable
                      onDragStart={(e) => { e.dataTransfer.setData('text/plain', l.id); setDragId(l.id) }}
                      onDragEnd={() => setDragId(null)}
                      className={`cursor-grab transition-all ${dragId === l.id ? 'opacity-40' : 'hover:border-primary/40 hover:shadow-md'}`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <GripVertical className="h-4 w-4 mt-0.5 text-muted-foreground/40 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm truncate">{l.businessName}</div>
                            <div className="text-xs text-muted-foreground truncate">{l.ownerName}</div>
                            <div className="mt-2 flex items-center justify-between">
                              <Badge variant="secondary" className="text-[10px]">{industryLabel(l.industry)}</Badge>
                              <div className="font-mono text-xs font-semibold text-primary">{l.score}</div>
                            </div>
                            {l.estimatedMRR ? <div className="mt-1 text-xs text-muted-foreground">${l.estimatedMRR.toLocaleString()}/mo</div> : null}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
                {items.length === 0 && <div className="text-xs text-muted-foreground text-center py-6">Drop leads here</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
