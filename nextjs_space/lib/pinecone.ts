// Server-side Pinecone client for SEO intelligence lookups and Phase 4 memory writes.
// Uses the configured endpoints and the Pinecone-hosted multilingual-e5-large embedding API.

const PRIMARY_HOST = process.env.PINECONE_PRIMARY_HOST ?? 'https://rag-context-optimized-p695ua0.svc.aped-4627-b74a.pinecone.io'
const FALLBACK_HOST = 'https://rag-context-p695ua0.svc.aped-4627-b74a.pinecone.io'
const FIXED_HOST = 'https://rag-context-fixed-p695ua0.svc.aped-4627-b74a.pinecone.io'
function apiKey() { return process.env.PINECONE_API_KEY ?? '' }
const HOSTS = [PRIMARY_HOST, FALLBACK_HOST, FIXED_HOST]
const EMBED_MODEL = 'multilingual-e5-large'
const MAX_EMBED_CHARS = 8_000
const MAX_METADATA_TEXT_CHARS = 2_000

export interface PineconeMatch {
  id: string
  score: number
  metadata?: Record<string, any>
  text?: string
}

export interface PineconeVectorItem {
  id: string
  text: string
  metadata?: Record<string, any>
}

function pineconeHeaders() {
  return {
    'Api-Key': apiKey(),
    'Content-Type': 'application/json',
    'X-Pinecone-API-Version': '2024-10',
  }
}

function requireApiKey() {
  if (!apiKey()) throw new Error('PINECONE_API_KEY is required for Pinecone memory operations.')
}

function truncateForEmbedding(text: string) {
  return String(text ?? '').slice(0, MAX_EMBED_CHARS)
}

function truncateMetadataText(text: string) {
  return String(text ?? '').slice(0, MAX_METADATA_TEXT_CHARS)
}

function cleanMetadata(metadata: Record<string, any> | undefined, text: string) {
  const cleaned: Record<string, string | number | boolean | string[]> = { text: truncateMetadataText(text) }
  for (const [key, value] of Object.entries(metadata ?? {})) {
    if (value === undefined || value === null) continue
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') cleaned[key] = value
    else if (Array.isArray(value)) cleaned[key] = value.map((item) => String(item))
    else cleaned[key] = JSON.stringify(value).slice(0, MAX_METADATA_TEXT_CHARS)
  }
  return cleaned
}

async function embedMany(texts: string[], inputType: 'query' | 'passage'): Promise<number[][]> {
  requireApiKey()
  if (texts.length === 0) return []
  const res = await fetch('https://api.pinecone.io/embed', {
    method: 'POST',
    headers: pineconeHeaders(),
    body: JSON.stringify({
      model: EMBED_MODEL,
      parameters: { input_type: inputType, truncate: 'END' },
      inputs: texts.map((text) => ({ text: truncateForEmbedding(text) })),
    }),
  })
  if (!res.ok) throw new Error(`Pinecone embed returned HTTP ${res.status}: ${await res.text()}`)
  const data: any = await res.json().catch(() => null)
  const vectors = data?.data?.map((item: any) => item?.values)
  if (!Array.isArray(vectors) || vectors.some((vec: any) => !Array.isArray(vec) || vec.length === 0)) {
    throw new Error('Pinecone embed response did not include vectors.')
  }
  return vectors
}

async function embed(text: string): Promise<number[] | null> {
  try {
    return (await embedMany([text], 'query'))[0] ?? null
  } catch {
    return null
  }
}

async function tryHosts<T>(operation: (host: string) => Promise<T | null>): Promise<T | null> {
  let lastError: unknown = null
  for (const host of HOSTS) {
    try {
      const result = await operation(host)
      if (result !== null) return result
    } catch (error) {
      lastError = error
    }
  }
  if (lastError) throw lastError
  return null
}

function normalizeMatches(matches: any[]): PineconeMatch[] {
  return matches.map((match: any) => {
    const metadata = match?.metadata ?? {}
    return {
      id: String(match?.id ?? ''),
      score: Number(match?.score ?? 0),
      metadata,
      text: typeof metadata?.text === 'string' ? metadata.text : undefined,
    }
  }).filter((match) => match.id)
}

async function queryHost(host: string, vector: number[], topK = 5, namespace?: string): Promise<PineconeMatch[] | null> {
  const res = await fetch(`${host}/query`, {
    method: 'POST',
    headers: pineconeHeaders(),
    body: JSON.stringify({ vector, topK, namespace, includeMetadata: true }),
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Pinecone query returned HTTP ${res.status}: ${await res.text()}`)
  const data: any = await res.json().catch(() => null)
  const matches = data?.matches
  if (!Array.isArray(matches)) return null
  return normalizeMatches(matches)
}

export async function upsertVectors(items: PineconeVectorItem[], namespace: string): Promise<{ upsertedCount: number; namespace: string }> {
  requireApiKey()
  const cleanNamespace = String(namespace ?? '').trim()
  if (!cleanNamespace) throw new Error('namespace is required for Pinecone upserts.')
  if (!Array.isArray(items) || items.length === 0) return { upsertedCount: 0, namespace: cleanNamespace }
  const vectors = await embedMany(items.map((item) => item.text), 'passage')
  const payload = {
    namespace: cleanNamespace,
    vectors: items.map((item, index) => ({
      id: item.id,
      values: vectors[index],
      metadata: cleanMetadata({ ...item.metadata, namespace: cleanNamespace, sourceId: item.id }, item.text),
    })),
  }

  const result = await tryHosts(async (host) => {
    const res = await fetch(`${host}/vectors/upsert`, {
      method: 'POST',
      headers: pineconeHeaders(),
      body: JSON.stringify(payload),
    })
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`Pinecone upsert returned HTTP ${res.status}: ${await res.text()}`)
    const data: any = await res.json().catch(() => ({}))
    return { upsertedCount: Number(data?.upsertedCount ?? items.length), namespace: cleanNamespace }
  })

  if (!result) throw new Error('No configured Pinecone host accepted vector upsert.')
  return result
}

export async function searchNamespace(query: string, namespace: string, topK = 5): Promise<PineconeMatch[]> {
  if (!apiKey()) return []
  const cleanNamespace = String(namespace ?? '').trim()
  if (!cleanNamespace) throw new Error('namespace is required for scoped Pinecone search.')
  const vec = await embed(query)
  if (!vec) return []
  const matches = await tryHosts((host) => queryHost(host, vec, topK, cleanNamespace))
  return matches ?? []
}

export async function describeNamespaceVectorCount(namespace: string): Promise<number> {
  requireApiKey()
  const cleanNamespace = String(namespace ?? '').trim()
  if (!cleanNamespace) throw new Error('namespace is required for Pinecone stats.')
  const count = await tryHosts(async (host) => {
    const res = await fetch(`${host}/describe_index_stats`, {
      method: 'POST',
      headers: pineconeHeaders(),
      body: JSON.stringify({}),
    })
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`Pinecone describe_index_stats returned HTTP ${res.status}: ${await res.text()}`)
    const data: any = await res.json().catch(() => null)
    return Number(data?.namespaces?.[cleanNamespace]?.vectorCount ?? 0)
  })
  return count ?? 0
}

export async function searchSEOIntelligence(query: string, topK = 5): Promise<PineconeMatch[]> {
  if (!apiKey()) return []
  const vec = await embed(query)
  if (!vec) return []
  const matches = await tryHosts((host) => queryHost(host, vec, topK))
  return matches ?? []
}

export function summarizeMatches(matches: PineconeMatch[]): string {
  if (!Array.isArray(matches) || matches.length === 0) {
    return 'No directly indexed insights matched this query.'
  }
  const lines = matches.slice(0, 5).map((match, index) => {
    const metadata = match?.metadata ?? {}
    const title = String(metadata?.title ?? metadata?.heading ?? metadata?.url ?? `Insight ${index + 1}`)
    const snippet = String(match.text ?? metadata?.chunk ?? metadata?.content ?? '').slice(0, 200)
    return `${index + 1}. ${title}${snippet ? ' — ' + snippet : ''}`
  })
  return lines.join('\n')
}
