import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

type Bucket = {
  count: number
  resetAt: number
}

type Store = Map<string, Bucket>

type RateLimitOptions = {
  bucket: string
  limit: number
  windowMs: number
  identifier?: string | null
}

type RateLimitResult = {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: number
}

const MAX_BUCKETS = 10_000
const globalStore = globalThis as typeof globalThis & { __legacyLegionRateLimitStore?: Store }

function store(): Store {
  if (!globalStore.__legacyLegionRateLimitStore) globalStore.__legacyLegionRateLimitStore = new Map()
  return globalStore.__legacyLegionRateLimitStore
}

function firstHeaderValue(value: string | null): string | null {
  return value?.split(',')[0]?.trim() || null
}

export function clientIdentifier(req: NextRequest): string {
  return (
    firstHeaderValue(req.headers.get('x-forwarded-for')) ||
    firstHeaderValue(req.headers.get('x-real-ip')) ||
    req.ip ||
    'unknown'
  )
}

function pruneExpiredBuckets(buckets: Store, now: number) {
  if (buckets.size < MAX_BUCKETS) return
  for (const [key, value] of buckets) {
    if (value.resetAt <= now) buckets.delete(key)
  }
}

export function checkRateLimit(req: NextRequest, options: RateLimitOptions, now = Date.now()): RateLimitResult {
  const buckets = store()
  pruneExpiredBuckets(buckets, now)

  const identifier = options.identifier || clientIdentifier(req)
  const key = `${options.bucket}:${identifier}`
  const current = buckets.get(key)

  if (!current || current.resetAt <= now) {
    const resetAt = now + options.windowMs
    buckets.set(key, { count: 1, resetAt })
    return { allowed: true, limit: options.limit, remaining: options.limit - 1, resetAt }
  }

  if (current.count >= options.limit) {
    return { allowed: false, limit: options.limit, remaining: 0, resetAt: current.resetAt }
  }

  current.count += 1
  return { allowed: true, limit: options.limit, remaining: options.limit - current.count, resetAt: current.resetAt }
}

export function rateLimited(result: RateLimitResult): NextResponse {
  const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000))
  return NextResponse.json(
    { error: 'Too many requests' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
      },
    },
  )
}
