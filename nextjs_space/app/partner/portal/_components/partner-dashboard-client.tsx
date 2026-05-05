'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, BadgeCheck, DollarSign, Copy, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Container } from '@/components/layouts/container';
import { PageHeader } from '@/components/layouts/page-header';
import { toast } from 'sonner';

interface PartnerSummary {
  partner: { id: string; tier: string; referralCode: string; lifetimeCommission: number; company?: string | null };
  stats: { total: number; converted: number; pending: number };
  submissions: Array<{ id: string; createdAt: string; clientName?: string | null; clientEmail: string; status: string; commissionEarned?: number | null }>;
}

export function PartnerDashboardClient() {
  const [data, setData] = useState<PartnerSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await fetch('/api/partner/me');
        const d = await res.json().catch(() => ({}));
        if (!cancel && res.ok) setData(d);
      } catch {} finally { if (!cancel) setLoading(false); }
    })();
    return () => { cancel = true; };
  }, []);

  const referralLink = typeof window !== 'undefined' && data?.partner?.referralCode
    ? `${window.location.origin}/get-started?ref=${data.partner.referralCode}`
    : '';

  return (
    <Container>
      <PageHeader
        title={`Welcome back${data?.partner?.company ? `, ${data.partner.company}` : ''}`}
        description="Track your referrals and commissions in real time. Higher tiers earn more."
        actions={<Link href="/partner/portal/refer"><Button><Sparkles className="mr-2 h-4 w-4" /> Submit Referral</Button></Link>}
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="flex items-center justify-between p-4"><div><div className="text-xs uppercase tracking-wide text-muted-foreground">Tier</div><div className="mt-1 text-xl font-semibold">{data?.partner?.tier ?? 'BRONZE'}</div></div><Badge>{data?.partner?.tier ?? 'BRONZE'}</Badge></CardContent></Card>
        <Card><CardContent className="flex items-center justify-between p-4"><div><div className="text-xs uppercase tracking-wide text-muted-foreground">Total Referrals</div><div className="mt-1 text-xl font-semibold">{data?.stats?.total ?? 0}</div></div><Users className="h-5 w-5 text-primary" /></CardContent></Card>
        <Card><CardContent className="flex items-center justify-between p-4"><div><div className="text-xs uppercase tracking-wide text-muted-foreground">Converted</div><div className="mt-1 text-xl font-semibold">{data?.stats?.converted ?? 0}</div></div><BadgeCheck className="h-5 w-5 text-emerald-400" /></CardContent></Card>
        <Card><CardContent className="flex items-center justify-between p-4"><div><div className="text-xs uppercase tracking-wide text-muted-foreground">Lifetime Commission</div><div className="mt-1 text-xl font-semibold">${(data?.partner?.lifetimeCommission ?? 0).toLocaleString()}</div></div><DollarSign className="h-5 w-5 text-amber-400" /></CardContent></Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Your referral link</CardTitle>
          <CardDescription>Share this link to attribute leads to you automatically.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <input readOnly value={referralLink} className="flex-1 rounded-md bg-card/60 px-3 py-2 text-sm" />
            <Button variant="outline" onClick={() => { if (referralLink) { navigator.clipboard.writeText(referralLink); toast.success('Copied to clipboard'); } }}>
              <Copy className="mr-2 h-4 w-4" /> Copy
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent referrals</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Loading…</div>
          ) : (data?.submissions ?? []).length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No referrals yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {(data?.submissions ?? []).map((s) => (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <div className="font-medium">{s?.clientName ?? s?.clientEmail}</div>
                    <div className="text-xs text-muted-foreground">{new Date(s?.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <Badge variant="outline">{s?.status ?? 'NEW'}</Badge>
                    <span className="text-muted-foreground">${(s?.commissionEarned ?? 0).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
