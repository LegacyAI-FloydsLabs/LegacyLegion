// Server-side Pinecone client for SEO intelligence lookups.
// Uses the configured endpoints and the embedding API.

const PRIMARY_HOST = process.env.PINECONE_PRIMARY_HOST ?? 'https://rag-context-optimized-p695ua0.svc.aped-4627-b74a.pinecone.io'
const FALLBACK_HOST = 'https://rag-context-p695ua0.svc.aped-4627-b74a.pinecone.io'
const FIXED_HOST = 'https://rag-context-fixed-p695ua0.svc.aped-4627-b74a.pinecone.io'
const API_KEY = process.env.PINECONE_API_KEY ?? ''

async function embed(text: string): Promise<number[] | null> {
  // Use Pinecone inference for embeddings (multilingual-e5-large, 1024 dims)
  try {
    const res = await fetch('https://api.pinecone.io/embed', {
      method: 'POST',
      headers: {
        'Api-Key': API_KEY,
        'Content-Type': 'application/json',
        'X-Pinecone-API-Version': '2024-10',
      },
      body: JSON.stringify({
        model: 'multilingual-e5-large',
        parameters: { input_type: 'query', truncate: 'END' },
        inputs: [{ text }],
      }),
    })
    if (!res.ok) return null
    const data: any = await res.json().catch(() => null)
    const vec = data?.data?.[0]?.values
    if (Array.isArray(vec) && vec.length > 0) return vec
    return null
  } catch {
    return null
  }
}

export interface PineconeMatch {
  id: string
  score: number
  metadata?: Record<string, any>
}

async function queryHost(host: string, vector: number[], topK = 5): Promise<PineconeMatch[] | null> {
  try {
    const res = await fetch(`${host}/query`, {
      method: 'POST',
      headers: {
        'Api-Key': API_KEY,
        'Content-Type': 'application/json',
        'X-Pinecone-API-Version': '2024-10',
      },
      body: JSON.stringify({ vector, topK, includeMetadata: true }),
    })
    if (!res.ok) return null
    const data: any = await res.json().catch(() => null)
    const matches = data?.matches
    if (!Array.isArray(matches)) return null
    return matches.map((m: any) => ({
      id: String(m?.id ?? ''),
      score: Number(m?.score ?? 0),
      metadata: m?.metadata ?? {},
    }))
  } catch {
    return null
  }
}

export async function searchSEOIntelligence(query: string, topK = 5): Promise<PineconeMatch[]> {
  if (!API_KEY) return []
  const vec = await embed(query)
  if (!vec) return []
  // Try primary, then fallbacks
  for (const host of [PRIMARY_HOST, FALLBACK_HOST, FIXED_HOST]) {
    const matches = await queryHost(host, vec, topK)
    if (matches && matches.length > 0) return matches
  }
  return []
}

export function summarizeMatches(matches: PineconeMatch[]): string {
  if (!Array.isArray(matches) || matches.length === 0) {
    return 'No directly indexed insights matched this query.'
  }
  const lines = matches.slice(0, 5).map((m, i) => {
    const md = m?.metadata ?? {}
    const title = String(md?.title ?? md?.heading ?? md?.url ?? `Insight ${i + 1}`)
    const snippet = String(md?.text ?? md?.chunk ?? md?.content ?? '').slice(0, 200)
    return `${i + 1}. ${title}${snippet ? ' — ' + snippet : ''}`
  })
  return lines.join('\n')
}
