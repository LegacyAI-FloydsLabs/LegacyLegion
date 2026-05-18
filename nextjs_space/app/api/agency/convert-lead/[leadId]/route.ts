export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireInternalUser } from '@/lib/authz'
import { prisma } from '@/lib/db'

export async function POST(_req: NextRequest, { params }: { params: { leadId: string } }) {
  const auth = await requireInternalUser()
  if ('response' in auth) return auth.response
  const lead = await prisma.lead.findUnique({ where: { id: params.leadId } })
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  const existing = await prisma.client.findUnique({ where: { fromLeadId: lead.id } })
  if (existing) return NextResponse.json({ client: existing, alreadyExisted: true })

  const client = await prisma.client.create({
    data: {
      fromLeadId: lead.id,
      businessName: lead.businessName,
      ownerName: lead.ownerName,
      email: lead.email,
      phone: lead.phone,
      industry: lead.industry,
      city: lead.city,
      state: lead.state,
      website: lead.website,
      tier: lead.signedTier ?? lead.proposedTier ?? 'LAUNCH_PAD',
      monthlyMRR: lead.signedMRR ?? lead.estimatedMRR ?? 0,
      status: 'ONBOARDING',
      onboardedAt: new Date(),
      strategyBrief: lead.aiAssessment ? `Imported from lead pipeline. Snapshot:\n\n${lead.aiAssessment.slice(0, 1200)}` : null,
    },
  })
  return NextResponse.json({ client, alreadyExisted: false })
}
