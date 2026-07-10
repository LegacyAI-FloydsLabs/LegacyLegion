'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

type ClientOption = {
  id: string
  businessName: string
  industry: string
  city: string | null
  state: string | null
  strategyBrief: string | null
}

type Match = {
  id?: string
  score?: number
  metadata?: {
    title?: string
    heading?: string
    url?: string
    text?: string
    chunk?: string
    content?: string
  }
}

function titleFor(match: Match, index: number) {
  return match?.metadata?.title ?? match?.metadata?.heading ?? match?.metadata?.url ?? `Insight ${index + 1}`
}

function textFor(match: Match) {
  return String(match?.metadata?.text ?? match?.metadata?.chunk ?? match?.metadata?.content ?? '').slice(0, 1_200)
}

function formatInsight(match: Match, index: number) {
  const title = titleFor(match, index)
  const text = textFor(match)
  const url = match?.metadata?.url
  return `## ${title}\n\n${text || 'No excerpt available.'}${url ? `\n\nSource: ${url}` : ''}`
}

async function readError(res: Response) {
  const body = await res.json().catch(() => ({}))
  return typeof body?.error === 'string' ? body.error : 'Request failed'
}

export function Intelligence({ clients = [], defaultClientId = '' }: { clients?: ClientOption[]; defaultClientId?: string }) {
  const [query, setQuery] = useState('local SEO priorities')
  const [clientId, setClientId] = useState(defaultClientId)
  const [scope, setScope] = useState<'client' | 'global'>(defaultClientId || clients.length > 0 ? 'client' : 'global')
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(false)
  const [busyAction, setBusyAction] = useState<string | null>(null)

  const client = useMemo(() => clients.find((item) => item.id === clientId) ?? null, [clients, clientId])
  const starterQueries = client
    ? [
      `${client.businessName} GBP audit priorities`,
      `${client.businessName} website SEO trust proof`,
      `${client.industry} ${client.city ?? ''} competitor snapshot`,
    ]
    : ['Indianapolis HVAC SEO competition', 'Google Business Profile review campaign', 'local service-area page plan']

  async function search() {
    const trimmed = query.trim()
    if (!trimmed) return
    setLoading(true)
    try {
      const scopedQuery = scope === 'client' && client
        ? `${client.businessName} ${client.industry} ${client.city ?? ''} ${client.state ?? ''} ${client.strategyBrief ?? ''} ${trimmed}`
        : trimmed
      const res = await fetch('/api/pinecone/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: scopedQuery, topK: 8 }),
      })
      if (!res.ok) throw new Error(await readError(res))
      const data = await res.json()
      const nextMatches = Array.isArray(data?.matches) ? data.matches as Match[] : []
      setMatches(nextMatches)
      if (nextMatches.length === 0) toast.info('No evidence matched. Add client notes, import GSC/GBP evidence, or broaden scope.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Search failed')
      setMatches([])
    } finally {
      setLoading(false)
    }
  }

  async function saveAsNote(match: Match, index: number, pinned: boolean) {
    if (!client) {
      toast.error('Pick a client before saving client-scoped intelligence.')
      return
    }
    setBusyAction(`${index}:${pinned ? 'insight' : 'note'}`)
    try {
      const res = await fetch(`/api/agency/clients/${client.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: formatInsight(match, index), pinned }),
      })
      if (!res.ok) throw new Error(await readError(res))
      toast.success(pinned ? 'Saved as client insight' : 'Saved as client note')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save note')
    } finally {
      setBusyAction(null)
    }
  }

  async function saveAsWorkOrder(match: Match, index: number) {
    if (!client) {
      toast.error('Pick a client before creating a work order.')
      return
    }
    setBusyAction(`${index}:work`)
    try {
      const res = await fetch('/api/agency/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          type: 'CLIENT_INTELLIGENCE',
          title: `Intelligence follow-up — ${titleFor(match, index)}`.slice(0, 180),
          goal: 'Review this evidence-backed intelligence result and decide the next client action.',
          outputMarkdown: formatInsight(match, index),
          ownerKind: 'AI_PERSONA',
          priority: 'MEDIUM',
          approvalStatus: 'NOT_REQUIRED',
        }),
      })
      if (!res.ok) throw new Error(await readError(res))
      toast.success('Work order created from intelligence')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create work order')
    } finally {
      setBusyAction(null)
    }
  }

  function copyReportSection(match: Match, index: number) {
    navigator.clipboard.writeText(formatInsight(match, index)).then(() => toast.success('Report section copied'))
  }

  return (
    <div className="space-y-5">
      <Card><CardContent className="space-y-4 p-4">
        <form onSubmit={(event) => { event.preventDefault(); search() }} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_160px]">
            <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input value={query} aria-label="Search client evidence or global knowledge" onChange={(event) => setQuery(event.target.value)} placeholder="Search client evidence or global knowledge…" className="border-0 bg-transparent focus-visible:ring-0" />
            </div>
            <select value={clientId} aria-label="Client for intelligence search" onChange={(event) => setClientId(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm" disabled={scope === 'global'}>
              <option value="">No client selected</option>
              {clients.map((item) => <option key={item.id} value={item.id}>{item.businessName}</option>)}
            </select>
            <select value={scope} aria-label="Intelligence search scope" onChange={(event) => setScope(event.target.value as 'client' | 'global')} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="client">Client scoped</option>
              <option value="global">Global search</option>
            </select>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {starterQueries.map((starter) => <button key={starter} type="button" onClick={() => setQuery(starter)} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground">{starter}</button>)}
            </div>
            <Button type="submit" disabled={loading || (scope === 'client' && !client)}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}</Button>
          </div>
        </form>
        {scope === 'client' && !client && <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">Pick a client for client-scoped intelligence, or switch to global search.</div>}
      </CardContent></Card>

      <div className="space-y-3">
        {matches.map((match, index) => (
          <Card key={match?.id ?? index}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <div className="font-medium text-sm">{titleFor(match, index)}</div>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{textFor(match) || 'No excerpt available.'}</p>
                  {match?.metadata?.url && <a href={match.metadata.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-primary hover:underline">{match.metadata.url}</a>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => saveAsNote(match, index, false)} disabled={!client || Boolean(busyAction)}>Save note</Button>
                    <Button size="sm" variant="outline" onClick={() => saveAsWorkOrder(match, index)} disabled={!client || Boolean(busyAction)}>Make work order</Button>
                    <Button size="sm" variant="outline" onClick={() => copyReportSection(match, index)}>Copy report section</Button>
                    <Button size="sm" variant="outline" onClick={() => saveAsNote(match, index, true)} disabled={!client || Boolean(busyAction)}>Save client insight</Button>
                  </div>
                </div>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">{(match?.score ?? 0).toFixed(3)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {!loading && matches.length === 0 && (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Run a search. If nothing matches, add client evidence, import GBP/GSC data, or broaden the scope.</CardContent></Card>
        )}
      </div>
    </div>
  )
}
