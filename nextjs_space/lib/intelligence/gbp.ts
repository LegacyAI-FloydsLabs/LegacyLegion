export interface GBPSnapshot {
  sourceUrl: string
  fetchedAt: string
  name: string | null
  rating: number | null
  reviewCount: number
  photoCount: number
  primaryCategory: string | null
  categories: string[]
  address: string | null
  website: string | null
  placeId: string | null
  parsingStrategy: string
}

export const GBP_PARSING_STRATEGY = [
  'Fetch the public Google Maps/Business Profile URL with a browser user agent.',
  'Prefer the public tbm=map preload endpoint linked from the page; it returns XSSI-prefixed JSON and does not require an API key.',
  'Parse stable place payload fields first, then fall back to counting visible public photo records.',
  'Reject empty or malformed payloads instead of fabricating counts.',
].join(' ')

const USER_AGENT = 'Mozilla/5.0 (compatible; LegacyLegion Intelligence; +https://legacyai.local)'

function stripXssi(text: string) {
  return text.replace(/^\)\]\}'\n/, '')
}

function asNumber(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(/,/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

function asString(value: unknown) {
  const text = typeof value === 'string' ? value.trim() : ''
  return text || null
}

function extractMapsDataUrl(html: string, sourceUrl: string) {
  const preload = html.match(/<link href="([^"]*tbm=map[^"]*)"/)?.[1]
  if (preload) return new URL(preload.replace(/&amp;/g, '&'), 'https://www.google.com').toString()
  if (sourceUrl.includes('tbm=map')) return sourceUrl
  return null
}

function parsePayload(text: string) {
  return JSON.parse(stripXssi(text))
}

function firstPlace(data: any) {
  const direct = data?.[0]?.[1]?.[0]?.[14]
  if (Array.isArray(direct)) return direct
  const queue = [data]
  while (queue.length) {
    const current = queue.shift()
    if (!Array.isArray(current)) continue
    if (typeof current[11] === 'string' && Array.isArray(current[13]) && Array.isArray(current[37])) return current
    for (const item of current) if (Array.isArray(item)) queue.push(item)
  }
  return null
}

function countPhotoRecords(node: unknown): number {
  if (!Array.isArray(node)) return 0
  let count = 0
  const stack = [node]
  while (stack.length) {
    const current = stack.pop()
    if (!Array.isArray(current)) continue
    if (current[20] === 'Photo') count++
    for (const item of current) if (Array.isArray(item)) stack.push(item)
  }
  return count
}

function normalizeGoogleUrl(url: string) {
  if (url.startsWith('/url?')) {
    const parsed = new URL(url, 'https://www.google.com')
    return parsed.searchParams.get('q') ?? url
  }
  return url
}

export function parsePublicGBPData(data: unknown, sourceUrl: string): GBPSnapshot {
  const place = firstPlace(data as any)
  if (!place) throw new Error('Google Maps payload did not include a place record.')

  const categories = (Array.isArray(place[13]) ? place[13] : []).map(asString).filter(Boolean) as string[]
  const explicitPhotoCount = asNumber(place?.[37]?.[8]?.[0]?.[0]?.[1])
  const photoRecordCount = countPhotoRecords(place)
  const reviewCount = asNumber(place?.[37]?.[1]) ?? 0

  const snapshot: GBPSnapshot = {
    sourceUrl,
    fetchedAt: new Date().toISOString(),
    name: asString(place[11]) ?? asString((data as any)?.[0]?.[0]),
    rating: asNumber(place?.[4]?.[7]),
    reviewCount,
    photoCount: Math.max(explicitPhotoCount ?? 0, photoRecordCount),
    primaryCategory: categories[0] ?? null,
    categories,
    address: asString(place[18]) ?? asString(place[39]),
    website: asString(place?.[7]?.[1]) ?? (asString(place?.[7]?.[0]) ? normalizeGoogleUrl(String(place[7][0])) : null),
    placeId: asString(place[10]),
    parsingStrategy: GBP_PARSING_STRATEGY,
  }

  if (snapshot.reviewCount <= 0) throw new Error('Google Maps payload did not expose a non-zero review count.')
  if (snapshot.photoCount <= 0) throw new Error('Google Maps payload did not expose a non-zero photo count.')
  if (!snapshot.primaryCategory) throw new Error('Google Maps payload did not expose a primary category.')
  return snapshot
}

export async function fetchPublicGBP(profileUrl: string): Promise<GBPSnapshot> {
  const sourceUrl = String(profileUrl ?? '').trim()
  if (!sourceUrl) throw new Error('profileUrl is required.')

  const firstResponse = await fetch(sourceUrl, { headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/json' } })
  if (!firstResponse.ok) throw new Error(`Google public profile fetch returned HTTP ${firstResponse.status}.`)
  const firstText = await firstResponse.text()

  const dataUrl = extractMapsDataUrl(firstText, sourceUrl)
  if (dataUrl) {
    const dataResponse = await fetch(dataUrl, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json,text/plain' } })
    if (!dataResponse.ok) throw new Error(`Google Maps public data fetch returned HTTP ${dataResponse.status}.`)
    return parsePublicGBPData(parsePayload(await dataResponse.text()), sourceUrl)
  }

  return parsePublicGBPData(parsePayload(firstText), sourceUrl)
}
