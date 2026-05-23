'use client'

import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

type ClientOption = { id: string; businessName: string }

type ProspectRow = {
  id: string
  source: string
  companyName: string | null
  companyDomain: string | null
  companyIndustry: string | null
  personFirstName: string | null
  personLastName: string | null
  personTitle: string | null
  personEmail: string | null
  personPhone: string | null
  city: string | null
  state: string | null
  promotedToLeadId: string | null
}

type SearchState = {
  clientId: string
  industry: string
  city: string
  state: string
  serviceArea: string
  radius: string
  source: 'auto' | 'apollo' | 'explorium'
  targetCount: string
  emailRequired: string
}

const initialState: SearchState = {
  clientId: '',
  industry: 'plumbing',
  city: 'Indianapolis',
  state: 'IN',
  serviceArea: '',
  radius: '25',
  source: 'auto',
  targetCount: '10',
  emailRequired: 'yes',
}

function prospectName(prospect: ProspectRow) {
  return [prospect.personFirstName, prospect.personLastName].filter(Boolean).join(' ') || prospect.companyName || 'Unnamed prospect'
}

async function readError(res: Response) {
  const body = await res.json().catch(() => ({}))
  return typeof body?.error === 'string' ? body.error : 'Request failed'
}

export function ProspectWorkflow({ clients }: { clients: ClientOption[] }) {
  const [form, setForm] = useState<SearchState>(() => ({ ...initialState, clientId: clients[0]?.id ?? '' }))
  const [busy, setBusy] = useState(false)
  const [blocked, setBlocked] = useState<string | null>(null)
  const [result, setResult] = useState<{ counts?: { found: number; deduped: number; persisted: number }; prospects: ProspectRow[] }>({ prospects: [] })
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [promoting, setPromoting] = useState(false)

  function update<K extends keyof SearchState>(key: K, value: SearchState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setBlocked(null)
    setSelected({})
    try {
      const targetCount = Math.max(1, Math.min(25, Number(form.targetCount) || 10))
      const criteria = {
        city: form.city,
        state: form.state,
        country_code: 'us',
        industry: form.industry,
        q_keywords: [form.industry, form.serviceArea].filter(Boolean).join(' '),
        radius_miles: Number(form.radius) || 25,
        person_email_status: form.emailRequired === 'yes' ? ['verified', 'likely'] : undefined,
      }
      const res = await fetch('/api/agency/prospects/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: form.clientId || null,
          source: form.source,
          limit: targetCount,
          criteria,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setBlocked(data?.code ? `${data.code}: ${data.error}` : await readError(res))
        return
      }
      const prospects = Array.isArray(data?.prospects) ? data.prospects as ProspectRow[] : []
      setResult({ counts: data?.counts, prospects })
      setSelected(Object.fromEntries(prospects.map((prospect) => [prospect.id, Boolean(prospect.personEmail || prospect.personPhone)])))
      if (prospects.length === 0) setBlocked('No importable prospects were returned after dedupe. Change region, provider, target count, or email requirement.')
      else toast.success(`Found ${prospects.length} importable prospects`)
    } catch (error) {
      setBlocked(error instanceof Error ? error.message : 'Prospect search failed')
    } finally {
      setBusy(false)
    }
  }

  async function importSelected() {
    const ids = Object.entries(selected).filter(([, value]) => value).map(([id]) => id)
    if (ids.length === 0) {
      toast.error('Select at least one prospect to import.')
      return
    }
    setPromoting(true)
    let imported = 0
    try {
      for (const id of ids) {
        const res = await fetch(`/api/agency/prospects/${id}/promote`, { method: 'POST' })
        if (res.ok) imported += 1
      }
      toast.success(`${imported} prospect${imported === 1 ? '' : 's'} imported to Leads`)
    } finally {
      setPromoting(false)
    }
  }

  const followUpScript = result.prospects.length > 0
    ? `Hi {{contact}}, this is Ryan with LegacyAI. I noticed {{company}} serves ${form.city || 'your market'} and wanted to compare notes on whether your current online presence is producing the calls you want. Worth a quick conversation this week?`
    : ''

  return (
    <Card className="mt-6 p-5">
      <form onSubmit={search} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-medium">Structured prospect search</div>
            <div className="text-sm text-muted-foreground">Search, dedupe, inspect, then import selected prospects as Leads assigned to the operator running the workflow.</div>
          </div>
          <Button type="submit" disabled={busy || clients.length === 0}>{busy ? 'Searching…' : 'Run Prospect Search'}</Button>
        </div>

        <div className="grid gap-3 lg:grid-cols-4">
          <Field label="Client" id="prospect-client">
            <select id="prospect-client" value={form.clientId} onChange={(event) => update('clientId', event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              {clients.map((client) => <option key={client.id} value={client.id}>{client.businessName}</option>)}
            </select>
          </Field>
          <Field label="Industry" id="prospect-industry"><Input id="prospect-industry" value={form.industry} onChange={(event) => update('industry', event.target.value)} /></Field>
          <Field label="City / region" id="prospect-city"><Input id="prospect-city" value={form.city} onChange={(event) => update('city', event.target.value)} /></Field>
          <Field label="State" id="prospect-state"><Input id="prospect-state" value={form.state} onChange={(event) => update('state', event.target.value)} /></Field>
          <Field label="Radius" id="prospect-radius"><Input id="prospect-radius" type="number" min="1" max="250" value={form.radius} onChange={(event) => update('radius', event.target.value)} /></Field>
          <Field label="Service area / keywords" id="prospect-service"><Input id="prospect-service" value={form.serviceArea} onChange={(event) => update('serviceArea', event.target.value)} /></Field>
          <Field label="Provider" id="prospect-source">
            <select id="prospect-source" value={form.source} onChange={(event) => update('source', event.target.value as SearchState['source'])} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="auto">Auto</option>
              <option value="apollo">Apollo</option>
              <option value="explorium">Explorium</option>
            </select>
          </Field>
          <Field label="Target count" id="prospect-count"><Input id="prospect-count" type="number" min="1" max="25" value={form.targetCount} onChange={(event) => update('targetCount', event.target.value)} /></Field>
          <Field label="Email required" id="prospect-email-required">
            <select id="prospect-email-required" value={form.emailRequired} onChange={(event) => update('emailRequired', event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </Field>
        </div>
      </form>

      {blocked && <div className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">{blocked}</div>}

      {result.counts && (
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Badge variant="outline">Found {result.counts.found}</Badge>
          <Badge variant="outline">Dedupe skipped {result.counts.deduped}</Badge>
          <Badge variant="outline">Persisted {result.counts.persisted}</Badge>
          <Badge variant="outline">Source confidence: {form.source === 'auto' ? 'provider-selected' : form.source}</Badge>
        </div>
      )}

      {result.prospects.length > 0 && (
        <div className="mt-4 space-y-3">
          <div className="flex justify-end"><Button size="sm" onClick={importSelected} disabled={promoting}>{promoting ? 'Importing…' : 'Import selected prospects to Leads'}</Button></div>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="p-2">Import</th><th className="p-2">Prospect</th><th className="p-2">Company</th><th className="p-2">Contact</th><th className="p-2">Location</th><th className="p-2">Source</th></tr>
              </thead>
              <tbody>
                {result.prospects.map((prospect) => (
                  <tr key={prospect.id} className="border-t border-border">
                    <td className="p-2"><input type="checkbox" checked={Boolean(selected[prospect.id])} onChange={(event) => setSelected((current) => ({ ...current, [prospect.id]: event.target.checked }))} aria-label={`Import ${prospectName(prospect)}`} /></td>
                    <td className="p-2 font-medium">{prospectName(prospect)}</td>
                    <td className="p-2 text-muted-foreground">{prospect.companyDomain ?? prospect.companyName ?? '—'}</td>
                    <td className="p-2 text-muted-foreground">{prospect.personEmail ?? prospect.personPhone ?? 'No email or phone'}</td>
                    <td className="p-2 text-muted-foreground">{[prospect.city, prospect.state].filter(Boolean).join(', ') || '—'}</td>
                    <td className="p-2 text-muted-foreground">{prospect.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {followUpScript && (
            <Field label="Ryan follow-up script" id="prospect-follow-up">
              <Textarea id="prospect-follow-up" rows={3} readOnly value={followUpScript} />
            </Field>
          )}
        </div>
      )}
    </Card>
  )
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}
