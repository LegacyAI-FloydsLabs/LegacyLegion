import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const partners = await prisma.referralPartner.findMany({ include: { user: true, submissions: true } });
    const out = partners.map((p) => ({
      id: p.id,
      email: p.user?.email ?? '',
      name: p.user?.name ?? null,
      company: p.company ?? null,
      tier: p.tier ?? 'BRONZE',
      referralCode: p.referralCode,
      totalReferrals: p.submissions?.length ?? 0,
      totalConverted: (p.submissions ?? []).filter((s: any) => s.status === 'CONVERTED').length,
      lifetimeCommission: Number(p.lifetimeCommission ?? 0),
    }));
    return NextResponse.json({ partners: out });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Failed' }, { status: 500 });
  }
}
