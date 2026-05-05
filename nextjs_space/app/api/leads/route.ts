export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { scoreLead, suggestTier, tierMRR } from '@/lib/scoring'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const businessName = String(body?.businessName ?? '').trim()
    const ownerName = String(body?.ownerName ?? '').trim()
    const email = String(body?.email ?? '').trim().toLowerCase()
    const phone = String(body?.phone ?? '').trim() || null
    const industry = String(body?.industry ?? 'OTHER')
    const city = String(body?.city ?? '').trim() || null
    const state = String(body?.state ?? '').trim() || null
    const website = String(body?.website ?? '').trim() || null
    const revenueRange = String(body?.revenueRange ?? '').trim() || null
    const currentMarketingSpend = String(body?.currentMarketingSpend ?? '').trim() || null
    const employeeCount = String(body?.employeeCount ?? '').trim() || null
    const biggestPainPoint = String(body?.biggestPainPoint ?? '').trim() || null
    const currentProvider = String(body?.currentProvider ?? '').trim() || null
    const source = String(body?.source ?? 'WEB_FORM')
    const referralCode = String(body?.referralCode ?? '').trim()

    if (!businessName || !ownerName || !email) {
      return NextResponse.json({ error: 'businessName, ownerName, and email are required' }, { status: 400 })
    }

    let referralPartnerId: string | null = null
    if (referralCode) {
      const partner = await prisma.referralPartner.findUnique({ where: { partnerCode: referralCode } })
      if (partner) referralPartnerId = partner.id
    }

    const breakdown = scoreLead({
      industry, revenueRange, currentMarketingSpend, employeeCount,
      source: referralPartnerId ? 'REFERRAL' : source,
      biggestPainPoint, currentProvider, state, city,
    })
    const proposedTier = suggestTier({ revenueRange, currentMarketingSpend })
    const estimatedMRR = tierMRR(proposedTier)

    const lead = await prisma.lead.create({
      data: {
        businessName, ownerName, email, phone, industry,
        city, state, website, revenueRange, currentMarketingSpend, employeeCount,
        biggestPainPoint, currentProvider,
        source: referralPartnerId ? 'REFERRAL' : source,
        score: breakdown.total,
        scoreBreakdown: breakdown as any,
        qualification: breakdown.qualification,
        proposedTier, estimatedMRR,
        referralPartnerId,
        status: 'NEW',
      },
    })

    if (referralPartnerId) {
      await prisma.referralPartner.update({
        where: { id: referralPartnerId },
        data: { totalReferrals: { increment: 1 } },
      })
    }

    await prisma.activity.create({
      data: {
        leadId: lead.id, type: 'SYSTEM', title: 'Lead created',
        body: `Source: ${lead.source}. Score: ${lead.score}/100 (${breakdown.qualification}).`,
      },
    })

    return NextResponse.json({
      ok: true, leadId: lead.id, score: lead.score, qualification: breakdown.qualification,
      proposedTier, estimatedMRR,
    })
  } catch (e: any) {
    console.error('lead create error', e)
    return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || undefined
  const industry = searchParams.get('industry') || undefined
  const source = searchParams.get('source') || undefined
  const search = searchParams.get('search') || undefined

  const where: any = {}
  if (status) where.status = status
  if (industry) where.industry = industry
  if (source) where.source = source
  if (search) {
    where.OR = [
      { businessName: { contains: search, mode: 'insensitive' } },
      { ownerName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }

  const leads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { assignedTo: { select: { id: true, name: true, email: true } } },
  })
  return NextResponse.json({ leads })
}
