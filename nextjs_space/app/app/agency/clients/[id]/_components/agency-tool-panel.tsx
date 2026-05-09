'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  FileSearch, MapPin, Users, Megaphone, FileText, Mail, MessageSquare, Sparkles, Loader2, Globe, KeySquare,
} from 'lucide-react'
import { AGENCY_TOOLS } from '@/lib/agency-prompts'

interface ToolDef {
  type: string
  label: string
  description: string
  icon: any
  needsInput?: string
  accent: string
}

const iconForTool = (type: string) => {
  if (type.startsWith('OSS_')) return Sparkles
  return {
    SEO_AUDIT: FileSearch,
    GBP_OPTIMIZATION: MapPin,
    COMPETITOR_SWEEP: Users,
    KEYWORD_RESEARCH: KeySquare,
    CONTENT_BRIEF: FileText,
    AD_COPY: Megaphone,
    LOCAL_LANDING_PAGE: Globe,
    REVIEW_RESPONSE: MessageSquare,
    EMAIL_CAMPAIGN: Mail,
  }[type] ?? Sparkles
}

const BUILT_IN_TOOL_ACCENTS: Record<string, string> = {
  SEO_AUDIT: 'border-violet-500/40 from-violet-500/10',
  GBP_OPTIMIZATION: 'border-fuchsia-500/40 from-fuchsia-500/10',
  COMPETITOR_SWEEP: 'border-rose-500/40 from-rose-500/10',
  KEYWORD_RESEARCH: 'border-amber-500/40 from-amber-500/10',
  CONTENT_BRIEF: 'border-emerald-500/40 from-emerald-500/10',
  AD_COPY: 'border-blue-500/40 from-blue-500/10',
  LOCAL_LANDING_PAGE: 'border-cyan-500/40 from-cyan-500/10',
  REVIEW_RESPONSE: 'border-purple-500/40 from-purple-500/10',
  EMAIL_CAMPAIGN: 'border-orange-500/40 from-orange-500/10',
}

const TOOLS: ToolDef[] = AGENCY_TOOLS.map((tool) => ({
  ...tool,
  icon: iconForTool(tool.type),
  accent: tool.type.startsWith('OSS_')
    ? 'border-teal-500/40 from-teal-500/10'
    : BUILT_IN_TOOL_ACCENTS[tool.type] ?? 'border-slate-500/40 from-slate-500/10',
}))

interface Props {
  client: { id: string; businessName: string; industry: string; city: string | null; state: string | null }
  onWorkOrderCreated: (wo: any) => void
  onOpenWorkOrder: (wo: any) => void
}

export function AgencyToolPanel({ client, onWorkOrderCreated, onOpenWorkOrder }: Props) {
  const [active, setActive] = useState<ToolDef | null>(null)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [streaming, setStreaming] = useState('')

  async function run() {
    if (!active) return
    setBusy(true)
    setStreaming('')
    let createdId: string | null = null
    let buffer = ''
    try {
      const res = await fetch(`/api/agency/clients/${client.id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: active.type, input }),
      })
      if (!res.ok || !res.body) {
        toast.error('Generation failed')
        return
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let partial = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        partial += decoder.decode(value, { stream: true })
        const lines = partial.split('\n')
        partial = lines.pop() ?? ''
        for (const line of lines) {
          if (line.startsWith('event: meta')) continue
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              if (parsed?.workOrderId) { createdId = parsed.workOrderId; continue }
              const delta = parsed?.choices?.[0]?.delta?.content ?? ''
              if (delta) {
                buffer += delta
                setStreaming(buffer)
              }
            } catch { /* skip */ }
          }
        }
      }
      if (createdId) {
        toast.success(`${active.label} generated`)
        const wo = {
          id: createdId,
          type: active.type,
          title: `${active.label} — ${client.businessName}`,
          status: 'REVIEW',
          outputMarkdown: buffer,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          generatedAt: new Date().toISOString(),
          deliveredAt: null,
          inputJson: { userInput: input },
        }
        onWorkOrderCreated(wo)
        onOpenWorkOrder(wo)
        setActive(null)
        setInput('')
        setStreaming('')
      }
    } catch (e) {
      toast.error('Generation failed')
    } finally {
      setBusy(false)
    }
  }

  if (active) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-1">
          <active.icon className="h-5 w-5 text-primary"/>
          <div className="font-display text-lg font-semibold">{active.label}</div>
          <div className="ml-auto"><Button size="sm" variant="ghost" onClick={() => { setActive(null); setInput(''); setStreaming('') }} disabled={busy}>Cancel</Button></div>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{active.description}</p>
        {active.needsInput && (
          <div className="mb-4">
            <Label className="text-xs">{active.needsInput}</Label>
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={active.needsInput}
              disabled={busy}
            />
          </div>
        )}
        <div className="flex items-center gap-3">
          <Button onClick={run} disabled={busy || (!!active.needsInput && !input.trim())}>
            {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Generating…</> : <><Sparkles className="h-4 w-4 mr-2"/>Run with knowledge base</>}
          </Button>
          <span className="text-xs text-muted-foreground">Pulls Pinecone context for {client.industry} in {client.city ?? 'Indianapolis'}, {client.state ?? 'IN'}</span>
        </div>
        {streaming && (
          <div className="mt-5 p-4 rounded-md border border-border bg-background/50 max-h-96 overflow-y-auto text-sm whitespace-pre-wrap font-mono">
            {streaming}
          </div>
        )}
      </Card>
    )
  }

  return (
    <div>
      <div className="text-sm text-muted-foreground mb-4">Pick a deliverable to generate. The output becomes a Work Order you can refine and mark Delivered.</div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {TOOLS.map(t => (
          <button key={t.type} type="button" onClick={() => setActive(t)} className={`text-left rounded-lg border bg-gradient-to-br to-transparent p-4 hover:border-primary/60 transition-colors ${t.accent}`}>
            <t.icon className="h-5 w-5 mb-2 text-primary"/>
            <div className="font-medium">{t.label}</div>
            <div className="text-xs text-muted-foreground mt-1">{t.description}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
