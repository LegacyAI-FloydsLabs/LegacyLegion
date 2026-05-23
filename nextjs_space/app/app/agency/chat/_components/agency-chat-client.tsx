'use client'

import { FormEvent, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AGENTS } from '@/lib/agents/registry'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { toast } from 'sonner'
import { Bot, ChevronDown } from 'lucide-react'

type Message = { role: 'user' | 'assistant' | 'system'; content: string }

export function AgencyChatClient({ clients }: { clients: { id: string; businessName: string }[] }) {
  const searchParams = useSearchParams()
  const initialPersona = searchParams.get('persona') ?? 'marketing-guru'
  const initialClientId = searchParams.get('clientId') ?? ''
  const [persona, setPersona] = useState(AGENTS.some((agent) => agent.id === initialPersona) ? initialPersona : 'marketing-guru')
  const [clientId, setClientId] = useState(clients.some((client) => client.id === initialClientId) ? initialClientId : '')
  const [message, setMessage] = useState('')
  const [threadId, setThreadId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const [workOrderBusy, setWorkOrderBusy] = useState<number | null>(null)
  const selectedPersona = useMemo(() => AGENTS.find((agent) => agent.id === persona), [persona])
  const needsClient = persona === 'account-manager'

  function applySettings(nextPersona: string, nextClientId: string) {
    setPersona(nextPersona)
    setClientId(nextClientId)
    setDrawerOpen(false)
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = message.trim()
    if (!text || loading) return
    if (needsClient && !clientId) {
      setError('Pick a client before using Account Manager.')
      return
    }

    setError(null)
    setMessage('')
    setLoading(true)
    setMessages((current) => [...current, { role: 'user', content: text }, { role: 'assistant', content: '' }])

    try {
      const query = clientId ? `?clientId=${encodeURIComponent(clientId)}` : ''
      const res = await fetch(`/api/agents/${persona}/chat${query}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, threadId }),
      })
      if (!res.ok || !res.body) throw new Error(await res.text())

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
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (!data || data === '[DONE]') continue
          try {
            const parsed = JSON.parse(data)
            if (parsed.threadId) setThreadId(parsed.threadId)
            const delta = parsed?.choices?.[0]?.delta?.content
            if (delta) {
              setMessages((current) => current.map((item, index) => (
                index === current.length - 1 ? { ...item, content: item.content + delta } : item
              )))
            }
          } catch {
            // Ignore non-JSON SSE data from upstream providers.
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chat failed')
      setMessages((current) => current.filter((_, index) => index !== current.length - 1))
    } finally {
      setLoading(false)
    }
  }

  async function createWorkOrderFromResponse(content: string, index: number) {
    if (!clientId || !content.trim()) return
    setWorkOrderBusy(index)
    try {
      const res = await fetch('/api/agency/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          type: 'AI_PERSONA_RESPONSE',
          title: `${selectedPersona?.displayName ?? 'Agent'} response`,
          goal: 'Review this AI persona response and convert it into an approved client action if useful.',
          outputMarkdown: content,
          ownerKind: 'AI_PERSONA',
          priority: 'MEDIUM',
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success('Work order created from response')
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create work order from response')
    } finally {
      setWorkOrderBusy(null)
    }
  }

  const clientLabel = clientId ? clients.find((c) => c.id === clientId)?.businessName : null

  return (
    <>
      {/* ── Desktop: side-by-side layout ── */}
      <div className="hidden lg:grid lg:grid-cols-[320px_1fr] lg:gap-4">
        <SidebarCard
          persona={persona}
          clientId={clientId}
          clients={clients}
          selectedPersona={selectedPersona}
          needsClient={needsClient}
          onPersonaChange={setPersona}
          onClientIdChange={setClientId}
        />
        <ChatTerminal
          selectedPersona={selectedPersona}
          messages={messages}
          loading={loading}
          error={error}
          message={message}
          setMessage={setMessage}
          sendMessage={sendMessage}
          clientId={clientId}
          workOrderBusy={workOrderBusy}
          createWorkOrderFromResponse={createWorkOrderFromResponse}
          className="min-h-[70vh]"
        />
      </div>

      {/* ── Mobile: full-viewport terminal + bottom drawer ── */}
      <div className="lg:hidden flex flex-col h-[calc(100dvh-3.5rem-2rem)]">
        {/* Compact header row: persona + settings trigger */}
        <div className="flex items-center gap-2 px-1 pb-2">
          <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DrawerTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted transition-colors flex-1 min-w-0"
              >
                <Bot className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">{selectedPersona?.displayName ?? 'Agent'}</span>
                {clientLabel && (
                  <>
                    <span className="text-muted-foreground">·</span>
                    <span className="truncate text-muted-foreground">{clientLabel}</span>
                  </>
                )}
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground ml-auto" />
              </button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader className="text-left">
                <DrawerTitle>Agent Settings</DrawerTitle>
              </DrawerHeader>
              <MobileSettingsPanel
                persona={persona}
                clientId={clientId}
                clients={clients}
                selectedPersona={selectedPersona}
                needsClient={needsClient}
                onApply={applySettings}
              />
            </DrawerContent>
          </Drawer>
        </div>

        {/* Chat fills remaining space */}
        <ChatTerminal
          selectedPersona={selectedPersona}
          messages={messages}
          loading={loading}
          error={error}
          message={message}
          setMessage={setMessage}
          sendMessage={sendMessage}
          clientId={clientId}
          workOrderBusy={workOrderBusy}
          createWorkOrderFromResponse={createWorkOrderFromResponse}
          className="flex-1 min-h-0"
        />
      </div>
    </>
  )
}

/* ─────────── Shared sub-components ─────────── */

function SidebarCard({
  persona, clientId, clients, selectedPersona, needsClient,
  onPersonaChange, onClientIdChange,
}: {
  persona: string
  clientId: string
  clients: { id: string; businessName: string }[]
  selectedPersona: { id: string; displayName: string; shortDescription: string } | undefined
  needsClient: boolean
  onPersonaChange: (v: string) => void
  onClientIdChange: (v: string) => void
}) {
  return (
    <Card className="p-4 space-y-4">
      <div>
        <label htmlFor="agent-persona" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Persona</label>
        <select id="agent-persona" value={persona} onChange={(event) => onPersonaChange(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
          {AGENTS.map((agent) => <option key={agent.id} value={agent.id}>{agent.displayName}</option>)}
        </select>
        {selectedPersona && <p className="mt-2 text-xs text-muted-foreground">{selectedPersona.shortDescription}</p>}
      </div>

      <div>
        <label htmlFor="agent-client-context" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Client context</label>
        <select id="agent-client-context" value={clientId} onChange={(event) => onClientIdChange(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
          <option value="">No client</option>
          {clients.map((client) => <option key={client.id} value={client.id}>{client.businessName}</option>)}
        </select>
        <p className="mt-2 text-xs text-muted-foreground">{clientId ? `Active context: ${clients.find((client) => client.id === clientId)?.businessName ?? 'selected client'}` : 'Required for Account Manager. Optional for other personas.'}</p>
      </div>
    </Card>
  )
}

function MobileSettingsPanel({
  persona, clientId, clients, selectedPersona, needsClient, onApply,
}: {
  persona: string
  clientId: string
  clients: { id: string; businessName: string }[]
  selectedPersona: { id: string; displayName: string; shortDescription: string } | undefined
  needsClient: boolean
  onApply: (persona: string, clientId: string) => void
}) {
  const [draftPersona, setDraftPersona] = useState(persona)
  const [draftClientId, setDraftClientId] = useState(clientId)

  return (
    <div className="px-4 pb-4 space-y-4">
      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Persona</label>
        <select
          value={draftPersona}
          onChange={(e) => setDraftPersona(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm"
        >
          {AGENTS.map((agent) => <option key={agent.id} value={agent.id}>{agent.displayName}</option>)}
        </select>
        {selectedPersona && <p className="mt-2 text-xs text-muted-foreground">{selectedPersona.shortDescription}</p>}
      </div>

      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Client context</label>
        <select
          value={draftClientId}
          onChange={(e) => setDraftClientId(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm"
        >
          <option value="">No client</option>
          {clients.map((client) => <option key={client.id} value={client.id}>{client.businessName}</option>)}
        </select>
        <p className="mt-2 text-xs text-muted-foreground">
          {draftClientId ? `Active: ${clients.find((c) => c.id === draftClientId)?.businessName ?? 'selected'}` : 'Required for Account Manager. Optional otherwise.'}
        </p>
      </div>

      <DrawerFooter className="pt-2">
        <Button onClick={() => onApply(draftPersona, draftClientId)} className="w-full">
          Apply
        </Button>
        <DrawerClose asChild>
          <Button variant="outline" className="w-full">Cancel</Button>
        </DrawerClose>
      </DrawerFooter>
    </div>
  )
}

function ChatTerminal({
  selectedPersona, messages, loading, error, message, setMessage,
  sendMessage, clientId, workOrderBusy, createWorkOrderFromResponse,
  className,
}: {
  selectedPersona: { displayName: string } | undefined
  messages: Message[]
  loading: boolean
  error: string | null
  message: string
  setMessage: (v: string) => void
  sendMessage: (e: FormEvent<HTMLFormElement>) => void
  clientId: string
  workOrderBusy: number | null
  createWorkOrderFromResponse: (content: string, index: number) => void
  className?: string
}) {
  return (
    <Card className={`flex flex-col overflow-hidden ${className ?? ''}`}>
      {/* Desktop-only header */}
      <div className="hidden lg:block border-b border-border px-4 py-3">
        <div className="font-medium">{selectedPersona?.displayName ?? 'Agent'} Chat</div>
        <div className="text-xs text-muted-foreground">RouteLLM streaming with Postgres-backed turns.</div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3 sm:p-4">
        {messages.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            Ask a persona for strategy, client recommendations, or a tool run. The response streams here.
          </div>
        )}
        {messages.map((item, index) => (
          <div key={index} className={item.role === 'user' ? 'ml-auto max-w-[88%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground' : 'mr-auto max-w-[88%] rounded-lg bg-muted px-3 py-2 text-sm'}>
            <div className="whitespace-pre-wrap">{item.content || (loading && index === messages.length - 1 ? 'Streaming…' : '')}</div>
            {item.role === 'assistant' && clientId && item.content.trim() && (
              <button type="button" onClick={() => createWorkOrderFromResponse(item.content, index)} disabled={workOrderBusy === index} className="mt-2 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground">
                {workOrderBusy === index ? 'Creating work order…' : 'Create work order from response'}
              </button>
            )}
          </div>
        ))}
      </div>

      {error && <div className="border-t border-destructive/30 px-4 py-2 text-sm text-destructive">{error}</div>}
      <form onSubmit={sendMessage} className="flex gap-2 border-t border-border p-2 sm:p-3">
        <input
          aria-label="Message to selected AI persona"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Ask the agent…"
          className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <Button type="submit" disabled={loading || !message.trim()}>{loading ? 'Sending' : 'Send'}</Button>
      </form>
    </Card>
  )
}
