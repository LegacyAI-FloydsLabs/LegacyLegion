'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { INDUSTRIES, REVENUE_RANGES, MARKETING_SPEND, EMPLOYEE_COUNT } from '@/lib/types'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, Sparkles } from 'lucide-react'

export function GetStartedForm() {
  const sp = useSearchParams()
  const initialIndustry = sp?.get('industry') ?? 'HVAC'
  const refCode = sp?.get('ref') ?? ''
  const [submitted, setSubmitted] = useState(false)
  const [aiAssessment, setAiAssessment] = useState<string>('')
  const [score, setScore] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    businessName: '', ownerName: '', email: '', phone: '',
    industry: initialIndustry, city: 'Indianapolis', state: 'IN',
    revenueRange: '1M-5M', currentMarketingSpend: '500-2000',
    employeeCount: '5-15', biggestPainPoint: '', currentProvider: '', website: '',
  })

  function up(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })) }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setAiAssessment('')
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, source: 'WEB_FORM', referralCode: refCode }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error ?? 'Submission failed')
        setLoading(false)
        return
      }
      setScore(data?.score ?? 0)
      setSubmitted(true)
      toast.success('Submitted — generating your AI assessment…')
      // Stream the AI assessment
      streamAssessment(data?.leadId)
    } catch (err: any) {
      toast.error('Submission failed')
      setLoading(false)
    }
  }

  async function streamAssessment(leadId: string | undefined) {
    if (!leadId) { setLoading(false); return }
    try {
      const res = await fetch('/api/leads/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      })
      if (!res.ok || !res.body) { setLoading(false); return }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let partialRead = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        partialRead += decoder.decode(value, { stream: true })
        const lines = partialRead.split('\n')
        partialRead = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') { setLoading(false); return }
          try {
            const parsed = JSON.parse(data)
            const delta = parsed?.choices?.[0]?.delta?.content ?? ''
            if (delta) {
              buffer += delta
              setAiAssessment(buffer)
            }
          } catch { /* skip */ }
        }
      }
      setLoading(false)
    } catch (err: any) {
      console.error('assessment stream error', err)
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
          <div>
            <h2 className="font-display text-xl font-semibold">Thanks, {form.ownerName.split(' ')[0] || 'there'}.</h2>
            <p className="text-sm text-muted-foreground">Our team will reach out shortly. In the meantime, here’s your live AI assessment.</p>
          </div>
        </div>
        {score !== null && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Lead Fit Score</div>
            <div className="flex items-baseline gap-2">
              <div className="font-display text-4xl font-bold text-primary">{score}</div>
              <div className="text-sm text-muted-foreground">/ 100</div>
            </div>
          </div>
        )}
        <div className="rounded-lg border border-border bg-card/50 p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary mb-2">
            <Sparkles className="h-3.5 w-3.5" /> AI SEO Assessment
          </div>
          {aiAssessment ? (
            <div className="prose prose-invert max-w-none text-sm whitespace-pre-wrap">{aiAssessment}</div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Generating live assessment…
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Business name *</Label><Input required value={form.businessName} onChange={(e) => up('businessName', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Your name *</Label><Input required value={form.ownerName} onChange={(e) => up('ownerName', e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Email *</Label><Input type="email" required value={form.email} onChange={(e) => up('email', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => up('phone', e.target.value)} /></div>
      </div>
      <div className="space-y-1.5">
        <Label>Industry *</Label>
        <Select value={form.industry} onValueChange={(v) => up('industry', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {INDUSTRIES.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5"><Label>City</Label><Input value={form.city} onChange={(e) => up('city', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>State</Label><Input value={form.state} onChange={(e) => up('state', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Website</Label><Input value={form.website} onChange={(e) => up('website', e.target.value)} placeholder="example.com" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Revenue range</Label>
          <Select value={form.revenueRange} onValueChange={(v) => up('revenueRange', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{REVENUE_RANGES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Marketing spend</Label>
          <Select value={form.currentMarketingSpend} onValueChange={(v) => up('currentMarketingSpend', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{MARKETING_SPEND.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Team size</Label>
          <Select value={form.employeeCount} onValueChange={(v) => up('employeeCount', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{EMPLOYEE_COUNT.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Current marketing provider</Label><Input value={form.currentProvider} onChange={(e) => up('currentProvider', e.target.value)} placeholder="None / Scorpion / Thrive…" /></div>
      </div>
      <div className="space-y-1.5">
        <Label>Biggest growth pain point</Label>
        <Textarea rows={3} value={form.biggestPainPoint} onChange={(e) => up('biggestPainPoint', e.target.value)} placeholder="e.g. lead quality, slow speed-to-contact, low Google ranking…" />
      </div>
      <Button type="submit" className="w-full" disabled={loading} size="lg">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Get my AI assessment'}
      </Button>
      <p className="text-xs text-muted-foreground text-center">Your data is stored securely and never sold.</p>
    </form>
  )
}
