export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireInternalUser } from '@/lib/authz'
import {
  cleanOptionalString,
  findCredentialMaterialField,
  normalizeAccessPlatform,
  normalizeAccessStatus,
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

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireInternalUser()
  if ('response' in auth) return auth.response

  const accessRequests = await prisma.clientAccessRequest.findMany({
    where: { clientId: params.id },
    orderBy: { updatedAt: 'desc' },
    include: ACCESS_INCLUDE,
  })

  return NextResponse.json({ accessRequests })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireInternalUser()
  if ('response' in auth) return auth.response

  const body = await req.json().catch(() => ({}))
  const platform = normalizeAccessPlatform(body?.platform)
  if (!platform) return NextResponse.json({ error: 'Valid platform required' }, { status: 400 })

  const status = normalizeAccessStatus(body?.status) ?? 'REQUESTED'
  if (status === 'APPROVED' || status === 'REJECTED' || status === 'REVOKED') {
    return NextResponse.json({ error: 'Decision status requires an existing access request' }, { status: 400 })
  }

  const resourceUrl = cleanOptionalString(body?.resourceUrl)
  const externalVaultRef = cleanOptionalString(body?.externalVaultRef)
  const requestNotes = cleanOptionalString(body?.requestNotes, 2_000)

  if (status === 'RECEIVED_IN_VAULT' && !externalVaultRef) {
    return NextResponse.json({ error: 'externalVaultRef required when access is received in vault' }, { status: 400 })
  }

  const unsafeField = findCredentialMaterialField({ resourceUrl, externalVaultRef, requestNotes })
  if (unsafeField) {
    return NextResponse.json({ error: `Raw credential material is not allowed in ${unsafeField}` }, { status: 400 })
  }

  const client = await prisma.client.findUnique({ where: { id: params.id }, select: { id: true } })
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  const receivedAt = status === 'RECEIVED_IN_VAULT' ? new Date() : null
  const accessRequest = await prisma.clientAccessRequest.create({
    data: {
      clientId: params.id,
      requesterId: auth.userId,
      platform,
      status,
      resourceUrl,
      externalVaultRef,
      requestNotes,
      receivedAt,
      events: {
        create: {
          actorId: auth.userId,
          type: 'CREATED',
          toStatus: status,
          notes: requestNotes,
        },
      },
    },
    include: ACCESS_INCLUDE,
  })

  return NextResponse.json({ accessRequest }, { status: 201 })
}
