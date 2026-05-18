'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bot, Code2, Copy, CheckCircle2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

export function AgentSettings({ configured, agentUrl }: { configured: boolean; agentUrl: string }) {
  const [copied, setCopied] = useState(false)
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const embedSnippet = `<!-- LegacyLegion Chat Widget -->
<script src="${origin}/widget/loader.js" async></script>`

  function copy() {
    navigator.clipboard.writeText(embedSnippet)
    setCopied(true)
    toast.success('Snippet copied')
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="space-y-5">
      <Card><CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="shrink-0 h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center"><Bot className="h-5 w-5" /></div>
          <div className="flex-1">
            <h3 className="font-display text-lg font-semibold">Agent Endpoint</h3>
            <p className="text-sm text-muted-foreground mt-1">Set the <code className="text-xs bg-muted px-1.5 py-0.5 rounded">AGENT_API_URL</code> environment variable to point at your cloud agent. When unset, requests fall back to the built-in stub which uses the LegacyAI LLM API for live responses.</p>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 rounded-md bg-muted/40 px-3 py-2 font-mono text-xs break-all">{agentUrl || 'unset (using local stub)'}</div>
              {configured
                ? <span className="inline-flex items-center gap-1 text-xs text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" /> External agent</span>
                : <span className="text-xs text-amber-300">Stub mode</span>}
            </div>
          </div>
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold flex items-center gap-2"><Code2 className="h-4 w-4" /> Embeddable Widget</h3>
            <p className="text-sm text-muted-foreground">Drop this snippet on any client website to launch the LegacyLegion chat agent.</p>
          </div>
          <Button size="sm" variant="outline" onClick={copy}><Copy className="h-3.5 w-3.5 mr-1" /> {copied ? 'Copied' : 'Copy'}</Button>
        </div>
        <pre className="mt-4 rounded-md bg-muted/40 p-4 text-xs overflow-x-auto font-mono">{embedSnippet}</pre>
        <a href="/widget" target="_blank" className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"><ExternalLink className="h-3 w-3" /> Preview the widget</a>
      </CardContent></Card>
    </div>
  )
}
