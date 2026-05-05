import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { scoreLead, suggestTier } from '@/lib/scoring';
import type { LeadInput } from '@/lib/types';

export const dynamic = 'force-dynamic';

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = (text ?? '').split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const parseLine = (line: string) => {
    const out: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ;
      } else if (c === ',' && !inQ) {
        out.push(cur); cur = '';
      } else cur += c;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const headers = parseLine(lines[0]).map((h) => h?.toLowerCase?.()?.replace?.(/\s+/g, '_') ?? '');
  const rows = lines.slice(1).map((line) => {
    const cells = parseLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = cells[i] ?? ''; });
    return obj;
  });
  return { headers, rows };
}

function toNum(v?: string): number | null {
  if (!v) return null;
  const n = Number(String(v).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : null;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const fd = await req.formData();
    const file = fd.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    const text = await file.text();
    const { rows } = parseCSV(text);

    const errors: string[] = [];
    let created = 0; let skipped = 0;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] ?? {};
      const email = (r.email ?? r['e-mail'] ?? '').toString().trim().toLowerCase();
      if (!email) { skipped++; continue; }
      const existing = await prisma.lead.findFirst({ where: { email } }).catch(() => null);
      if (existing) { skipped++; continue; }

      const input: LeadInput = {
        email,
        name: r.name ?? r.full_name ?? null,
        company: r.company ?? r.business ?? null,
        phone: r.phone ?? null,
        website: r.website ?? null,
        industry: r.industry ?? null,
        annualRevenue: toNum(r.annual_revenue ?? r.revenue) ?? null,
        monthlyMarketingSpend: toNum(r.monthly_marketing_spend ?? r.marketing_spend) ?? null,
        companySize: r.company_size ?? r.size ?? null,
        currentPainPoints: r.current_pain_points ?? r.pain_points ?? null,
        source: (r.source ?? 'CSV_IMPORT')?.toString()?.toUpperCase?.() ?? 'CSV_IMPORT',
        city: r.city ?? null,
        state: r.state ?? null,
      } as LeadInput;

      try {
        const score = scoreLead(input);
        const tier = suggestTier(input, score.total);
        await prisma.lead.create({
          data: {
            email: input.email,
            name: input.name ?? null,
            company: input.company ?? null,
            phone: input.phone ?? null,
            website: input.website ?? null,
            industry: input.industry ?? null,
            annualRevenue: input.annualRevenue ?? null,
            monthlyMarketingSpend: input.monthlyMarketingSpend ?? null,
            companySize: input.companySize ?? null,
            currentPainPoints: input.currentPainPoints ?? null,
            source: 'CSV_IMPORT',
            city: input.city ?? null,
            state: input.state ?? null,
            score: score.total,
            scoreBreakdown: score.breakdown as any,
            qualification: score.qualification,
            proposedTier: tier,
            stage: 'NEW',
            ownerId: session.user.id,
            activities: { create: { type: 'IMPORTED', message: 'Imported via CSV', actorId: session.user.id } },
          },
        });
        created++;
      } catch (e: any) {
        errors.push(`Row ${i + 2}: ${e?.message ?? 'failed'}`);
      }
    }

    return NextResponse.json({ total: rows.length, created, skipped, errors });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Import failed' }, { status: 500 });
  }
}
