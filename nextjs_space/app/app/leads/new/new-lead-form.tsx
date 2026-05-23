'use client'

import { type FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  EMPLOYEE_COUNT,
  INDUSTRIES,
  LEAD_SOURCES,
  MARKETING_SPEND,
  PIPELINE_STAGES,
  REVENUE_RANGES,
} from '@/lib/types'

type LeadForm = {
  businessName: string
  ownerName: string
  email: string
  phone: string
  industry: string
  city: string
  state: string
  website: string
  revenueRange: string
  currentMarketingSpend: string
  employeeCount: string
  currentProvider: string
  source: string
  status: string
  notes: string
}

type FieldErrors = Partial<Record<keyof LeadForm, string>>

const initialForm: LeadForm = {
  businessName: '',
  ownerName: '',
  email: '',
  phone: '',
  industry: 'HVAC',
  city: 'Indianapolis',
  state: 'IN',
  website: '',
  revenueRange: '1M-5M',
  currentMarketingSpend: '500-2000',
  employeeCount: '5-15',
  currentProvider: '',
  source: 'MANUAL',
  status: 'NEW',
  notes: '',
}

function validate(form: LeadForm): FieldErrors {
  const errors: FieldErrors = {}
  if (!form.businessName.trim()) errors.businessName = 'Business name is required.'
  if (!form.ownerName.trim()) errors.ownerName = 'Contact name is required.'
  if (!form.email.trim() && !form.phone.trim()) errors.email = 'Email or phone is required.'
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Enter a valid email address.'
  if (!form.industry.trim()) errors.industry = 'Industry is required.'
  if (!form.source.trim()) errors.source = 'Lead source is required.'
  if (!form.status.trim()) errors.status = 'Stage is required.'
  if (!form.notes.trim()) errors.notes = 'Notes are required.'
  return errors
}

export function NewLeadForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [form, setForm] = useState<LeadForm>(initialForm)

  function update<K extends keyof LeadForm>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      const next = { ...current }
      delete next[key]
      if (key === 'email' || key === 'phone') {
        delete next.email
        delete next.phone
      }
      return next
    })
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validate(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      toast.error('Fix the highlighted lead fields.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, biggestPainPoint: form.notes }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 409 && data?.lead?.id) {
        toast.error('Lead already exists. Opening existing record.')
        router.push(`/app/leads/${data.lead.id}`)
        router.refresh()
        return
      }
      if (!res.ok) {
        setErrors(data?.fieldErrors ?? {})
        throw new Error(data?.error ?? 'Failed to save lead')
      }
      toast.success(`Lead added • score ${data?.score ?? '—'}/100`)
      router.push(`/app/leads/${data?.leadId}`)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save lead')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {Object.keys(errors).length > 0 && (
        <Card className="border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Complete the highlighted fields before saving this lead.
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Business name *" id="lead-business-name" error={errors.businessName}>
          <Input id="lead-business-name" aria-invalid={Boolean(errors.businessName)} aria-describedby={errors.businessName ? 'lead-business-name-error' : undefined} value={form.businessName} onChange={(event) => update('businessName', event.target.value)} />
        </Field>
        <Field label="Contact name *" id="lead-owner-name" error={errors.ownerName}>
          <Input id="lead-owner-name" aria-invalid={Boolean(errors.ownerName)} aria-describedby={errors.ownerName ? 'lead-owner-name-error' : undefined} value={form.ownerName} onChange={(event) => update('ownerName', event.target.value)} />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Email" id="lead-email" error={errors.email}>
          <Input id="lead-email" type="email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'lead-email-error' : undefined} value={form.email} onChange={(event) => update('email', event.target.value)} />
        </Field>
        <Field label="Phone" id="lead-phone" error={errors.phone}>
          <Input id="lead-phone" aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'lead-phone-error' : undefined} value={form.phone} onChange={(event) => update('phone', event.target.value)} />
        </Field>
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">Ryan needs at least one contact path: email or phone.</p>

      <div className="grid gap-3 sm:grid-cols-3">
        <SelectField label="Industry *" id="lead-industry" value={form.industry} error={errors.industry} onChange={(value) => update('industry', value)} options={INDUSTRIES} />
        <SelectField label="Source *" id="lead-source" value={form.source} error={errors.source} onChange={(value) => update('source', value)} options={LEAD_SOURCES} />
        <SelectField label="Stage *" id="lead-status" value={form.status} error={errors.status} onChange={(value) => update('status', value)} options={PIPELINE_STAGES} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="City" id="lead-city"><Input id="lead-city" value={form.city} onChange={(event) => update('city', event.target.value)} /></Field>
        <Field label="State" id="lead-state"><Input id="lead-state" value={form.state} onChange={(event) => update('state', event.target.value)} /></Field>
        <Field label="Website" id="lead-website"><Input id="lead-website" placeholder="https://" value={form.website} onChange={(event) => update('website', event.target.value)} /></Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SelectField label="Revenue" id="lead-revenue-range" value={form.revenueRange} onChange={(value) => update('revenueRange', value)} options={REVENUE_RANGES} />
        <SelectField label="Marketing spend" id="lead-marketing-spend" value={form.currentMarketingSpend} onChange={(value) => update('currentMarketingSpend', value)} options={MARKETING_SPEND} />
        <SelectField label="Team size" id="lead-team-size" value={form.employeeCount} onChange={(value) => update('employeeCount', value)} options={EMPLOYEE_COUNT} />
      </div>

      <Field label="Current provider" id="lead-current-provider">
        <Input id="lead-current-provider" value={form.currentProvider} onChange={(event) => update('currentProvider', event.target.value)} />
      </Field>
      <Field label="Notes *" id="lead-notes" error={errors.notes}>
        <Textarea id="lead-notes" rows={4} aria-invalid={Boolean(errors.notes)} aria-describedby={errors.notes ? 'lead-notes-error' : undefined} value={form.notes} onChange={(event) => update('notes', event.target.value)} placeholder="What Ryan learned, why this lead matters, urgency, next step." />
      </Field>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Lead'}
      </Button>
    </form>
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

function SelectField({
  label,
  id,
  value,
  error,
  onChange,
  options,
}: {
  label: string
  id: string
  value: string
  error?: string
  onChange: (value: string) => void
  options: readonly { value: string; label: string }[]
}) {
  return (
    <Field label={label} id={id} error={error}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
      </Select>
    </Field>
  )
}
