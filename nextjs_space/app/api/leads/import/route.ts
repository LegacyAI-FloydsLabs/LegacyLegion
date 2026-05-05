import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

function parseCSV(text: string): Record<string, string>[] {
  const lines = (text ?? '').split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const split = (line: string) => {
    const out: string[] = []; let cur = ''; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
      else if (c === ',' && !inQ) { out.push(cur); cur = ''; }
      else cur += c;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const headers = split(lines[0]).map((h) => h?.toLowerCase?.()?.replace?.(/\s+/g, '_') ?? '');
  return lines.slice(1).map((line) => {
    const cells = split(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = cells[i] ?? ''; });
    return obj;
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const fd = await req.formData();
    const file = fd.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });
    const text = await file.text();
    const rows = parseCSV(text);
    const errors: string[] = []; let created = 0; let skipped = 0;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] ?? {};
      const email = (r.email ?? '').toString().trim().toLowerCase();
      if (!email) { skipped++; continue; }
      const exists = await prisma.lead.findFirst({ where: { email } }).catch(() => null);
      if (exists) { skipped++; continue; }
      try {
        await prisma.lead.create({
          data: {
            email,
            businessName: r.company ?? r.business ?? r.name ?? email,
            ownerName: r.name ?? r.full_name ?? 'Unknown',
            industry: (r.industry ?? 'OTHER').toUpperCase(),
            phone: r.phone ?? null,
            city: r.city ?? null,
            state: r.state ?? null,
            currentMarketingSpend: r.monthly_marketing_spend ?? null,
            revenueRange: r.annual_revenue ?? null,
            employeeCount: r.company_size ?? null,
            source: 'CSV_IMPORT',
            status: 'NEW',
            score: 50,
            qualification: 'MQL',
            assignedToId: session.user.id,
          },
        });
        created++;
      } catch (e: any) { errors.push(`Row ${i + 2}: ${e?.message ?? 'failed'}`); }
    }
    return NextResponse.json({ total: rows.length, created, skipped, errors });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Import failed' }, { status: 500 });
  }
}
