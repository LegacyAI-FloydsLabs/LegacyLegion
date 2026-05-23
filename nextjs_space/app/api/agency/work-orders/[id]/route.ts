export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { requireAdminUser, requireInternalUser } from '@/lib/authz'
import { prisma } from '@/lib/db'
import { upsertClientWorkOrderMemory } from '@/lib/agents/memory'
import { diagnosticId, logServerError, logServerEvent } from '@/lib/diagnostics'
import {
  WORK_ORDER_APPROVAL_STATUSES,
  WORK_ORDER_OWNER_KINDS,
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_STATUSES,
  normalizeEnum,
  sanitizeEvidenceLinks,
  sanitizeText,
} from '@/lib/work-orders'

const WORK_ORDER_INCLUDE = {
  client: { select: { id: true, businessName: true, industry: true, city: true, state: true } },
  author: { select: { name: true, email: true } },
  events: {
    orderBy: { createdAt: 'desc' as const },
    take: 20,
    include: { actor: { select: { name: true, email: true } } },
  },
}

function canDeliver(approvalStatus: string): boolean {
  return approvalStatus === 'APPROVED' || approvalStatus === 'NOT_REQUIRED'
}

function parseDueAt(value: unknown): Date | null {
  const text = String(value ?? '').trim()
  if (!text) return null
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? null : date
}

async function memoryResult(workOrderId: string, status: string, outputMarkdown: string | null) {
  if (!outputMarkdown || !['REVIEW', 'DELIVERED'].includes(status)) {
    return { ok: true, skipped: true as const, reason: 'WORK_ORDER_NOT_READY_FOR_MEMORY' }
  }
  try {
    return await upsertClientWorkOrderMemory(workOrderId)
  } catch (error) {
    logServerError('work_order.memory_upsert.failed', error, { workOrderId })
    return { ok: false, skipped: true as const, reason: 'MEMORY_UPSERT_FAILED' }
  }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireInternalUser()
  if ('response' in auth) return auth.response
  const item = await prisma.clientWorkOrder.findUnique({
    where: { id: params.id },
    include: WORK_ORDER_INCLUDE,
  })
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ item })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireInternalUser()
  if ('response' in auth) return auth.response

  const existing = await prisma.clientWorkOrder.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (existing.status === 'ARCHIVED') return NextResponse.json({ error: 'Archived work orders cannot be edited.' }, { status: 409 })

  const body = await req.json().catch(() => ({}))
  const data: Prisma.ClientWorkOrderUpdateInput = {}
  const eventNotes = sanitizeText(body?.eventNotes ?? body?.notes, 2_000)
  const currentStatus = normalizeEnum(existing.status, WORK_ORDER_STATUSES, 'DRAFT')
  const currentApprovalStatus = normalizeEnum(existing.approvalStatus, WORK_ORDER_APPROVAL_STATUSES, 'PENDING')
  const currentOwnerKind = normalizeEnum(existing.ownerKind, WORK_ORDER_OWNER_KINDS, 'AI_PERSONA')
  const currentPriority = normalizeEnum(existing.priority, WORK_ORDER_PRIORITIES, 'MEDIUM')

  const nextStatus = 'status' in body ? normalizeEnum(body.status, WORK_ORDER_STATUSES, currentStatus) : currentStatus
  const nextApprovalStatus = 'approvalStatus' in body
    ? normalizeEnum(body.approvalStatus, WORK_ORDER_APPROVAL_STATUSES, currentApprovalStatus)
    : currentApprovalStatus

  if (nextStatus === 'DELIVERED' && !canDeliver(nextApprovalStatus)) {
    return NextResponse.json({ error: 'Approval is required before delivery.' }, { status: 409 })
  }

  if ('title' in body) data.title = sanitizeText(body.title, 200) ?? existing.title
  if ('outputMarkdown' in body) {
    data.outputMarkdown = sanitizeText(body.outputMarkdown, 50_000)
    data.generatedAt = data.outputMarkdown ? existing.generatedAt ?? new Date() : null
  }
  if ('ownerKind' in body) data.ownerKind = normalizeEnum(body.ownerKind, WORK_ORDER_OWNER_KINDS, currentOwnerKind)
  if ('ownerLabel' in body) data.ownerLabel = sanitizeText(body.ownerLabel, 120)
  if ('priority' in body) data.priority = normalizeEnum(body.priority, WORK_ORDER_PRIORITIES, currentPriority)
  if ('dueAt' in body) data.dueAt = parseDueAt(body.dueAt)
  if ('evidenceLinks' in body) data.evidenceLinks = sanitizeEvidenceLinks(body.evidenceLinks)
  if ('internalNotes' in body) data.internalNotes = sanitizeText(body.internalNotes, 10_000)
  if ('clientSummary' in body) data.clientSummary = sanitizeText(body.clientSummary, 10_000)

  if (nextStatus !== existing.status) {
    data.status = nextStatus
    if (nextStatus === 'DELIVERED') data.deliveredAt = new Date()
  }
  if (nextApprovalStatus !== existing.approvalStatus) {
    data.approvalStatus = nextApprovalStatus
    data.approvedAt = nextApprovalStatus === 'APPROVED' ? new Date() : null
  }

  const eventType = nextStatus !== existing.status
    ? 'STATUS_CHANGED'
    : nextApprovalStatus !== existing.approvalStatus
      ? 'APPROVAL_CHANGED'
      : 'UPDATED'

  try {
    const item = await prisma.clientWorkOrder.update({
      where: { id: params.id },
      data: {
        ...data,
        events: {
          create: {
            actorId: auth.userId,
            type: eventType,
            fromStatus: nextStatus !== existing.status ? existing.status : existing.approvalStatus,
            toStatus: nextStatus !== existing.status ? nextStatus : nextApprovalStatus,
            notes: eventNotes,
          },
        },
      },
      include: WORK_ORDER_INCLUDE,
    })
    logServerEvent('work_order.update.succeeded', { userId: auth.userId, workOrderId: item.id, status: item.status, approvalStatus: item.approvalStatus })

    const memory = await memoryResult(item.id, item.status, item.outputMarkdown)
    return NextResponse.json({ item, memory })
  } catch (error) {
    const id = diagnosticId('work_order_update')
    logServerError('work_order.update.failed', error, { diagnosticId: id, userId: auth.userId, workOrderId: params.id })
    return NextResponse.json({ error: 'Work order could not be saved. Your latest action was not applied; retry after checking database health.', diagnosticId: id }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminUser()
  if ('response' in auth) return auth.response

  const existing = await prisma.clientWorkOrder.findUnique({ where: { id: params.id }, select: { id: true, status: true } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (existing.status === 'ARCHIVED') return NextResponse.json({ ok: true, archived: true })

  try {
    const item = await prisma.clientWorkOrder.update({
      where: { id: params.id },
      data: {
        status: 'ARCHIVED',
        events: {
          create: {
            actorId: auth.userId,
            type: 'ARCHIVED',
            fromStatus: existing.status,
            toStatus: 'ARCHIVED',
            notes: 'Archived from work order detail.',
          },
        },
      },
      include: WORK_ORDER_INCLUDE,
    })

    logServerEvent('work_order.archive.succeeded', { userId: auth.userId, workOrderId: item.id })

    return NextResponse.json({ ok: true, archived: true, item })
  } catch (error) {
    const id = diagnosticId('work_order_archive')
    logServerError('work_order.archive.failed', error, { diagnosticId: id, userId: auth.userId, workOrderId: params.id })
    return NextResponse.json({ error: 'Work order could not be archived. No delivery data was removed; retry after checking database health.', diagnosticId: id }, { status: 500 })
  }
}
