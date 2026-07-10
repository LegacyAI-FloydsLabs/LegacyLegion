export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { requireInternalUser } from '@/lib/authz'
import { prisma } from '@/lib/db'
import { diagnosticId, logServerError, logServerEvent } from '@/lib/diagnostics'

const CLIENT_TIERS = new Set(['LAUNCH_PAD', 'GROWTH_ENGINE', 'MARKET_DOMINATOR'])
const CLIENT_STATUSES = new Set(['ACTIVE', 'ONBOARDING', 'PAUSED', 'CHURNED'])

function clean(value: unknown): string {
  return String(value ?? '').trim()
}

function nullable(value: unknown): string | null {
  const text = clean(value)
  return text ? text : null
}

function normalizedUrl(value: unknown): string | null {
  const text = clean(value)
  if (!text) return null
  try {
    const url = new URL(text.includes('://') ? text : `https://${text}`)
    url.hash = ''
    url.search = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return text
  }
}

function normalizeToken(value: unknown, fallback: string, allowed: Set<string>): string {
  const token = clean(value || fallback).toUpperCase().replace(/[\s-]+/g, '_')
  return allowed.has(token) ? token : fallback
}

function badRequest(error: string, fieldErrors: Record<string, string> = {}) {
  return NextResponse.json({ error, fieldErrors }, { status: 400 })
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function GET() {
  const auth = await requireInternalUser()
  if ('response' in auth) return auth.response
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { workOrders: true, clientNotes: true } },
    },
  })
  return NextResponse.json({ clients })
}

export async function POST(req: NextRequest) {
  const auth = await requireInternalUser()
  if ('response' in auth) return auth.response

  const body = await req.json().catch(() => ({}))
  const businessName = clean(body?.businessName)
  const industry = clean(body?.industry || 'OTHER').toUpperCase()
  const ownerName = nullable(body?.ownerName || body?.contactName)
  const email = nullable(body?.email)?.toLowerCase() ?? null
  const phone = nullable(body?.phone)
  const city = nullable(body?.city)
  const state = nullable(body?.state)
  const website = normalizedUrl(body?.website)
  const gbpUrl = normalizedUrl(body?.gbpUrl)
  const tier = normalizeToken(body?.tier, 'LAUNCH_PAD', CLIENT_TIERS)
  const monthlyMRR = Number(body?.monthlyMRR ?? Number.NaN)
  const strategyBrief = nullable(body?.strategyBrief)
  const status = normalizeToken(body?.status, 'ACTIVE', CLIENT_STATUSES)

  const fieldErrors: Record<string, string> = {}
  if (!businessName) fieldErrors.businessName = 'Business name is required.'
  if (!industry) fieldErrors.industry = 'Industry is required.'
  if (!ownerName) fieldErrors.ownerName = 'Owner or primary contact is required.'
  if (!email) fieldErrors.email = 'Email is required.'
  if (email && !isValidEmail(email)) fieldErrors.email = 'Enter a valid email address.'
  if (!phone) fieldErrors.phone = 'Phone is required.'
  if (!city) fieldErrors.city = 'City is required.'
  if (!state) fieldErrors.state = 'State is required.'
  if (!website) fieldErrors.website = 'Website is required.'
  if (!gbpUrl) fieldErrors.gbpUrl = 'Google Business Profile URL is required.'
  if (!CLIENT_TIERS.has(tier)) fieldErrors.tier = 'Valid service tier is required.'
  if (!Number.isFinite(monthlyMRR) || monthlyMRR < 0) fieldErrors.monthlyMRR = 'Monthly retainer must be zero or greater.'
  if (!strategyBrief) fieldErrors.strategyBrief = 'Strategy brief is required.'
  if (Object.keys(fieldErrors).length > 0) return badRequest('Fix the highlighted client fields.', fieldErrors)

  const duplicateOr: Prisma.ClientWhereInput[] = []
  if (website) duplicateOr.push({ website: { equals: website, mode: 'insensitive' } })
  if (gbpUrl) duplicateOr.push({ gbpUrl: { equals: gbpUrl, mode: 'insensitive' } })
  duplicateOr.push({
    businessName: { equals: businessName, mode: 'insensitive' },
    city: { equals: city!, mode: 'insensitive' },
    state: { equals: state!, mode: 'insensitive' },
  })

  const duplicate = await prisma.client.findFirst({
    where: { OR: duplicateOr },
    select: { id: true, businessName: true },
  })
  if (duplicate) {
    logServerEvent('client.create.duplicate', { userId: auth.userId, duplicateClientId: duplicate.id })
    return NextResponse.json({ error: 'Client already exists.', client: duplicate }, { status: 409 })
  }

  try {
    const client = await prisma.client.create({
      data: {
        businessName,
        industry,
        ownerName,
        email,
        phone,
        city,
        state,
        website,
        gbpUrl,
        facebookUrl: normalizedUrl(body?.facebookUrl),
        linkedinUrl: normalizedUrl(body?.linkedinUrl),
        tier,
        monthlyMRR,
        status,
        strategyBrief,
        onboardedAt: body?.onboardedAt ? new Date(body.onboardedAt) : new Date(),
        fromLeadId: nullable(body?.fromLeadId),
      },
    })
    logServerEvent('client.create.succeeded', { userId: auth.userId, clientId: client.id, tier, status })
    return NextResponse.json({ client }, { status: 201 })
  } catch (error) {
    const id = diagnosticId('client_create')
    logServerError('client.create.failed', error, { diagnosticId: id, userId: auth.userId })
    return NextResponse.json(
      { error: 'Client could not be saved. Check database connectivity and retry; entered values remain in the form.', diagnosticId: id },
      { status: 500 },
    )
  }
}
