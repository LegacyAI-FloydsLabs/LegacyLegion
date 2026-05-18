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
        <div className="space-y-1.5"><Label htmlFor="lead-business-name">Business name *</Label><Input id="lead-business-name" required value={form.businessName} onChange={(e) => up('businessName', e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="lead-owner-name">Owner / contact *</Label><Input id="lead-owner-name" required value={form.ownerName} onChange={(e) => up('ownerName', e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label htmlFor="lead-email">Email *</Label><Input id="lead-email" type="email" required value={form.email} onChange={(e) => up('email', e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="lead-phone">Phone</Label><Input id="lead-phone" value={form.phone} onChange={(e) => up('phone', e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="lead-industry">Industry</Label>
          <Select value={form.industry} onValueChange={(v) => up('industry', v)}>
            <SelectTrigger id="lead-industry" aria-label="Industry"><SelectValue /></SelectTrigger>
            <SelectContent>{INDUSTRIES.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lead-source">Source</Label>
          <Select value={form.source} onValueChange={(v) => up('source', v)}>
            <SelectTrigger id="lead-source" aria-label="Source"><SelectValue /></SelectTrigger>
            <SelectContent>{LEAD_SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5"><Label htmlFor="lead-city">City</Label><Input id="lead-city" value={form.city} onChange={(e) => up('city', e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="lead-state">State</Label><Input id="lead-state" value={form.state} onChange={(e) => up('state', e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="lead-website">Website</Label><Input id="lead-website" value={form.website} onChange={(e) => up('website', e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="lead-revenue-range">Revenue</Label>
          <Select value={form.revenueRange} onValueChange={(v) => up('revenueRange', v)}>
            <SelectTrigger id="lead-revenue-range" aria-label="Revenue"><SelectValue /></SelectTrigger>
            <SelectContent>{REVENUE_RANGES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lead-marketing-spend">Mktg spend</Label>
          <Select value={form.currentMarketingSpend} onValueChange={(v) => up('currentMarketingSpend', v)}>
            <SelectTrigger id="lead-marketing-spend" aria-label="Marketing spend"><SelectValue /></SelectTrigger>
            <SelectContent>{MARKETING_SPEND.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lead-team-size">Team size</Label>
          <Select value={form.employeeCount} onValueChange={(v) => up('employeeCount', v)}>
            <SelectTrigger id="lead-team-size" aria-label="Team size"><SelectValue /></SelectTrigger>
            <SelectContent>{EMPLOYEE_COUNT.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5"><Label htmlFor="lead-current-provider">Current provider</Label><Input id="lead-current-provider" value={form.currentProvider} onChange={(e) => up('currentProvider', e.target.value)} /></div>
      <div className="space-y-1.5"><Label htmlFor="lead-pain-point">Pain point / context</Label><Textarea id="lead-pain-point" rows={3} value={form.biggestPainPoint} onChange={(e) => up('biggestPainPoint', e.target.value)} /></div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Lead'}
      </Button>
    </form>
  )
}
