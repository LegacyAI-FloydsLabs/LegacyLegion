import { NextRequest, NextResponse } from 'next/server';
import { requirePartnerUser } from '@/lib/authz';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  const auth = await requirePartnerUser();
  if ('response' in auth) return auth.response;
  const partner = await prisma.referralPartner.findUnique({ where: { userId: auth.userId }, include: { submissions: { orderBy: { createdAt: 'desc' }, take: 50 } } });
  if (!partner) return NextResponse.json({ error: 'Not a partner' }, { status: 403 });
  const submissions = (partner.submissions ?? []).map((s: any) => ({
    id: s.id, createdAt: s.createdAt, clientName: s.contactName, clientEmail: s.contactEmail, status: s.status, commissionEarned: 0,
  }));
  const stats = {
    total: submissions.length,
    converted: submissions.filter((s: any) => s.status === 'WON').length,
    pending: submissions.filter((s: any) => s.status !== 'WON' && s.status !== 'LOST').length,
  };
  return NextResponse.json({
    partner: { id: partner.id, tier: partner.tier, referralCode: partner.partnerCode, lifetimeCommission: Number(partner.lifetimeCommission ?? 0), company: partner.company },
    stats,
    submissions,
  });
}
