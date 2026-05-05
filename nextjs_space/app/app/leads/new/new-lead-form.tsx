'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  INDUSTRIES, REVENUE_RANGES, MARKETING_SPEND, EMPLOYEE_COUNT, LEAD_SOURCES,
} from '@/lib/types'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export function NewLeadForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    businessName: '', ownerName: '', email: '', phone: '',
    industry: 'HVAC', city: 'Indianapolis', state: 'IN', website: '',
    revenueRange: '1M-5M', currentMarketingSpend: '500-2000',
    employeeCount: '5-15', biggestPainPoint: '', currentProvider: '',
    source: 'MANUAL',
  })
  function up(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })) }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error ?? 'Failed to save lead')
        setLoading(false)
        return
      }
      toast.success(`Lead added • score ${data?.score ?? '—'}/100`)
      router.push(`/app/leads/${data?.leadId}`)
    } catch {
      toast.error('Failed to save')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Business name *</Label><Input required value={form.businessName} onChange={(e) => up('businessName', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Owner / contact *</Label><Input required value={form.ownerName} onChange={(e) => up('ownerName', e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Email *</Label><Input type="email" required value={form.email} onChange={(e) => up('email', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => up('phone', e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Industry</Label>
          <Select value={form.industry} onValueChange={(v) => up('industry', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{INDUSTRIES.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Source</Label>
          <Select value={form.source} onValueChange={(v) => up('source', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{LEAD_SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5"><Label>City</Label><Input value={form.city} onChange={(e) => up('city', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>State</Label><Input value={form.state} onChange={(e) => up('state', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Website</Label><Input value={form.website} onChange={(e) => up('website', e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label>Revenue</Label>
          <Select value={form.revenueRange} onValueChange={(v) => up('revenueRange', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{REVENUE_RANGES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Mktg spend</Label>
          <Select value={form.currentMarketingSpend} onValueChange={(v) => up('currentMarketingSpend', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{MARKETING_SPEND.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Team size</Label>
          <Select value={form.employeeCount} onValueChange={(v) => up('employeeCount', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{EMPLOYEE_COUNT.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5"><Label>Current provider</Label><Input value={form.currentProvider} onChange={(e) => up('currentProvider', e.target.value)} /></div>
      <div className="space-y-1.5"><Label>Pain point / context</Label><Textarea rows={3} value={form.biggestPainPoint} onChange={(e) => up('biggestPainPoint', e.target.value)} /></div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Lead'}
      </Button>
    </form>
  )
}
