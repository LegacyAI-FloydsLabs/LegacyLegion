'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Legend,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts'
import { PIPELINE_STAGES, INDUSTRIES, LEAD_SOURCES, industryLabel, sourceLabel } from '@/lib/types'

interface LeadLite {
  id: string
  industry: string
  source: string
  status: string
  score: number
  estimatedMRR: number | null
  signedMRR: number | null
  createdAt: string
  lostReason: string | null
}

const CHART_COLORS = ['#7C3AED', '#06B6D4', '#F59E0B', '#10B981', '#F472B6', '#60A5FA', '#FB923C', '#A78BFA']

export function AnalyticsClient({ leads }: { leads: LeadLite[] }) {
  const series = useMemo(() => {
    const days = 30
    const buckets: { date: string; leads: number; mql: number; sql: number }[] = []
    const now = new Date()
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      buckets.push({ date: key, leads: 0, mql: 0, sql: 0 })
    }
    for (const l of leads ?? []) {
      const day = (l?.createdAt ?? '').slice(0, 10)
      const b = buckets.find(x => x.date === day)
      if (b) {
        b.leads += 1
        if ((l.score ?? 0) >= 70) b.sql += 1
        else if ((l.score ?? 0) >= 45) b.mql += 1
      }
    }
    return buckets.map(b => ({ ...b, label: b.date.slice(5) }))
  }, [leads])

  const funnel = useMemo(() => {
    return PIPELINE_STAGES.map(s => ({
      stage: s.label,
      count: (leads ?? []).filter(l => l.status === s.value).length,
    }))
  }, [leads])

  const byIndustry = useMemo(() => {
    return INDUSTRIES.map(i => ({
      industry: i.label,
      count: (leads ?? []).filter(l => l.industry === i.value).length,
    })).filter(x => x.count > 0)
  }, [leads])

  const bySource = useMemo(() => {
    return LEAD_SOURCES.map(s => {
      const items = (leads ?? []).filter(l => l.source === s.value)
      const wonItems = items.filter(l => l.status === 'WON')
      return {
        source: s.label,
        leads: items.length,
        won: wonItems.length,
        winRate: items.length > 0 ? Math.round((wonItems.length / items.length) * 100) : 0,
      }
    }).filter(x => x.leads > 0)
  }, [leads])

  const lostReasons = useMemo(() => {
    const map = new Map<string, number>()
    for (const l of (leads ?? []).filter(l => l.status === 'LOST')) {
      const reason = (l.lostReason && l.lostReason.trim()) || 'Unspecified'
      map.set(reason, (map.get(reason) ?? 0) + 1)
    }
    return Array.from(map.entries()).map(([reason, count]) => ({ reason, count }))
  }, [leads])

  const wonMRR = useMemo(() => (leads ?? []).filter(l => l.status === 'WON').reduce((s, l) => s + (l.signedMRR ?? l.estimatedMRR ?? 0), 0), [leads])
  const pipelineMRR = useMemo(() => (leads ?? []).filter(l => !['WON','LOST'].includes(l.status)).reduce((s, l) => s + (l.estimatedMRR ?? 0), 0), [leads])
  const avgScore = useMemo(() => {
    if ((leads?.length ?? 0) === 0) return 0
    return Math.round((leads ?? []).reduce((s, l) => s + (l.score ?? 0), 0) / leads.length)
  }, [leads])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-1">Funnel, channel, and industry performance.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Leads', value: (leads ?? []).length },
          { label: 'Avg Score', value: avgScore },
          { label: 'Pipeline MRR', value: `$${pipelineMRR.toLocaleString()}` },
          { label: 'Won MRR', value: `$${wonMRR.toLocaleString()}` },
        ].map((kpi) => (
          <Card key={kpi.label}><CardContent className="p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{kpi.label}</div>
            <div className="mt-2 font-display text-3xl font-bold">{kpi.value}</div>
          </CardContent></Card>
        ))}
      </div>

      <Card><CardContent className="p-5">
        <h3 className="font-display text-lg font-semibold mb-4">Leads over time (30 days)</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="a1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7C3AED" stopOpacity={0.5} /><stop offset="100%" stopColor="#7C3AED" stopOpacity={0} /></linearGradient>
                <linearGradient id="a2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#06B6D4" stopOpacity={0.4} /><stop offset="100%" stopColor="#06B6D4" stopOpacity={0} /></linearGradient>
                <linearGradient id="a3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10B981" stopOpacity={0.4} /><stop offset="100%" stopColor="#10B981" stopOpacity={0} /></linearGradient>
              </defs>
              <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} interval="preserveStartEnd" />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
              <Area type="monotone" dataKey="leads" stroke="#7C3AED" fill="url(#a1)" name="All leads" strokeWidth={2} />
              <Area type="monotone" dataKey="mql" stroke="#06B6D4" fill="url(#a2)" name="MQLs" strokeWidth={2} />
              <Area type="monotone" dataKey="sql" stroke="#10B981" fill="url(#a3)" name="SQLs" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent></Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card><CardContent className="p-5">
          <h3 className="font-display text-lg font-semibold mb-4">Conversion Funnel</h3>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnel} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                <YAxis type="category" dataKey="stage" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={92} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {funnel.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-5">
          <h3 className="font-display text-lg font-semibold mb-4">By Industry</h3>
          <div className="h-[280px] w-full">
            {byIndustry.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Legend verticalAlign="top" align="right" layout="vertical" wrapperStyle={{ fontSize: 11 }} />
                  <Pie data={byIndustry} dataKey="count" nameKey="industry" cx="40%" cy="50%" outerRadius={90} innerRadius={45} paddingAngle={2}>
                    {byIndustry.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center pt-20">No industry data yet.</p>}
          </div>
        </CardContent></Card>
      </div>

      <Card><CardContent className="p-5">
        <h3 className="font-display text-lg font-semibold mb-4">Channel Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="text-left font-medium pb-3">Source</th><th className="text-right font-medium pb-3">Leads</th><th className="text-right font-medium pb-3">Won</th><th className="text-right font-medium pb-3">Win Rate</th></tr></thead>
            <tbody className="divide-y divide-border">
              {bySource.map((s) => (
                <tr key={s.source}>
                  <td className="py-3">{s.source}</td>
                  <td className="py-3 text-right font-mono">{s.leads}</td>
                  <td className="py-3 text-right font-mono">{s.won}</td>
                  <td className="py-3 text-right font-mono">{s.winRate}%</td>
                </tr>
              ))}
              {bySource.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No channel data yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent></Card>

      {lostReasons.length > 0 && (
        <Card><CardContent className="p-5">
          <h3 className="font-display text-lg font-semibold mb-4">Loss Reasons</h3>
          <div className="space-y-2">
            {lostReasons.map((r) => (
              <div key={r.reason} className="flex items-center justify-between text-sm">
                <span>{r.reason}</span>
                <span className="font-mono text-muted-foreground">{r.count}</span>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}
    </div>
  )
}
