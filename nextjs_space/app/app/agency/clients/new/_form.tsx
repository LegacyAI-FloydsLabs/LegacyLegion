'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Container } from '@/components/layouts/container'
import { PageHeader } from '@/components/layouts/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const INDUSTRIES = ['HVAC','PLUMBING','LEGAL','DENTAL','ROOFING','ELECTRICAL','LANDSCAPING','AUTO_REPAIR','HEALTHCARE','OTHER']
const TIERS = ['LAUNCH_PAD','GROWTH_ENGINE','MARKET_DOMINATOR']

export function NewClientForm() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    businessName: '', ownerName: '', email: '', phone: '',
    industry: 'HVAC', city: 'Indianapolis', state: 'IN',
    website: '', gbpUrl: '', tier: 'LAUNCH_PAD', monthlyMRR: '750',
    strategyBrief: '',
  })

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm(s => ({ ...s, [k]: v }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.businessName.trim()) { toast.error('Business name required'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/agency/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, monthlyMRR: Number(form.monthlyMRR) || 0 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'Failed')
      toast.success(`${data.client.businessName} added`)
      router.push(`/app/agency/clients/${data.client.id}`)
      router.refresh()
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not create client')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Container size="md">
      <PageHeader title="New Client" description="Add a service business that LegacyAI is now executing for." />
      <form onSubmit={onSubmit} className="mt-6 space-y-6">
        <Card className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>Business name *</Label><Input value={form.businessName} onChange={e => update('businessName', e.target.value)} /></div>
            <div>
              <Label>Industry *</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.industry} onChange={e => update('industry', e.target.value)}>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>Owner / primary contact</Label><Input value={form.ownerName} onChange={e => update('ownerName', e.target.value)} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => update('email', e.target.value)} /></div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => update('phone', e.target.value)} /></div>
            <div><Label>City</Label><Input value={form.city} onChange={e => update('city', e.target.value)} /></div>
            <div><Label>State</Label><Input value={form.state} onChange={e => update('state', e.target.value)} /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>Website</Label><Input placeholder="https://" value={form.website} onChange={e => update('website', e.target.value)} /></div>
            <div><Label>Google Business Profile URL</Label><Input placeholder="https://maps.google.com/..." value={form.gbpUrl} onChange={e => update('gbpUrl', e.target.value)} /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Tier</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.tier} onChange={e => update('tier', e.target.value)}>
                {TIERS.map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
              </select>
            </div>
            <div><Label>Monthly MRR ($)</Label><Input type="number" value={form.monthlyMRR} onChange={e => update('monthlyMRR', e.target.value)} /></div>
          </div>
          <div>
            <Label>Strategy brief</Label>
            <Textarea rows={4} placeholder="Top goals, target service areas, what they care about most..." value={form.strategyBrief} onChange={e => update('strategyBrief', e.target.value)} />
          </div>
        </Card>
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Create Client'}</Button>
        </div>
      </form>
    </Container>
  )
}
