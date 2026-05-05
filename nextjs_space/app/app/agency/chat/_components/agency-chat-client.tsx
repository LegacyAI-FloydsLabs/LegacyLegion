'use client'

import { FormEvent, useMemo, useState } from 'react'
import { AGENTS } from '@/lib/agents/registry'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

type Message = { role: 'user' | 'assistant' | 'system'; content: string }

export function AgencyChatClient({ clients }: { clients: { id: string; businessName: string }[] }) {
  const [persona, setPersona] = useState('marketing-guru')
  const [clientId, setClientId] = useState('')
  const [message, setMessage] = useState('')
  const [threadId, setThreadId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedPersona = useMemo(() => AGENTS.find((agent) => agent.id === persona), [persona])
  const needsClient = persona === 'account-manager'

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

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card className="p-4 space-y-4">
        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Persona</label>
          <select value={persona} onChange={(event) => setPersona(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
            {AGENTS.map((agent) => <option key={agent.id} value={agent.id}>{agent.displayName}</option>)}
          </select>
          {selectedPersona && <p className="mt-2 text-xs text-muted-foreground">{selectedPersona.shortDescription}</p>}
        </div>

        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Client context</label>
          <select value={clientId} onChange={(event) => setClientId(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
            <option value="">No client</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.businessName}</option>)}
          </select>
          <p className="mt-2 text-xs text-muted-foreground">Required for Account Manager. Optional for other personas.</p>
        </div>
      </Card>

      <Card className="flex min-h-[70vh] flex-col overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <div className="font-medium">{selectedPersona?.displayName ?? 'Agent'} Chat</div>
          <div className="text-xs text-muted-foreground">RouteLLM streaming with Postgres-backed turns.</div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              Ask a persona for strategy, client recommendations, or a tool run. The response streams here.
            </div>
          )}
          {messages.map((item, index) => (
            <div key={index} className={item.role === 'user' ? 'ml-auto max-w-[88%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground' : 'mr-auto max-w-[88%] whitespace-pre-wrap rounded-lg bg-muted px-3 py-2 text-sm'}>
              {item.content || (loading && index === messages.length - 1 ? 'Streaming…' : '')}
            </div>
          ))}
        </div>

        {error && <div className="border-t border-destructive/30 px-4 py-2 text-sm text-destructive">{error}</div>}
        <form onSubmit={sendMessage} className="flex gap-2 border-t border-border p-3">
          <input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Ask the agent…"
            className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <Button type="submit" disabled={loading || !message.trim()}>{loading ? 'Sending' : 'Send'}</Button>
        </form>
      </Card>
    </div>
  )
}
