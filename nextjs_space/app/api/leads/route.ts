export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { requireInternalUser } from '@/lib/authz'
import { prisma } from '@/lib/db'
import { scoreLead, suggestTier, tierMRR } from '@/lib/scoring'
import { createLeadAssessmentToken } from '@/lib/public-assessment-token'
import { checkRateLimit, rateLimited } from '@/lib/rate-limit'
import { diagnosticId, logServerError, logServerEvent } from '@/lib/diagnostics'

const LEAD_SUBMISSION_WINDOW_MS = 60 * 60 * 1000
const LEAD_STATUSES = new Set(['NEW', 'CONTACTED', 'DISCOVERY', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'])
const LEAD_SOURCES = new Set(['WEB_FORM', 'CHAT_WIDGET', 'REFERRAL', 'MANUAL', 'CSV_IMPORT', 'LINKEDIN'])

function clean(value: unknown): string {
  return String(value ?? '').trim()
}

function nullable(value: unknown): string | null {
  const text = clean(value)
  return text ? text : null
}

function normalizeToken(value: unknown, fallback: string, allowed: Set<string>): string {
  const token = clean(value || fallback).toUpperCase().replace(/[\s-]+/g, '_')
  return allowed.has(token) ? token : fallback
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

function badRequest(error: string, fieldErrors: Record<string, string> = {}) {
  return NextResponse.json({ error, fieldErrors }, { status: 400 })
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireInternalUser()
    if ('response' in auth) return auth.response

    const limit = checkRateLimit(req, { bucket: 'lead-submission', limit: 20, windowMs: LEAD_SUBMISSION_WINDOW_MS })
    if (!limit.allowed) return rateLimited(limit)

    const body = await req.json().catch(() => ({}))
    const businessName = clean(body?.businessName)
    const ownerName = clean(body?.ownerName || body?.contactName)
    const email = nullable(body?.email)?.toLowerCase() ?? null
    const phone = nullable(body?.phone)
    const industry = clean(body?.industry || 'OTHER').toUpperCase()
    const city = nullable(body?.city)
    const state = nullable(body?.state)
    const website = normalizedUrl(body?.website)
    const revenueRange = nullable(body?.revenueRange)
    const currentMarketingSpend = nullable(body?.currentMarketingSpend)
    const employeeCount = nullable(body?.employeeCount)
    const biggestPainPoint = nullable(body?.biggestPainPoint || body?.notes)
    const currentProvider = nullable(body?.currentProvider)
    const source = normalizeToken(body?.source, 'MANUAL', LEAD_SOURCES)
    const status = normalizeToken(body?.status || body?.stage, 'NEW', LEAD_STATUSES)
    const channel = nullable(body?.channel)
    const referralCode = clean(body?.referralCode)
    const notes = nullable(body?.notes)

    const fieldErrors: Record<string, string> = {}
    if (!businessName) fieldErrors.businessName = 'Business name is required.'
    if (!ownerName) fieldErrors.ownerName = 'Contact name is required.'
    if (!industry) fieldErrors.industry = 'Industry is required.'
    if (!email && !phone) fieldErrors.email = 'Email or phone is required.'
    if (email && !isValidEmail(email)) fieldErrors.email = 'Enter a valid email address.'
    if (!notes) fieldErrors.notes = 'Notes are required.'
    if (Object.keys(fieldErrors).length > 0) return badRequest('Lead could not be saved.', fieldErrors)

    const duplicateFilters: Prisma.LeadWhereInput[] = []
    if (email) duplicateFilters.push({ email: { equals: email, mode: 'insensitive' as const } })
    if (phone) duplicateFilters.push({ phone })
    if (website) duplicateFilters.push({ website: { equals: website, mode: 'insensitive' as const } })

    if (duplicateFilters.length > 0) {
      const existing = await prisma.lead.findFirst({
        where: { OR: duplicateFilters },
        select: { id: true, businessName: true, email: true, phone: true, website: true, status: true },
      })
      if (existing) {
        logServerEvent('lead.create.duplicate', { userId: auth.userId, duplicateLeadId: existing.id })
        return NextResponse.json(
          { error: 'Lead already exists.', lead: existing },
          { status: 409 },
        )
      }
    }

    let referralPartnerId: string | undefined
    if (referralCode) {
      const partner = await prisma.referralPartner.findUnique({
        where: { partnerCode: referralCode },
        select: { id: true },
      })
      referralPartnerId = partner?.id
    }

    const scoringInput = {
      industry,
      revenueRange,
      currentMarketingSpend,
      employeeCount,
      source,
      biggestPainPoint,
      currentProvider,
      state,
      city,
    }
    const breakdown = scoreLead(scoringInput)
    const proposedTier = suggestTier(scoringInput)
    const estimatedMRR = tierMRR(proposedTier)

    const lead = await prisma.$transaction(async (tx) => {
      const created = await tx.lead.create({
        data: {
          businessName,
          ownerName,
          email,
          phone,
          industry,
          city,
          state,
          website,
          revenueRange,
          currentMarketingSpend,
          employeeCount,
          biggestPainPoint,
          currentProvider,
          status,
          source,
          channel,
          score: breakdown.total,
          scoreBreakdown: breakdown as unknown as Prisma.InputJsonValue,
          qualification: breakdown.qualification,
          proposedTier,
          estimatedMRR,
          referralPartnerId,
        },
        select: { id: true, businessName: true, status: true, score: true, qualification: true, proposedTier: true, estimatedMRR: true },
      })

      if (notes) {
        await tx.note.create({
          data: {
            leadId: created.id,
            authorId: auth.userId,
            body: notes,
          },
        })
      }

      await tx.activity.create({
        data: {
          leadId: created.id,
          authorId: auth.userId,
          type: 'SYSTEM',
          title: 'Lead created',
          body: notes || `Lead captured from ${source}`,
          metadata: { source, status, score: breakdown.total, qualification: breakdown.qualification },
        },
      })

      return created
    })

    logServerEvent('lead.create.succeeded', { userId: auth.userId, leadId: lead.id, source, status, score: lead.score })

    const assessmentToken = createLeadAssessmentToken(lead.id)
    return NextResponse.json(
      {
        ok: true,
        leadId: lead.id,
        assessmentToken,
        score: lead.score,
        qualification: lead.qualification,
        proposedTier: lead.proposedTier,
        estimatedMRR: lead.estimatedMRR,
      },
      { status: 201 },
    )
  } catch (error) {
    const id = diagnosticId('lead_create')
    logServerError('lead.create.failed', error, { diagnosticId: id })
    return NextResponse.json(
      { error: 'Lead could not be saved. No data was discarded; retry after checking the required fields.', diagnosticId: id },
      { status: 500 },
    )
  }
}

export async function GET() {
  const auth = await requireInternalUser()
  if ('response' in auth) return auth.response

  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      assignedTo: { select: { name: true, email: true } },
      activities: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  })

  return NextResponse.json({ leads })
}
