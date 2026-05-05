'use client';

import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/layouts/container';
import { PageHeader } from '@/components/layouts/page-header';
import { toast } from 'sonner';

interface ImportResult {
  total: number;
  created: number;
  skipped: number;
  errors: string[];
}

export function ImportClient() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e?.target?.files?.[0] ?? null;
    setFile(f);
    setResult(null);
  };

  const submit = async () => {
    if (!file) {
      toast.error('Please select a CSV file first.');
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/leads/import', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res?.ok) throw new Error(data?.error ?? 'Import failed');
      setResult(data);
      toast.success(`Imported ${data?.created ?? 0} leads`);
    } catch (err: any) {
      toast.error(err?.message ?? 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Container>
      <PageHeader
        title="CSV Import"
        description="Upload a CSV of prospects. Columns will be auto-mapped and each row will be AI-scored on entry."
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" /> Upload CSV
            </CardTitle>
            <CardDescription>
              Required columns (any case): email. Optional: name, company, phone, industry,
              annual_revenue, monthly_marketing_spend, company_size, website, current_pain_points,
              source, city, state.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card/40 p-10 text-center"
              onClick={() => fileRef?.current?.click?.()}
              role="button"
            >
              <FileSpreadsheet className="h-10 w-10 text-primary" />
              <div className="text-sm text-muted-foreground">
                {file ? <span className="font-medium text-foreground">{file.name}</span> : 'Click to choose a .csv file'}
              </div>
              <input
                ref={fileRef}
                onChange={handleFile}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => { setFile(null); setResult(null); if (fileRef?.current) fileRef.current.value = ''; }}>
                Reset
              </Button>
              <Button onClick={submit} disabled={busy || !file}>
                <Sparkles className="mr-2 h-4 w-4" /> {busy ? 'Importing…' : 'Import & Score'}
              </Button>
            </div>

            {result && (
              <div className="rounded-lg bg-card/60 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Import complete
                </div>
                <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
                  <div>Total rows: {result?.total ?? 0}</div>
                  <div>Created: {result?.created ?? 0}</div>
                  <div>Skipped: {result?.skipped ?? 0}</div>
                </div>
                {result?.errors?.length > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-amber-400">
                      <AlertTriangle className="h-4 w-4" /> Errors
                    </div>
                    <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">
                      {result.errors.slice(0, 10).map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sample CSV</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-md bg-card/60 p-3 text-[11px] leading-5 text-muted-foreground">
{`email,name,company,industry,annual_revenue,monthly_marketing_spend,company_size,city,state
founder@acme.com,Maya Patel,Acme Tools,Manufacturing,5000000,8000,11-50,Indianapolis,IN
gm@blueriver.com,Sam Cole,Blue River Auto,Automotive,2500000,4000,11-50,Carmel,IN
owner@drsmith.com,Dr Smith,Smith Dental,Dental,1500000,3000,2-10,Fishers,IN`}
            </pre>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
