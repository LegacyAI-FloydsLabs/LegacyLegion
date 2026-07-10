export const dynamic = 'force-dynamic'
export const maxDuration = 120

import { NextRequest, NextResponse } from 'next/server'
import { requireInternalUser } from '@/lib/authz'
import { checkRateLimit, rateLimited } from '@/lib/rate-limit'
import { getLLMProvider, type LLMProviderId } from '@/lib/llm-providers'
import { MarketingRuntimeError, runMarketingRuntime } from '@/lib/agents/marketing-runtime'
import { diagnosticId, logServerError, logServerEvent } from '@/lib/diagnostics'

const MARKETING_RUNTIME_WINDOW_MS = 60 * 60 * 1000
const MARKETING_RUNTIME_LIMIT = 12

function marketingRuntimeEnabled() {
  if (process.env.VERCEL_ENV !== 'preview') return true
  return process.env.MARKETING_RUNTIME_ENABLED === 'true'
}

export async function POST(req: NextRequest) {
  const auth = await requireInternalUser()
  if ('response' in auth) return auth.response

  if (!marketingRuntimeEnabled()) {
    logServerEvent('ai.marketing_runtime.disabled', { userId: auth.userId, environment: process.env.VERCEL_ENV ?? 'unknown' })
    return NextResponse.json({
      error: 'Marketing runtime is disabled for this Preview deployment until Preview credentials are isolated.',
      code: 'MARKETING_RUNTIME_DISABLED',
    }, { status: 403 })
  }

  const limit = checkRateLimit(req, {
    bucket: 'agent-marketing-runtime',
    limit: MARKETING_RUNTIME_LIMIT,
    windowMs: MARKETING_RUNTIME_WINDOW_MS,
    identifier: auth.userId,
  })
  if (!limit.allowed) return rateLimited(limit)

  const apiKey = process.env.ABACUSAI_API_KEY
  if (!apiKey) {
    logServerEvent('ai.marketing_runtime.not_configured', { userId: auth.userId })
    return NextResponse.json({ error: 'Generation service unavailable' }, { status: 503 })
  }

  const body = await req.json().catch(() => ({}))
  const goal = String(body?.goal ?? body?.message ?? '').trim()
  if (!goal) return NextResponse.json({ error: 'Marketing mission is required.' }, { status: 400 })
  if (goal.length > 4_000) return NextResponse.json({ error: 'Marketing mission must be 4,000 characters or less.' }, { status: 400 })

  const clientId = String(body?.clientId ?? '').trim() || undefined
  const cashflowNotes = String(body?.cashflowNotes ?? '').trim() || undefined
  const provider = getLLMProvider((body?.provider as LLMProviderId) || 'auto')

  try {
    logServerEvent('ai.marketing_runtime.requested', { userId: auth.userId, clientId, modelId: provider.modelId })
    const result = await runMarketingRuntime({
      userId: auth.userId,
      clientId,
      goal,
      cashflowNotes,
      apiKey,
      modelId: provider.modelId,
      signal: req.signal,
    })
    logServerEvent('ai.marketing_runtime.completed', {
      userId: auth.userId,
      clientId,
      threadId: result.threadId,
      workOrderId: result.workOrderId,
      stages: result.stages.length,
    })
    return NextResponse.json({ result })
  } catch (error) {
    if (error instanceof MarketingRuntimeError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
    }
    const id = diagnosticId('ai_marketing_runtime')
    logServerError('ai.marketing_runtime.failed', error, { diagnosticId: id, userId: auth.userId, clientId })
    return NextResponse.json({ error: `Marketing runtime failed (${id}).` }, { status: 500 })
  }
}
