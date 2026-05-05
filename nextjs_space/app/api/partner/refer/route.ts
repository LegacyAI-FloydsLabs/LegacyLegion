import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { scoreLead, suggestTier } from '@/lib/scoring';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const partner = await prisma.referralPartner.findUnique({ where: { userId: session.user.id } });
  if (!partner) return NextResponse.json({ error: 'Not a partner' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const clientEmail = (body?.clientEmail ?? '').toString().trim().toLowerCase();
  if (!clientEmail) return NextResponse.json({ error: 'Email required' }, { status: 400 });
  const submission = await prisma.referralSubmission.create({
    data: {
      partnerId: partner.id,
      clientName: body?.clientName ?? null,
      clientEmail,
      clientCompany: body?.clientCompany ?? null,
      clientPhone: body?.clientPhone ?? null,
      notes: body?.notes ?? null,
      status: 'NEW',
    },
  });
  // Auto-create a Lead with REFERRAL source
  const input: any = { email: clientEmail, name: body?.clientName ?? null, company: body?.clientCompany ?? null, phone: body?.clientPhone ?? null, source: 'REFERRAL' };
  const sc = scoreLead(input);
  const tier = suggestTier(input, sc.total);
  await prisma.lead.upsert({
    where: { email: clientEmail },
    update: {},
    create: {
      email: clientEmail,
      name: body?.clientName ?? null,
      company: body?.clientCompany ?? null,
      phone: body?.clientPhone ?? null,
      source: 'REFERRAL',
      referralCode: partner.referralCode,
      score: sc.total,
      qualification: sc.qualification,
      scoreBreakdown: sc.breakdown as any,
      proposedTier: tier,
      stage: 'NEW',
      activities: { create: { type: 'REFERRED', message: `Referred by partner ${partner.referralCode}` } },
    },
  }).catch(() => null);
  return NextResponse.json({ ok: true, submission });
}
