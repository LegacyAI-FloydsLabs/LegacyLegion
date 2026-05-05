'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Activity, ArrowUpRight, BarChart3, ChevronRight, DollarSign,
  Flame, Network, Trophy, Users,
} from 'lucide-react'
import { stageColor, stageLabel, sourceLabel, industryLabel, PIPELINE_STAGES } from '@/lib/types'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, Legend } from 'recharts'

interface LeadLite {
  id: string
  businessName: string
  ownerName: string
  email: string
  industry: string
  status: string
  source: string
  score: number
  qualification: string | null
  proposedTier: string | null
  estimatedMRR: number | null
  signedMRR: number | null
  createdAt: string
  city: string | null
  state: string | null
}

function formatMoney(n: number) { return `$${(n ?? 0).toLocaleString()}` }

export function DashboardClient({
  leads, stats,
}: {
  leads: LeadLite[]
  stats: { total: number; won: number; lost: number; active: number; winRate: number; pipelineValue: number; wonMRR: number; partners: number }
}) {
  const series = useMemo(() => {
    const days = 14
    const now = new Date()
    const buckets: { date: string; leads: number; mrr: number }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      buckets.push({ date: key, leads: 0, mrr: 0 })
    }
    for (const l of leads ?? []) {
      const day = (l?.createdAt ?? '').slice(0, 10)
      const b = buckets.find(x => x.date === day)
      if (b) {
        b.leads += 1
        b.mrr += l?.estimatedMRR ?? 0
      }
    }
    return buckets.map(b => ({ ...b, label: b.date.slice(5) }))
  }, [leads])

  const byStage = useMemo(() => {
    return PIPELINE_STAGES.map(s => ({
      stage: s.label,
      count: (leads ?? []).filter(l => l.status === s.value).length,
    }))
  }, [leads])

  const bySource = useMemo(() => {
    const map = new Map<string, number>()
    for (const l of leads ?? []) map.set(l.source, (map.get(l.source) ?? 0) + 1)
    return Array.from(map.entries()).map(([source, count]) => ({ source: sourceLabel(source), count }))
  }, [leads])

  const recent = (leads ?? []).slice(0, 8)
  const hot = (leads ?? []).filter(l => l.status !== 'WON' && l.status !== 'LOST').sort((a, b) => (b?.score ?? 0) - (a?.score ?? 0)).slice(0, 5)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Command Center</h1>
          <p className="text-muted-foreground mt-1">Live snapshot of your pipeline, lead flow, and AI activity.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/app/leads/new"><Button>Add Lead</Button></Link>
          <Link href="/app/import"><Button variant="outline">Import CSV</Button></Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Leads', value: stats.total, icon: Users, accent: 'text-primary' },
          { label: 'Active Pipeline', value: stats.active, icon: Activity, accent: 'text-cyan-300' },
          { label: 'Win Rate', value: `${stats.winRate}%`, icon: Trophy, accent: 'text-emerald-300' },
          { label: 'Pipeline MRR', value: formatMoney(stats.pipelineValue), icon: DollarSign, accent: 'text-amber-300' },
        ].map((kpi) => (
          <Card key={kpi.label} className="transition-all hover:shadow-lg hover:-translate-y-0.5">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">{kpi.label}</span>
                <kpi.icon className={`h-4 w-4 ${kpi.accent}`} />
              </div>
              <div className="mt-2 font-display text-3xl font-bold">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display text-lg font-semibold">Leads (last 14 days)</h3>
                <p className="text-xs text-muted-foreground">Daily intake across all channels</p>
              </div>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
                  <Area type="monotone" dataKey="leads" stroke="hsl(var(--chart-1))" fill="url(#gLeads)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display text-lg font-semibold">Pipeline by Stage</h3>
                <p className="text-xs text-muted-foreground">Distribution across the funnel</p>
              </div>
            </div>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byStage} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                  <YAxis type="category" dataKey="stage" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={88} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold flex items-center gap-2"><Flame className="h-4 w-4 text-amber-300" /> Hot Leads</h3>
              <Link href="/app/leads" className="text-xs text-primary hover:underline flex items-center gap-1">View all <ChevronRight className="h-3 w-3" /></Link>
            </div>
            <div className="space-y-2">
              {hot.length === 0 && <p className="text-sm text-muted-foreground">No active leads yet.</p>}
              {hot.map((l) => (
                <Link key={l.id} href={`/app/leads/${l.id}`} className="flex items-center justify-between rounded-lg border border-border bg-card/40 px-3 py-2.5 hover:bg-muted transition-colors">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{l.businessName}</div>
                    <div className="text-xs text-muted-foreground truncate">{industryLabel(l.industry)} • {l.city ?? '—'}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={stageColor(l.status)} variant="outline">{stageLabel(l.status)}</Badge>
                    <div className="font-mono text-sm font-semibold text-primary">{l.score}</div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold">By Channel</h3>
              <Network className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bySource} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                  <XAxis dataKey="source" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} interval={0} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-semibold">Recent Leads</h3>
            <Link href="/app/leads" className="text-xs text-primary hover:underline flex items-center gap-1">View all <ArrowUpRight className="h-3 w-3" /></Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="text-left font-medium pb-3">Business</th><th className="text-left font-medium pb-3">Industry</th><th className="text-left font-medium pb-3">Source</th><th className="text-left font-medium pb-3">Status</th><th className="text-right font-medium pb-3">Score</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recent.map((l) => (
                  <tr key={l.id} className="hover:bg-muted/50 transition-colors">
                    <td className="py-3"><Link href={`/app/leads/${l.id}`} className="font-medium hover:text-primary">{l.businessName}</Link><div className="text-xs text-muted-foreground">{l.ownerName}</div></td>
                    <td className="py-3 text-muted-foreground">{industryLabel(l.industry)}</td>
                    <td className="py-3 text-muted-foreground">{sourceLabel(l.source)}</td>
                    <td className="py-3"><Badge className={stageColor(l.status)} variant="outline">{stageLabel(l.status)}</Badge></td>
                    <td className="py-3 text-right font-mono font-semibold">{l.score}</td>
                  </tr>
                ))}
                {recent.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No leads yet — add one or share /get-started.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
