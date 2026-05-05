'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Container } from '@/components/layouts/container'
import { PageHeader } from '@/components/layouts/page-header'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ClipboardList } from 'lucide-react'

interface Item {
  id: string
  type: string
  title: string
  status: string
  createdAt: string
  generatedAt: string | null
  deliveredAt: string | null
  client: { id: string; businessName: string; industry: string }
  author: { name: string | null; email: string | null } | null
}

export function WorkOrdersList({ items }: { items: Item[] }) {
  const [filter, setFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  const filtered = useMemo(() => items.filter(i => {
    if (statusFilter !== 'ALL' && i.status !== statusFilter) return false
    if (filter && !`${i.title} ${i.client.businessName} ${i.type}`.toLowerCase().includes(filter.toLowerCase())) return false
    return true
  }), [items, filter, statusFilter])

  const statuses = ['ALL','IN_PROGRESS','REVIEW','DELIVERED','DRAFT','ARCHIVED']

  return (
    <Container size="xl">
      <PageHeader title="Work Orders" description="Every deliverable LegacyAI has generated for clients." actions={<Badge variant="outline">{items.length} total</Badge>} />
      <div className="flex flex-wrap items-center gap-3 mt-6">
        <Input className="max-w-sm" placeholder="Search by client, title, type…" value={filter} onChange={e => setFilter(e.target.value)} />
        <div className="flex flex-wrap gap-1">
          {statuses.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`text-xs px-2.5 py-1 rounded-md border ${statusFilter === s ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:text-foreground'}`}>
              {s.replace(/_/g,' ')}
            </button>
          ))}
        </div>
      </div>
      <Card className="mt-4 divide-y divide-border">
        {filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <ClipboardList className="h-6 w-6 mx-auto mb-2"/>
            No work orders match.
          </div>
        )}
        {filtered.map(i => (
          <Link key={i.id} href={`/app/agency/clients/${i.client.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/50 transition-colors">
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{i.type.replace(/_/g,' ')} • {i.client.businessName}</div>
              <div className="font-medium truncate">{i.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{new Date(i.createdAt).toLocaleString()}</div>
            </div>
            <Badge variant="outline" className={
              i.status === 'DELIVERED' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' :
              i.status === 'REVIEW' ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' :
              i.status === 'IN_PROGRESS' ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' :
              'bg-slate-500/15 text-slate-300 border-slate-500/30'
            }>{i.status}</Badge>
          </Link>
        ))}
      </Card>
    </Container>
  )
}
