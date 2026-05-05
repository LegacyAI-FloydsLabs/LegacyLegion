'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/layouts/container';
import { PageHeader } from '@/components/layouts/page-header';
import { toast } from 'sonner';

export function ReferForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ clientName: '', clientEmail: '', clientCompany: '', clientPhone: '', notes: '' });
  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientEmail) { toast.error('Email required'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/partner/refer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.error ?? 'Failed');
      toast.success('Referral submitted!');
      router.push('/partner/portal');
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed');
    } finally { setBusy(false); }
  };

  return (
    <Container>
      <PageHeader title="Submit a Referral" description="Tell us about a business you think we can help. We’ll handle the outreach and keep you posted." />
      <Card className="mt-8 max-w-2xl">
        <CardHeader>
          <CardTitle>Referral details</CardTitle>
          <CardDescription>Email is required. Anything else helps us prioritize.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={submit}>
            <Input placeholder="Client name" value={form.clientName} onChange={(e) => set('clientName', e.target.value)} />
            <Input type="email" placeholder="Client email *" value={form.clientEmail} onChange={(e) => set('clientEmail', e.target.value)} required />
            <Input placeholder="Client company" value={form.clientCompany} onChange={(e) => set('clientCompany', e.target.value)} />
            <Input placeholder="Client phone" value={form.clientPhone} onChange={(e) => set('clientPhone', e.target.value)} />
            <textarea placeholder="Notes / context" value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={4} className="w-full rounded-md bg-card/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            <Button type="submit" disabled={busy}><Sparkles className="mr-2 h-4 w-4" /> {busy ? 'Submitting…' : 'Submit Referral'}</Button>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
}
