'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Plus, Filter } from 'lucide-react'
import {
  PIPELINE_STAGES, INDUSTRIES, LEAD_SOURCES,
  stageColor, stageLabel, industryLabel, sourceLabel,
} from '@/lib/types'

interface LeadRow {
  id: string
  businessName: string
  ownerName: string
  email: string
  phone: string | null
  industry: string
  status: string
  source: string
  score: number
  qualification: string | null
  proposedTier: string | null
  estimatedMRR: number | null
  signedMRR: number | null
  city: string | null
  state: string | null
  createdAt: string
  assignedTo: { id: string; name: string | null; email: string } | null
}

export function LeadsList({ leads }: { leads: LeadRow[] }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('ALL')
  const [industry, setIndustry] = useState<string>('ALL')
  const [source, setSource] = useState<string>('ALL')

  const filtered = useMemo(() => {
    return (leads ?? []).filter((l) => {
      if (status !== 'ALL' && l.status !== status) return false
      if (industry !== 'ALL' && l.industry !== industry) return false
      if (source !== 'ALL' && l.source !== source) return false
      if (search) {
        const q = search.toLowerCase()
        if (!(l.businessName?.toLowerCase()?.includes(q) || l.ownerName?.toLowerCase()?.includes(q) || l.email?.toLowerCase()?.includes(q))) return false
      }
      return true
    })
  }, [leads, search, status, industry, source])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground mt-1">All leads across every channel.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/app/leads/new"><Button><Plus className="h-4 w-4 mr-1" /> Add Lead</Button></Link>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 flex-1 min-w-[260px]">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input placeholder="Search business, owner, or email…" value={search} onChange={(e) => setSearch(e.target.value)} className="border-0 bg-transparent focus-visible:ring-0" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-[150px]"><Filter className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Stages</SelectItem>
                  {PIPELINE_STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Industries</SelectItem>
                  {INDUSTRIES.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Sources</SelectItem>
                  {LEAD_SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-card">
                <tr className="border-b border-border">
                  <th className="text-left font-medium px-5 py-3">Business</th>
                  <th className="text-left font-medium px-5 py-3">Industry</th>
                  <th className="text-left font-medium px-5 py-3">Source</th>
                  <th className="text-left font-medium px-5 py-3">Stage</th>
                  <th className="text-left font-medium px-5 py-3">Owner</th>
                  <th className="text-right font-medium px-5 py-3">MRR</th>
                  <th className="text-right font-medium px-5 py-3">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/app/leads/${l.id}`} className="font-medium hover:text-primary">{l.businessName}</Link>
                      <div className="text-xs text-muted-foreground">{l.ownerName} • {l.email}</div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{industryLabel(l.industry)}</td>
                    <td className="px-5 py-3 text-muted-foreground">{sourceLabel(l.source)}</td>
                    <td className="px-5 py-3"><Badge className={stageColor(l.status)} variant="outline">{stageLabel(l.status)}</Badge></td>
                    <td className="px-5 py-3 text-muted-foreground text-xs">{l.assignedTo?.name ?? l.assignedTo?.email ?? <span className="opacity-50">unassigned</span>}</td>
                    <td className="px-5 py-3 text-right font-mono">${(l.estimatedMRR ?? 0).toLocaleString()}</td>
                    <td className="px-5 py-3 text-right font-mono font-semibold">{l.score}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">No leads match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
