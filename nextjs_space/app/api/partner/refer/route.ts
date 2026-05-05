import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

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
      contactName: body?.clientName ?? 'Unknown',
      contactEmail: clientEmail,
      contactPhone: body?.clientPhone ?? null,
      businessName: body?.clientCompany ?? body?.clientName ?? clientEmail,
      notes: body?.notes ?? null,
      status: 'PENDING',
    },
  });
  // Auto-create lead
  const exists = await prisma.lead.findFirst({ where: { email: clientEmail } }).catch(() => null);
  if (!exists) {
    await prisma.lead.create({
      data: {
        email: clientEmail,
        businessName: body?.clientCompany ?? body?.clientName ?? clientEmail,
        ownerName: body?.clientName ?? 'Unknown',
        industry: 'OTHER',
        phone: body?.clientPhone ?? null,
        source: 'REFERRAL',
        status: 'NEW',
        score: 60,
        qualification: 'MQL',
        referralPartnerId: partner.id,
      },
    }).catch(() => null);
  }
  return NextResponse.json({ ok: true, submission });
}
