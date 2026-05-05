'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

export function Intelligence() {
  const [query, setQuery] = useState('Indianapolis HVAC SEO competition')
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  async function search() {
    if (!query.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/pinecone/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, topK: 8 }),
      })
      if (!res.ok) {
        toast.error('Search failed')
        setMatches([])
        return
      }
      const data = await res.json()
      setMatches(data?.matches ?? [])
      if ((data?.matches?.length ?? 0) === 0) toast.info('No matches — try a different query')
    } catch {
      toast.error('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <Card><CardContent className="p-4">
        <form onSubmit={(e) => { e.preventDefault(); search() }} className="flex gap-2">
          <div className="flex items-center gap-2 flex-1 px-3 rounded-md border border-border bg-card">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the LegacyAI knowledge base…" className="border-0 focus-visible:ring-0 bg-transparent" />
          </div>
          <Button type="submit" disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}</Button>
        </form>
      </CardContent></Card>

      <div className="space-y-3">
        {matches.map((m, i) => (
          <Card key={m?.id ?? i}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <div className="font-medium text-sm">{m?.metadata?.title ?? m?.metadata?.heading ?? m?.metadata?.url ?? `Insight ${i + 1}`}</div>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                    {(m?.metadata?.text ?? m?.metadata?.chunk ?? m?.metadata?.content ?? '').slice(0, 600)}
                  </p>
                  {m?.metadata?.url && <a href={m.metadata.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-primary hover:underline">{m.metadata.url}</a>}
                </div>
                <span className="font-mono text-xs text-muted-foreground shrink-0">{(m?.score ?? 0).toFixed(3)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {!loading && matches.length === 0 && (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Run a search to surface insights.</CardContent></Card>
        )}
      </div>
    </div>
  )
}
