export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { requireInternalUser } from '@/lib/authz'
import { prisma } from '@/lib/db'
import { searchSEOIntelligence, summarizeMatches } from '@/lib/pinecone'
import { AGENCY_TOOLS, AgencyToolType, buildAgencyPrompt } from '@/lib/agency-prompts'
import { upsertClientWorkOrderMemory } from '@/lib/agents/memory'
import { defaultApprovalStatus, betaWorkOrderTemplate } from '@/lib/work-orders'
import { diagnosticId, logServerError, logServerEvent } from '@/lib/diagnostics'

const VALID_TYPES = new Set(AGENCY_TOOLS.map((tool) => tool.type))
const GENERATION_TIMEOUT_MS = 60_000

async function safeMemoryUpsert(workOrderId: string) {
  try {
    await upsertClientWorkOrderMemory(workOrderId)
  } catch (error) {
    logServerError('work_order.memory_upsert.failed', error, { workOrderId })
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireInternalUser()
  if ('response' in auth) return auth.response
  const userId = auth.userId

  const apiKey = process.env.ABACUSAI_API_KEY
  if (!apiKey) {
    logServerEvent('ai.generate.not_configured', { userId, clientId: params.id })
    return new Response('Generation service unavailable', { status: 503 })
  }

  const body = await req.json().catch(() => ({}))
  const type = String(body?.type ?? '').toUpperCase() as AgencyToolType
  const userInput = String(body?.input ?? '').trim()
  if (!VALID_TYPES.has(type)) return new Response('Invalid tool type', { status: 400 })

  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      intelligence: true,
      workOrders: {
        where: { status: { in: ['DRAFT', 'IN_PROGRESS', 'REVIEW'] } },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: { title: true, type: true, status: true, approvalStatus: true },
      },
    },
  })
  if (!client) return new Response('Client not found', { status: 404 })

  const { system, user, intelQuery } = buildAgencyPrompt(type, {
    client: {
      businessName: client.businessName,
      industry: client.industry,
      city: client.city,
      state: client.state,
      website: client.website,
      gbpUrl: client.gbpUrl,
      tier: client.tier,
      monthlyMRR: client.monthlyMRR,
      strategyBrief: client.strategyBrief,
      liveGBP: client.intelligence?.gbpSnapshotJson as any,
    },
    intelligenceContext: '',
    userInput,
  })

  const matches = await searchSEOIntelligence(intelQuery, 6)
  const intelContext = summarizeMatches(matches)
  const finalUser = user.replace('[no indexed insights matched — proceed using best practice]', intelContext || '[no indexed insights matched — proceed using best practice]')
  const activeWork = client.workOrders.length > 0
    ? client.workOrders.map((item) => `- ${item.title} (${item.type}, ${item.status}, ${item.approvalStatus})`).join('\n')
    : '- No active work orders yet.'
  const userPrompt = `${finalUser}\n\n<ACTIVE_WORK_ORDERS>\n${activeWork}\n</ACTIVE_WORK_ORDERS>${intelContext ? `\n\nKnowledge-base context to weave in:\n${intelContext}` : ''}`

  const tool = AGENCY_TOOLS.find((item) => item.type === type)
  const template = betaWorkOrderTemplate(type)
  const approvalStatus = defaultApprovalStatus(type, undefined)

  const workOrder = await prisma.clientWorkOrder.create({
    data: {
      clientId: client.id,
      authorId: userId,
      type,
      title: `${tool?.label ?? type} — ${client.businessName}`,
      status: 'IN_PROGRESS',
      inputJson: {
        userInput,
        intelQuery,
        requiredEvidence: template?.requiredEvidence ?? [],
        aiInstructions: template?.aiInstructions ?? null,
      } as any,
      intelligenceJson: { matches } as any,
      ownerKind: template?.defaultOwnerKind ?? 'AI_PERSONA',
      priority: template?.defaultPriority ?? 'MEDIUM',
      approvalStatus,
      approvedAt: approvalStatus === 'APPROVED' ? new Date() : null,
      events: {
        create: {
          actorId: userId,
          type: 'CREATED',
          toStatus: 'IN_PROGRESS',
          notes: userInput || template?.description || null,
        },
      },
    },
  })
  logServerEvent('ai.generate.work_order_created', { userId, clientId: client.id, workOrderId: workOrder.id, type, approvalStatus })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS)
  let upstream: Response
  try {
    upstream = await fetch('https://routellm.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'route-llm',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userPrompt },
        ],
        stream: true,
        max_tokens: 1800,
      }),
      signal: controller.signal,
    })
  } catch (error) {
    clearTimeout(timeout)
    await prisma.clientWorkOrder.update({
      where: { id: workOrder.id },
      data: {
        status: 'DRAFT',
        events: { create: { actorId: userId, type: 'STATUS_CHANGED', fromStatus: 'IN_PROGRESS', toStatus: 'DRAFT', notes: 'Generation request failed before streaming.' } },
      },
    })
    const id = diagnosticId('ai_generate')
    logServerError('ai.generate.request_failed', error, { diagnosticId: id, userId, clientId: client.id, workOrderId: workOrder.id, type })
    return new Response(error instanceof Error && error.name === 'AbortError' ? `Generation timed out (${id}); work order was preserved as Draft.` : `Generation service unavailable (${id}); work order was preserved as Draft.`, { status: 502 })
  }

  if (!upstream.ok || !upstream.body) {
    clearTimeout(timeout)
    await prisma.clientWorkOrder.update({
      where: { id: workOrder.id },
      data: {
        status: 'DRAFT',
        events: { create: { actorId: userId, type: 'STATUS_CHANGED', fromStatus: 'IN_PROGRESS', toStatus: 'DRAFT', notes: 'Generation service returned unavailable.' } },
      },
    })
    const id = diagnosticId('ai_generate')
    logServerError('ai.generate.upstream_unavailable', new Error(`upstream status ${upstream.status}`), { diagnosticId: id, userId, clientId: client.id, workOrderId: workOrder.id, type })
    return new Response(`Generation service unavailable (${id}); work order was preserved as Draft.`, { status: 502 })
  }

  const ts = new TransformStream()
  const writer = ts.writable.getWriter()
  const encoder = new TextEncoder()
  const reader = upstream.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let partial = ''

  await writer.write(encoder.encode(`event: meta\ndata: ${JSON.stringify({ workOrderId: workOrder.id })}\n\n`))

  ;(async () => {
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        partial += decoder.decode(value, { stream: true })
        const lines = partial.split('\n')
        partial = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') {
            await writer.write(encoder.encode('data: [DONE]\n\n'))
            continue
          }
          try {
            const parsed = JSON.parse(data)
            const delta = parsed?.choices?.[0]?.delta?.content ?? ''
            if (delta) buffer += delta
          } catch {
            // Keep streaming even if a provider frame is malformed.
          }
          await writer.write(encoder.encode(`${line}\n`))
        }
      }
      if (buffer) {
        await prisma.clientWorkOrder.update({
          where: { id: workOrder.id },
          data: {
            outputMarkdown: buffer,
            status: 'REVIEW',
            generatedAt: new Date(),
            events: { create: { actorId: userId, type: 'STATUS_CHANGED', fromStatus: 'IN_PROGRESS', toStatus: 'REVIEW', notes: 'Generation completed; ready for human review.' } },
          },
        })
        await safeMemoryUpsert(workOrder.id)
        logServerEvent('ai.generate.completed', { userId, clientId: client.id, workOrderId: workOrder.id, type, bytes: buffer.length })
      } else {
        await prisma.clientWorkOrder.update({
          where: { id: workOrder.id },
          data: {
            status: 'DRAFT',
            events: { create: { actorId: userId, type: 'STATUS_CHANGED', fromStatus: 'IN_PROGRESS', toStatus: 'DRAFT', notes: 'Generation produced no content.' } },
          },
        })
        logServerEvent('ai.generate.empty', { userId, clientId: client.id, workOrderId: workOrder.id, type })
      }
    } catch (error) {
      logServerError('ai.generate.stream_failed', error, { userId, clientId: client.id, workOrderId: workOrder.id, type })
      try {
        await prisma.clientWorkOrder.update({
          where: { id: workOrder.id },
          data: {
            status: 'DRAFT',
            events: { create: { actorId: userId, type: 'STATUS_CHANGED', fromStatus: 'IN_PROGRESS', toStatus: 'DRAFT', notes: 'Generation stream failed.' } },
          },
        })
      } catch {
        // Preserve the stream failure; there is no safe secondary recovery here.
      }
    } finally {
      clearTimeout(timeout)
      try { await reader.cancel() } catch { /* upstream already closed */ }
      try { await writer.close() } catch { /* downstream already closed */ }
    }
  })()

  return new Response(ts.readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
