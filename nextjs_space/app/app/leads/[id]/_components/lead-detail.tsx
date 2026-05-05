'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  PIPELINE_STAGES, PRICING_TIERS, stageColor, stageLabel,
  industryLabel, sourceLabel,
} from '@/lib/types'
import { toast } from 'sonner'
import {
  ArrowLeft, Bot, Building2, Mail, MapPin, Phone, Sparkles, Star, Globe,
  Loader2, MessageSquare, PhoneCall, Calendar, FileText,
} from 'lucide-react'

export function LeadDetail({
  lead, teamMembers,
}: {
  lead: any
  teamMembers: { id: string; name: string | null; email: string }[]
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [aiText, setAiText] = useState<string>(lead?.aiAssessment ?? '')
  const [aiLoading, setAiLoading] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [activityType, setActivityType] = useState('CALL')
  const [activityNote, setActivityNote] = useState('')
  const [notes, setNotes] = useState<any[]>(lead?.notes ?? [])
  const [activities, setActivities] = useState<any[]>(lead?.activities ?? [])

  async function patch(payload: Record<string, any>) {
    setBusy(true)
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        toast.error('Update failed')
        return
      }
      toast.success('Updated')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function generateAssessment() {
    setAiLoading(true)
    setAiText('')
    try {
      const res = await fetch('/api/leads/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id }),
      })
      if (!res.ok || !res.body) { toast.error('Assessment failed'); setAiLoading(false); return }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let partial = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        partial += decoder.decode(value, { stream: true })
        const lines = partial.split('\n')
        partial = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') { setAiLoading(false); router.refresh(); return }
          try {
            const parsed = JSON.parse(data)
            const delta = parsed?.choices?.[0]?.delta?.content ?? ''
            if (delta) { buffer += delta; setAiText(buffer) }
          } catch { /* skip */ }
        }
      }
      setAiLoading(false)
    } catch {
      setAiLoading(false)
      toast.error('Assessment error')
    }
  }

  async function addNote() {
    if (!noteText.trim()) return
    const res = await fetch(`/api/leads/${lead.id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: noteText }),
    })
    if (!res.ok) { toast.error('Note failed'); return }
    const data = await res.json()
    if (data?.note) setNotes([data.note, ...notes])
    setNoteText('')
    toast.success('Note added')
  }

  async function logActivity() {
    if (!activityNote.trim()) return
    const res = await fetch(`/api/leads/${lead.id}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: activityType, body: activityNote, title: `Logged ${activityType.toLowerCase()}` }),
    })
    if (!res.ok) { toast.error('Failed to log'); return }
    const data = await res.json()
    if (data?.activity) setActivities([data.activity, ...activities])
    setActivityNote('')
    toast.success('Activity logged')
  }

  const breakdown = (lead?.scoreBreakdown ?? null) as null | {
    industryFit: number; revenueFit: number; spendFit: number;
    sizeFit: number; sourceQuality: number; geoFit: number; engagement: number;
    reasons: string[]
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/leads" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><ArrowLeft className="h-3.5 w-3.5" /> Back to leads</Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-bold tracking-tight">{lead?.businessName}</h1>
            <Badge className={stageColor(lead?.status)} variant="outline">{stageLabel(lead?.status)}</Badge>
            {lead?.qualification && <Badge variant="secondary">{lead.qualification}</Badge>}
          </div>
          <p className="text-muted-foreground mt-1">
            {lead?.ownerName} • {industryLabel(lead?.industry)} • Source: {sourceLabel(lead?.source)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={lead?.status} onValueChange={(v) => patch({ status: v })}>
            <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PIPELINE_STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={lead?.assignedToId ?? 'UNASSIGNED'} onValueChange={(v) => patch({ assignedToId: v === 'UNASSIGNED' ? null : v })}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Assign…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
              {teamMembers.map(t => <SelectItem key={t.id} value={t.id}>{t.name ?? t.email}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column — details */}
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-2"><Mail className="h-4 w-4 mt-0.5 text-muted-foreground" /><div><div className="text-xs text-muted-foreground">Email</div><a href={`mailto:${lead?.email}`} className="hover:text-primary">{lead?.email}</a></div></div>
              <div className="flex items-start gap-2"><Phone className="h-4 w-4 mt-0.5 text-muted-foreground" /><div><div className="text-xs text-muted-foreground">Phone</div>{lead?.phone ? <a href={`tel:${lead.phone}`} className="hover:text-primary">{lead.phone}</a> : <span className="text-muted-foreground">—</span>}</div></div>
              <div className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" /><div><div className="text-xs text-muted-foreground">Location</div>{[lead?.city, lead?.state].filter(Boolean).join(', ') || '—'}</div></div>
              <div className="flex items-start gap-2"><Globe className="h-4 w-4 mt-0.5 text-muted-foreground" /><div><div className="text-xs text-muted-foreground">Website</div>{lead?.website ? <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer" className="hover:text-primary break-all">{lead.website}</a> : <span className="text-muted-foreground">—</span>}</div></div>
              <div className="flex items-start gap-2"><Building2 className="h-4 w-4 mt-0.5 text-muted-foreground" /><div><div className="text-xs text-muted-foreground">Revenue</div>{lead?.revenueRange ?? '—'}</div></div>
              <div className="flex items-start gap-2"><Star className="h-4 w-4 mt-0.5 text-muted-foreground" /><div><div className="text-xs text-muted-foreground">Mktg Spend</div>{lead?.currentMarketingSpend ?? '—'}</div></div>
              {lead?.referralPartner && (
                <div className="sm:col-span-2 rounded-md bg-primary/5 border border-primary/20 px-3 py-2 text-xs">
                  Referred by <strong>{lead.referralPartner.name}</strong> ({lead.referralPartner.partnerCode}) • {lead.referralPartner.tier}
                </div>
              )}
              {lead?.biggestPainPoint && (
                <div className="sm:col-span-2">
                  <div className="text-xs text-muted-foreground mb-1">Pain point</div>
                  <p className="text-sm">{lead.biggestPainPoint}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-lg font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI SEO Assessment</h3>
                <Button size="sm" variant="outline" onClick={generateAssessment} disabled={aiLoading}>
                  {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (aiText ? 'Regenerate' : 'Generate')}
                </Button>
              </div>
              {aiText ? (
                <div className="prose prose-invert max-w-none text-sm whitespace-pre-wrap">{aiText}</div>
              ) : aiLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Streaming live assessment…</div>
              ) : (
                <p className="text-sm text-muted-foreground">Click Generate to pull a tailored SEO assessment from our knowledge base.</p>
              )}
            </CardContent>
          </Card>

          <Tabs defaultValue="activity">
            <TabsList>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>
            <TabsContent value="activity" className="space-y-3">
              <Card>
                <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-[150px_1fr_auto] gap-2">
                  <Select value={activityType} onValueChange={setActivityType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CALL">Call</SelectItem>
                      <SelectItem value="EMAIL">Email</SelectItem>
                      <SelectItem value="MEETING">Meeting</SelectItem>
                      <SelectItem value="SYSTEM">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="What happened?" value={activityNote} onChange={(e) => setActivityNote(e.target.value)} />
                  <Button onClick={logActivity}>Log</Button>
                </CardContent>
              </Card>
              <div className="space-y-2">
                {(activities ?? []).map((a) => (
                  <Card key={a.id}>
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className="shrink-0 h-8 w-8 rounded-md bg-primary/10 text-primary grid place-items-center">
                        {a.type === 'CALL' && <PhoneCall className="h-4 w-4" />}
                        {a.type === 'EMAIL' && <Mail className="h-4 w-4" />}
                        {a.type === 'MEETING' && <Calendar className="h-4 w-4" />}
                        {a.type === 'AI_ASSESSMENT' && <Bot className="h-4 w-4" />}
                        {a.type === 'STATUS_CHANGE' && <FileText className="h-4 w-4" />}
                        {!['CALL','EMAIL','MEETING','AI_ASSESSMENT','STATUS_CHANGE'].includes(a.type) && <MessageSquare className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-sm">{a.title}</div>
                          <div className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</div>
                        </div>
                        {a.body && <div className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{a.body}</div>}
                        {a.author?.name && <div className="text-xs text-muted-foreground mt-1">by {a.author.name}</div>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {activities.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No activity yet.</p>}
              </div>
            </TabsContent>
            <TabsContent value="notes" className="space-y-3">
              <Card>
                <CardContent className="p-4 space-y-2">
                  <Textarea rows={3} placeholder="Add a note…" value={noteText} onChange={(e) => setNoteText(e.target.value)} />
                  <div className="flex justify-end"><Button size="sm" onClick={addNote}>Save Note</Button></div>
                </CardContent>
              </Card>
              <div className="space-y-2">
                {(notes ?? []).map((n) => (
                  <Card key={n.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">{n.author?.name ?? 'Team'}</div>
                        <div className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</div>
                      </div>
                      <div className="text-sm mt-1 whitespace-pre-wrap">{n.body}</div>
                    </CardContent>
                  </Card>
                ))}
                {notes.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No notes yet.</p>}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right column — score & deal */}
        <div className="space-y-5">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Lead Score</span>
                <Badge variant="secondary">{lead?.qualification ?? '—'}</Badge>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <div className="font-display text-5xl font-bold text-primary">{lead?.score ?? 0}</div>
                <div className="text-sm text-muted-foreground">/ 100</div>
              </div>
              <div className="mt-4 space-y-2 text-xs">
                {breakdown && [
                  ['Industry fit', breakdown.industryFit, 20],
                  ['Revenue fit', breakdown.revenueFit, 20],
                  ['Marketing spend', breakdown.spendFit, 18],
                  ['Source quality', breakdown.sourceQuality, 15],
                  ['Company size', breakdown.sizeFit, 12],
                  ['Geography', breakdown.geoFit, 10],
                  ['Engagement', breakdown.engagement, 5],
                ].map(([label, v, max]) => (
                  <div key={String(label)}>
                    <div className="flex justify-between text-muted-foreground"><span>{label}</span><span className="font-mono">{v}/{max}</span></div>
                    <div className="h-1 bg-muted rounded-full overflow-hidden mt-1"><div className="h-full bg-primary" style={{ width: `${(Number(v) / Number(max)) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
              {breakdown?.reasons && breakdown.reasons.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Why this score</div>
                  <ul className="space-y-1.5 text-xs">
                    {breakdown.reasons.map((r, i) => (<li key={i} className="flex gap-2"><span className="text-primary">•</span><span>{r}</span></li>))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-3">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Deal</div>
              <div className="space-y-2">
                <Label className="text-xs">Proposed tier</Label>
                <Select value={lead?.proposedTier ?? 'LAUNCH_PAD'} onValueChange={(v) => patch({ proposedTier: v, estimatedMRR: PRICING_TIERS.find(t => t.value === v)?.mrr ?? 0 })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRICING_TIERS.map(t => <SelectItem key={t.value} value={t.value}>{t.label} (${t.mrr.toLocaleString()}/mo)</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Estimated MRR</div>
                <div className="font-display text-2xl font-bold">${(lead?.estimatedMRR ?? 0).toLocaleString()}</div>
              </div>
              {lead?.status === 'WON' && (
                <div className="rounded-md bg-emerald-500/10 border border-emerald-500/30 p-3 text-sm">
                  <div className="text-emerald-300 font-semibold">Won • ${((lead?.signedMRR ?? lead?.estimatedMRR ?? 0)).toLocaleString()}/mo</div>
                  {lead?.wonAt && <div className="text-xs text-muted-foreground mt-1">Signed {new Date(lead.wonAt).toLocaleDateString()}</div>}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
