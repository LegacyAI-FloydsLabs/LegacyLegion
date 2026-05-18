import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const partners = await prisma.referralPartner.findMany({ include: { submissions: true } });
  const out = partners.map((p: any) => ({
    id: p.id,
    email: p.email,
    name: p.name,
    company: p.company,
    tier: p.tier ?? 'BRONZE',
    referralCode: p.partnerCode,
    totalReferrals: p.submissions?.length ?? 0,
    totalConverted: (p.submissions ?? []).filter((s: any) => s.status === 'WON').length,
    lifetimeCommission: Number(p.lifetimeCommission ?? 0),
  }));
  return NextResponse.json({ partners: out });
}
