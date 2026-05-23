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

type ClientForm = {
  businessName: string
  ownerName: string
  email: string
  phone: string
  industry: string
  city: string
  state: string
  website: string
  gbpUrl: string
  tier: string
  monthlyMRR: string
  strategyBrief: string
}

type FieldErrors = Partial<Record<keyof ClientForm, string>>

const initialForm: ClientForm = {
  businessName: '',
  ownerName: '',
  email: '',
  phone: '',
  industry: 'HVAC',
  city: 'Indianapolis',
  state: 'IN',
  website: '',
  gbpUrl: '',
  tier: 'LAUNCH_PAD',
  monthlyMRR: '750',
  strategyBrief: '',
}

function validate(form: ClientForm): FieldErrors {
  const errors: FieldErrors = {}
  if (!form.businessName.trim()) errors.businessName = 'Business name is required.'
  if (!form.industry.trim()) errors.industry = 'Industry is required.'
  if (!form.ownerName.trim()) errors.ownerName = 'Owner or primary contact is required.'
  if (!form.email.trim()) errors.email = 'Email is required.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Enter a valid email address.'
  if (!form.phone.trim()) errors.phone = 'Phone is required.'
  if (!form.city.trim()) errors.city = 'City is required.'
  if (!form.state.trim()) errors.state = 'State is required.'
  if (!form.website.trim()) errors.website = 'Website is required.'
  if (!form.gbpUrl.trim()) errors.gbpUrl = 'Google Business Profile URL is required.'
  if (!form.tier.trim()) errors.tier = 'Service tier is required.'
  const mrr = Number(form.monthlyMRR)
  if (!Number.isFinite(mrr) || mrr < 0) errors.monthlyMRR = 'Monthly retainer must be zero or greater.'
  if (!form.strategyBrief.trim()) errors.strategyBrief = 'Strategy brief is required.'
  return errors
}

export function NewClientForm() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [form, setForm] = useState<ClientForm>(initialForm)

  function update<K extends keyof ClientForm>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    const nextErrors = validate(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      toast.error('Fix the highlighted client fields.')
      return
    }

    setBusy(true)
    try {
      const res = await fetch('/api/agency/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, monthlyMRR: Number(form.monthlyMRR) || 0 }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 409 && data?.client?.id) {
        toast.error('Client already exists. Opening existing workspace.')
        router.push(`/app/agency/clients/${data.client.id}`)
        router.refresh()
        return
      }
      if (!res.ok) {
        setErrors(data?.fieldErrors ?? {})
        throw new Error(data?.error ?? 'Could not create client')
      }
      toast.success(`${data.client.businessName} added`)
      router.push(`/app/agency/clients/${data.client.id}`)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create client')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Container size="md">
      <PageHeader title="New Client" description="Add a service business that LegacyAI is now executing for." />
      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-6">
        {Object.keys(errors).length > 0 && (
          <Card className="border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            Complete the highlighted fields before creating this client.
          </Card>
        )}
        <Card className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Business name *" id="client-business-name" error={errors.businessName}>
              <Input id="client-business-name" aria-invalid={Boolean(errors.businessName)} aria-describedby={errors.businessName ? 'client-business-name-error' : undefined} value={form.businessName} onChange={(event) => update('businessName', event.target.value)} />
            </Field>
            <Field label="Industry *" id="client-industry" error={errors.industry}>
              <select id="client-industry" aria-invalid={Boolean(errors.industry)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.industry} onChange={(event) => update('industry', event.target.value)}>
                {INDUSTRIES.map((industry) => <option key={industry} value={industry}>{industry}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Owner / primary contact *" id="client-owner-name" error={errors.ownerName}><Input id="client-owner-name" aria-invalid={Boolean(errors.ownerName)} aria-describedby={errors.ownerName ? 'client-owner-name-error' : undefined} value={form.ownerName} onChange={(event) => update('ownerName', event.target.value)} /></Field>
            <Field label="Email *" id="client-email" error={errors.email}><Input id="client-email" type="email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'client-email-error' : undefined} value={form.email} onChange={(event) => update('email', event.target.value)} /></Field>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Phone *" id="client-phone" error={errors.phone}><Input id="client-phone" aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'client-phone-error' : undefined} value={form.phone} onChange={(event) => update('phone', event.target.value)} /></Field>
            <Field label="City *" id="client-city" error={errors.city}><Input id="client-city" aria-invalid={Boolean(errors.city)} aria-describedby={errors.city ? 'client-city-error' : undefined} value={form.city} onChange={(event) => update('city', event.target.value)} /></Field>
            <Field label="State *" id="client-state" error={errors.state}><Input id="client-state" aria-invalid={Boolean(errors.state)} aria-describedby={errors.state ? 'client-state-error' : undefined} value={form.state} onChange={(event) => update('state', event.target.value)} /></Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Website *" id="client-website" error={errors.website}><Input id="client-website" placeholder="https://" aria-invalid={Boolean(errors.website)} aria-describedby={errors.website ? 'client-website-error' : undefined} value={form.website} onChange={(event) => update('website', event.target.value)} /></Field>
            <Field label="Google Business Profile URL *" id="client-gbp-url" error={errors.gbpUrl}><Input id="client-gbp-url" placeholder="https://maps.google.com/..." aria-invalid={Boolean(errors.gbpUrl)} aria-describedby={errors.gbpUrl ? 'client-gbp-url-error' : undefined} value={form.gbpUrl} onChange={(event) => update('gbpUrl', event.target.value)} /></Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Tier *" id="client-tier" error={errors.tier}>
              <select id="client-tier" aria-invalid={Boolean(errors.tier)} aria-describedby={errors.tier ? 'client-tier-error' : undefined} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.tier} onChange={(event) => update('tier', event.target.value)}>
                {TIERS.map((tier) => <option key={tier} value={tier}>{tier.replace('_',' ')}</option>)}
              </select>
            </Field>
            <Field label="Monthly retainer ($) *" id="client-monthly-mrr" error={errors.monthlyMRR}><Input id="client-monthly-mrr" type="number" min="0" aria-invalid={Boolean(errors.monthlyMRR)} aria-describedby={errors.monthlyMRR ? 'client-monthly-mrr-error' : undefined} value={form.monthlyMRR} onChange={(event) => update('monthlyMRR', event.target.value)} /></Field>
          </div>
          <Field label="Strategy brief *" id="client-strategy-brief" error={errors.strategyBrief}>
            <Textarea id="client-strategy-brief" aria-invalid={Boolean(errors.strategyBrief)} aria-describedby={errors.strategyBrief ? 'client-strategy-brief-error' : undefined} rows={4} placeholder="Top goals, target service areas, what they care about most..." value={form.strategyBrief} onChange={(event) => update('strategyBrief', event.target.value)} />
          </Field>
        </Card>
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Create Client'}</Button>
        </div>
      </form>
    </Container>
  )
}

function Field({ label, id, error, children }: { label: string; id: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p id={`${id}-error`} className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
