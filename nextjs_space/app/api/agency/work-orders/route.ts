export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireInternalUser } from '@/lib/authz'
import { prisma } from '@/lib/db'
import { diagnosticId, logServerError, logServerEvent } from '@/lib/diagnostics'
import {
  BETA_WORK_ORDER_TEMPLATES,
  WORK_ORDER_OWNER_KINDS,
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_STATUSES,
  defaultApprovalStatus,
  normalizeEnum,
  sanitizeEvidenceLinks,
  sanitizeText,
} from '@/lib/work-orders'

const WORK_ORDER_INCLUDE = {
  client: { select: { id: true, businessName: true, industry: true } },
  author: { select: { name: true, email: true } },
  events: {
    orderBy: { createdAt: 'desc' as const },
    take: 10,
    include: { actor: { select: { name: true, email: true } } },
  },
}

function clean(value: unknown): string {
  return String(value ?? '').trim()
}

function badRequest(error: string, fieldErrors: Record<string, string> = {}) {
  return NextResponse.json({ error, fieldErrors }, { status: 400 })
}

function parseDueAt(value: unknown): Date | null {
  const text = clean(value)
  if (!text) return null
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? null : date
}

function templateFor(type: string) {
  return BETA_WORK_ORDER_TEMPLATES.find((template) => template.type === type) ?? null
}

export async function GET() {
  const auth = await requireInternalUser()
  if ('response' in auth) return auth.response
  const items = await prisma.clientWorkOrder.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: WORK_ORDER_INCLUDE,
  })
  return NextResponse.json({ items })
}

export async function POST(req: NextRequest) {
  const auth = await requireInternalUser()
  if ('response' in auth) return auth.response

  const body = await req.json().catch(() => ({}))
  const clientId = clean(body?.clientId)
  const rawType = clean(body?.type).toUpperCase()
  const template = templateFor(rawType)
  const type = template?.type ?? rawType
  const title = sanitizeText(body?.title, 200) ?? template?.label ?? ''
  const goal = sanitizeText(body?.goal, 2_000)
  const outputMarkdown = sanitizeText(body?.outputMarkdown, 50_000)
  const internalNotes = sanitizeText(body?.internalNotes, 10_000)
  const clientSummary = sanitizeText(body?.clientSummary, 10_000)
  const evidenceLinks = sanitizeEvidenceLinks(body?.evidenceLinks)
  const status = normalizeEnum(body?.status, WORK_ORDER_STATUSES, outputMarkdown ? 'REVIEW' : 'DRAFT')
  const priority = normalizeEnum(body?.priority, WORK_ORDER_PRIORITIES, template?.defaultPriority ?? 'MEDIUM')
  const ownerKind = normalizeEnum(body?.ownerKind, WORK_ORDER_OWNER_KINDS, template?.defaultOwnerKind ?? 'AI_PERSONA')
  const ownerLabel = sanitizeText(body?.ownerLabel, 120)
  const approvalStatus = defaultApprovalStatus(type, body?.approvalStatus)
  const dueAt = parseDueAt(body?.dueAt)

  const fieldErrors: Record<string, string> = {}
  if (!clientId) fieldErrors.clientId = 'Client is required.'
  if (!type) fieldErrors.type = 'Template is required.'
  if (!title) fieldErrors.title = 'Title is required.'
  if (!goal) fieldErrors.goal = 'Goal is required.'
  if (Object.keys(fieldErrors).length > 0) return badRequest('Work order could not be created.', fieldErrors)

  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } })
  if (!client) return NextResponse.json({ error: 'Client not found.' }, { status: 404 })

  try {
    const item = await prisma.clientWorkOrder.create({
      data: {
        clientId,
        authorId: auth.userId,
        type,
        title,
        status,
        inputJson: {
          goal,
          requiredEvidence: template?.requiredEvidence ?? [],
          aiInstructions: template?.aiInstructions ?? null,
          deliverable: template?.description ?? null,
          nextAction: sanitizeText(body?.nextAction, 1_000),
        },
        outputMarkdown,
        generatedAt: outputMarkdown ? new Date() : null,
        ownerKind,
        ownerLabel,
        priority,
        dueAt,
        evidenceLinks,
        internalNotes,
        clientSummary,
        approvalStatus,
        approvedAt: approvalStatus === 'APPROVED' ? new Date() : null,
        events: {
          create: {
            actorId: auth.userId,
            type: 'CREATED',
            toStatus: status,
            notes: goal,
          },
        },
      },
      include: WORK_ORDER_INCLUDE,
    })
    logServerEvent('work_order.create.succeeded', { userId: auth.userId, workOrderId: item.id, clientId, type, status, approvalStatus })
    return NextResponse.json({ item }, { status: 201 })
  } catch (error) {
    const id = diagnosticId('work_order_create')
    logServerError('work_order.create.failed', error, { diagnosticId: id, userId: auth.userId, clientId, type })
    return NextResponse.json({ error: 'Work order could not be created. Your form data was preserved; retry after checking database health.', diagnosticId: id }, { status: 500 })
  }
}
