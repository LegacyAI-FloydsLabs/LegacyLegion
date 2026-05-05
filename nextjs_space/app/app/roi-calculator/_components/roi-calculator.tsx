'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import { TrendingUp } from 'lucide-react'

const TIERS = [
  { value: 'LAUNCH_PAD', label: 'Launch Pad ($750/mo)', cost: 750 },
  { value: 'GROWTH_ENGINE', label: 'Growth Engine ($2,000/mo)', cost: 2000 },
  { value: 'MARKET_DOMINATOR', label: 'Market Dominator ($4,000/mo)', cost: 4000 },
]

export function ROICalculator() {
  const [tier, setTier] = useState('GROWTH_ENGINE')
  const [avgJobValue, setAvgJobValue] = useState(2500)
  const [closeRate, setCloseRate] = useState(25) // %
  const [extraLeads, setExtraLeads] = useState(15) // /mo
  const cost = TIERS.find(t => t.value === tier)?.cost ?? 0

  const result = useMemo(() => {
    const closes = (extraLeads * closeRate) / 100
    const monthlyRevenue = closes * avgJobValue
    const annualRevenue = monthlyRevenue * 12
    const annualCost = cost * 12
    const roi = annualCost > 0 ? Math.round(((annualRevenue - annualCost) / annualCost) * 100) : 0
    const breakEvenLeads = avgJobValue > 0 && closeRate > 0 ? Math.ceil(cost / (avgJobValue * (closeRate / 100))) : 0
    return { closes, monthlyRevenue, annualRevenue, annualCost, roi, breakEvenLeads }
  }, [tier, avgJobValue, closeRate, extraLeads, cost])

  const chartData = [
    { month: 'Mo 1', revenue: result.monthlyRevenue, cost },
    { month: 'Mo 3', revenue: result.monthlyRevenue * 3, cost: cost * 3 },
    { month: 'Mo 6', revenue: result.monthlyRevenue * 6, cost: cost * 6 },
    { month: 'Mo 12', revenue: result.annualRevenue, cost: result.annualCost },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-5">
      <Card><CardContent className="p-5 space-y-4">
        <div className="space-y-2">
          <Label>LegacyAI Tier</Label>
          <Select value={tier} onValueChange={setTier}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TIERS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between"><Label>Average job value</Label><span className="font-mono text-sm">${avgJobValue.toLocaleString()}</span></div>
          <Input type="number" value={avgJobValue} onChange={(e) => setAvgJobValue(Math.max(0, Number(e.target.value || 0)))} />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between"><Label>Close rate</Label><span className="font-mono text-sm">{closeRate}%</span></div>
          <Slider value={[closeRate]} onValueChange={(v) => setCloseRate(v?.[0] ?? 25)} max={80} step={1} />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between"><Label>Extra leads / month</Label><span className="font-mono text-sm">{extraLeads}</span></div>
          <Slider value={[extraLeads]} onValueChange={(v) => setExtraLeads(v?.[0] ?? 15)} max={100} step={1} />
        </div>
        <p className="text-xs text-muted-foreground pt-2">Tweak the inputs while you’re on the call. The numbers update instantly.</p>
      </CardContent></Card>

      <Card><CardContent className="p-5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary"><TrendingUp className="h-3.5 w-3.5" /> Projected Annual ROI</div>
        <div className="font-display text-5xl font-bold mt-2">{result.roi}%</div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-md bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Extra revenue / mo</div><div className="font-display text-xl font-bold">${Math.round(result.monthlyRevenue).toLocaleString()}</div></div>
          <div className="rounded-md bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Extra revenue / yr</div><div className="font-display text-xl font-bold">${Math.round(result.annualRevenue).toLocaleString()}</div></div>
          <div className="rounded-md bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Annual cost</div><div className="font-display text-xl font-bold">${result.annualCost.toLocaleString()}</div></div>
          <div className="rounded-md bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Break-even / mo</div><div className="font-display text-xl font-bold">{result.breakEvenLeads} jobs</div></div>
        </div>
        <div className="h-[220px] w-full mt-5">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
              <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} formatter={(v: number) => `$${v.toLocaleString()}`} />
              <Bar dataKey="revenue" fill="#7C3AED" name="Revenue" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cost" fill="#475569" name="Cost" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent></Card>
    </div>
  )
}
