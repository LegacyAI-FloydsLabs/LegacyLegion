'use client';

import { useEffect, useState } from 'react';
import { Users, BadgeCheck, DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Container } from '@/components/layouts/container';
import { PageHeader } from '@/components/layouts/page-header';
import { Badge } from '@/components/ui/badge';

interface Partner {
  id: string;
  email: string;
  name?: string | null;
  company?: string | null;
  tier: string;
  referralCode: string;
  totalReferrals?: number;
  totalConverted?: number;
  lifetimeCommission?: number;
}

export function ReferralsClient() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await fetch('/api/partner/admin/list');
        const data = await res.json().catch(() => ({}));
        if (!cancel) setPartners(data?.partners ?? []);
      } catch {} finally { if (!cancel) setLoading(false); }
    })();
    return () => { cancel = true; };
  }, []);

  return (
    <Container>
      <PageHeader
        title="Referral Partners"
        description="Manage your partner network, monitor referrals, and track commissions."
        actions={<span className="text-xs text-muted-foreground">Partner self-service paused for team-only dogfood</span>}
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard icon={<Users className="h-5 w-5 text-primary" />} title="Active Partners" value={partners?.length ?? 0} />
        <StatCard icon={<BadgeCheck className="h-5 w-5 text-emerald-400" />} title="Total Conversions" value={partners?.reduce?.((s, p) => s + (p?.totalConverted ?? 0), 0) ?? 0} />
        <StatCard icon={<DollarSign className="h-5 w-5 text-amber-400" />} title="Lifetime Commissions" value={`$${(partners?.reduce?.((s, p) => s + (p?.lifetimeCommission ?? 0), 0) ?? 0).toLocaleString()}`} />
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Partner Roster</CardTitle>
          <CardDescription>Bronze 5% / Silver 7.5% / Gold 10% recurring commissions.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : partners?.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No partners yet. Partner self-service is paused during team-only dogfood.</div>
          ) : (
            <div className="divide-y divide-border">
              {partners.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <div className="font-medium">{p?.name ?? p?.email}</div>
                    <div className="text-xs text-muted-foreground">{p?.company ?? '—'} · code {p?.referralCode}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{p?.tier}</Badge>
                    <span className="text-xs text-muted-foreground">Refs {p?.totalReferrals ?? 0} / Won {p?.totalConverted ?? 0}</span>
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

function StatCard({ icon, title, value }: { icon: React.ReactNode; title: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
          <div className="mt-1 text-2xl font-semibold">{value}</div>
        </div>
        {icon}
      </CardContent>
    </Card>
  );
}
