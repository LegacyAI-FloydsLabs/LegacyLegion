export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { isAdminRole, requireInternalUser } from '@/lib/authz'
import {
  cleanOptionalString,
  findCredentialMaterialField,
  isDecisionAccessStatus,
  normalizeAccessStatus,
  statusTimestampPatch,
} from '@/lib/client-access'
import { prisma } from '@/lib/db'

const ACCESS_INCLUDE = {
  requester: { select: { name: true, email: true } },
  approver: { select: { name: true, email: true } },
  events: {
    orderBy: { createdAt: 'desc' as const },
    take: 10,
    include: { actor: { select: { name: true, email: true } } },
  },
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string; requestId: string } }) {
  const auth = await requireInternalUser()
  if ('response' in auth) return auth.response

  const existing = await prisma.clientAccessRequest.findFirst({
    where: { id: params.requestId, clientId: params.id },
    select: { id: true, status: true, externalVaultRef: true },
  })
  if (!existing) return NextResponse.json({ error: 'Access request not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const data: Record<string, unknown> = {}
  const eventNotes = cleanOptionalString(body?.eventNotes ?? body?.decisionNotes ?? body?.requestNotes, 2_000)

  if ('resourceUrl' in body) data.resourceUrl = cleanOptionalString(body.resourceUrl)
  if ('externalVaultRef' in body) data.externalVaultRef = cleanOptionalString(body.externalVaultRef)
  if ('requestNotes' in body) data.requestNotes = cleanOptionalString(body.requestNotes, 2_000)
  if ('decisionNotes' in body) data.decisionNotes = cleanOptionalString(body.decisionNotes, 2_000)

  const nextStatus = 'status' in body ? normalizeAccessStatus(body.status) : null
  if ('status' in body && !nextStatus) return NextResponse.json({ error: 'Valid status required' }, { status: 400 })

  if (nextStatus && isDecisionAccessStatus(nextStatus) && !isAdminRole(auth.role)) {
    return NextResponse.json({ error: 'Admin role required for access decisions' }, { status: 403 })
  }

  const mergedVaultRef = 'externalVaultRef' in data ? data.externalVaultRef : existing.externalVaultRef
  if (nextStatus === 'RECEIVED_IN_VAULT' && !mergedVaultRef) {
    return NextResponse.json({ error: 'externalVaultRef required when access is received in vault' }, { status: 400 })
  }
  if (nextStatus === 'APPROVED' && !mergedVaultRef) {
    return NextResponse.json({ error: 'externalVaultRef required before approval' }, { status: 400 })
  }

  const unsafeField = findCredentialMaterialField({
    resourceUrl: data.resourceUrl,
    externalVaultRef: data.externalVaultRef,
    requestNotes: data.requestNotes,
    decisionNotes: data.decisionNotes,
    eventNotes,
  })
  if (unsafeField) {
    return NextResponse.json({ error: `Raw credential material is not allowed in ${unsafeField}` }, { status: 400 })
  }

  if (nextStatus) {
    data.status = nextStatus
    Object.assign(data, statusTimestampPatch(nextStatus))
    if (isDecisionAccessStatus(nextStatus)) data.approverId = auth.userId
  }

  const accessRequest = await prisma.clientAccessRequest.update({
    where: { id: params.requestId },
    data: {
      ...data,
      events: {
        create: {
          actorId: auth.userId,
          type: nextStatus && nextStatus !== existing.status ? 'STATUS_CHANGED' : 'UPDATED',
          fromStatus: nextStatus && nextStatus !== existing.status ? existing.status : null,
          toStatus: nextStatus ?? null,
          notes: eventNotes,
        },
      },
    },
    include: ACCESS_INCLUDE,
  })

  return NextResponse.json({ accessRequest })
}
