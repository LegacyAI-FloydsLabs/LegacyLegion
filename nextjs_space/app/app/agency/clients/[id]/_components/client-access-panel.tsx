'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { KeyRound, ShieldCheck, ShieldAlert } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface ClientAccessEvent {
  id: string
  type: string
  fromStatus: string | null
  toStatus: string | null
  notes: string | null
  createdAt: string
  actor?: { name: string | null; email: string | null } | null
}

export interface ClientAccessRequest {
  id: string
  platform: string
  resourceUrl: string | null
  externalVaultRef: string | null
  status: string
  requestNotes: string | null
  decisionNotes: string | null
  requestedAt: string
  receivedAt: string | null
  approvedAt: string | null
  revokedAt: string | null
  createdAt: string
  updatedAt: string
  requester?: { name: string | null; email: string | null } | null
  approver?: { name: string | null; email: string | null } | null
  events: ClientAccessEvent[]
}

const PLATFORMS = [
  ['WEBSITE_CMS', 'Website / CMS'],
  ['GBP', 'Google Business Profile'],
  ['GSC', 'Google Search Console'],
  ['GA4', 'GA4'],
  ['GOOGLE_ADS', 'Google Ads'],
  ['META', 'Meta'],
  ['EMAIL', 'Email platform'],
  ['SOCIAL', 'Social account'],
  ['OTHER', 'Other'],
]

function statusBadgeClass(status: string) {
  if (status === 'APPROVED') return 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
  if (status === 'RECEIVED_IN_VAULT') return 'border-blue-500/30 bg-blue-500/15 text-blue-300'
  if (status === 'REJECTED' || status === 'REVOKED') return 'border-rose-500/30 bg-rose-500/15 text-rose-300'
  if (status === 'REQUESTED') return 'border-amber-500/30 bg-amber-500/15 text-amber-300'
  return 'border-slate-500/30 bg-slate-500/15 text-slate-300'
}

function formatPlatform(platform: string) {
  return PLATFORMS.find(([value]) => value === platform)?.[1] ?? platform.replace(/_/g, ' ')
}

function actorName(actor?: { name: string | null; email: string | null } | null) {
  return actor?.name ?? actor?.email ?? 'Team'
}

async function readError(res: Response) {
  const body = await res.json().catch(() => ({}))
  return typeof body?.error === 'string' ? body.error : 'Request failed'
}

export function ClientAccessPanel({
  clientId,
  initialRequests,
  currentUserRole,
}: {
  clientId: string
  initialRequests: ClientAccessRequest[]
  currentUserRole: string | null
}) {
  const [requests, setRequests] = useState(initialRequests)
  const [busy, setBusy] = useState<string | null>(null)
  const [form, setForm] = useState({ platform: 'WEBSITE_CMS', resourceUrl: '', externalVaultRef: '', requestNotes: '' })
  const [vaultDrafts, setVaultDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialRequests.map((request) => [request.id, request.externalVaultRef ?? ''])),
  )
  const isAdmin = currentUserRole === 'admin'

  function upsertRequest(updated: ClientAccessRequest) {
    setRequests((prev) => [updated, ...prev.filter((request) => request.id !== updated.id)])
    setVaultDrafts((prev) => ({ ...prev, [updated.id]: updated.externalVaultRef ?? '' }))
  }

  async function createAccessRequest() {
    setBusy('create')
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/access-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          status: form.externalVaultRef.trim() ? 'RECEIVED_IN_VAULT' : 'REQUESTED',
        }),
      })
      if (!res.ok) throw new Error(await readError(res))
      const data = await res.json()
      upsertRequest(data.accessRequest)
      setForm({ platform: 'WEBSITE_CMS', resourceUrl: '', externalVaultRef: '', requestNotes: '' })
      toast.success('Access intake recorded')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not record access intake')
    } finally {
      setBusy(null)
    }
  }

  async function patchAccessRequest(requestId: string, body: Record<string, unknown>, success: string) {
    setBusy(requestId)
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/access-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(await readError(res))
      const data = await res.json()
      upsertRequest(data.accessRequest)
      toast.success(success)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update access request')
    } finally {
      setBusy(null)
    }
  }

  function saveVaultRef(request: ClientAccessRequest) {
    const externalVaultRef = (vaultDrafts[request.id] ?? '').trim()
    patchAccessRequest(request.id, {
      externalVaultRef,
      status: externalVaultRef ? 'RECEIVED_IN_VAULT' : request.status,
      eventNotes: externalVaultRef ? 'External vault reference recorded; raw credentials remain outside LegacyLegion.' : 'External vault reference cleared.',
    }, 'Vault reference updated')
  }

  return (
    <div className="space-y-4">
      <Card className="border-amber-500/30 bg-amber-500/10 p-4">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
          <div>
            <div className="font-medium text-amber-100">Do not store passwords or recovery material here.</div>
            <div className="mt-1 text-sm text-amber-100/80">
              Use this ledger to request access, record the external password-manager item or admin-invite reference, and capture approval. Raw credentials stay outside LegacyLegion.
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-4 flex items-center gap-2">
          <KeyRound className="h-4 w-4" />
          <div className="font-medium">New access intake</div>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="access-platform">Platform</Label>
            <select
              id="access-platform"
              value={form.platform}
              onChange={(event) => setForm((prev) => ({ ...prev, platform: event.target.value }))}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {PLATFORMS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="access-resource-url">Admin URL or property URL</Label>
            <Input
              id="access-resource-url"
              value={form.resourceUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, resourceUrl: event.target.value }))}
              placeholder="https://example.com/wp-admin"
            />
          </div>
          <div className="space-y-1.5 lg:col-span-2">
            <Label htmlFor="access-vault-ref">External vault / admin invite reference</Label>
            <Input
              id="access-vault-ref"
              value={form.externalVaultRef}
              onChange={(event) => setForm((prev) => ({ ...prev, externalVaultRef: event.target.value }))}
              placeholder="1Password item, Google admin invitation reference, or password-manager path"
            />
          </div>
          <div className="space-y-1.5 lg:col-span-2">
            <Label htmlFor="access-notes">Internal request notes</Label>
            <Textarea
              id="access-notes"
              rows={3}
              value={form.requestNotes}
              onChange={(event) => setForm((prev) => ({ ...prev, requestNotes: event.target.value }))}
              placeholder="Who needs access, why, approval context. No passwords, recovery codes, API keys, or tokens."
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button size="sm" onClick={createAccessRequest} disabled={busy === 'create'}>{busy === 'create' ? 'Recording…' : 'Record access intake'}</Button>
        </div>
      </Card>

      {requests.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">No access requests recorded yet.</Card>
      ) : (
        <div className="grid gap-3">
          {requests.map((request) => (
            <Card key={request.id} className="p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-medium">{formatPlatform(request.platform)}</div>
                    <Badge variant="outline" className={statusBadgeClass(request.status)}>{request.status.replace(/_/g, ' ')}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Requested by {actorName(request.requester)} • {new Date(request.requestedAt).toLocaleString()}
                    {request.approver ? ` • Decision by ${actorName(request.approver)}` : ''}
                  </div>
                  {request.resourceUrl && (
                    <a href={request.resourceUrl} target="_blank" rel="noreferrer" className="mt-2 block break-all text-sm text-primary hover:underline">{request.resourceUrl}</a>
                  )}
                  {request.requestNotes && <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{request.requestNotes}</div>}
                  {request.decisionNotes && <div className="mt-2 whitespace-pre-wrap text-sm text-emerald-200">Decision: {request.decisionNotes}</div>}
                </div>
                <div className="min-w-[260px] space-y-2">
                  <Label className="text-xs">External reference only</Label>
                  <Input
                    value={vaultDrafts[request.id] ?? ''}
                    onChange={(event) => setVaultDrafts((prev) => ({ ...prev, [request.id]: event.target.value }))}
                    placeholder="No raw credentials"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" disabled={busy === request.id} onClick={() => saveVaultRef(request)}>Save reference</Button>
                    {isAdmin && request.status !== 'APPROVED' && (
                      <Button
                        size="sm"
                        disabled={busy === request.id || !(vaultDrafts[request.id] ?? '').trim()}
                        onClick={() => patchAccessRequest(request.id, { status: 'APPROVED', eventNotes: 'Access approved for controlled internal use.' }, 'Access approved')}
                      >
                        <ShieldCheck className="mr-1 h-4 w-4" />Approve
                      </Button>
                    )}
                    {isAdmin && request.status === 'APPROVED' && (
                      <Button size="sm" variant="outline" disabled={busy === request.id} onClick={() => patchAccessRequest(request.id, { status: 'REVOKED', eventNotes: 'Access approval revoked.' }, 'Access revoked')}>Revoke</Button>
                    )}
                    {isAdmin && request.status !== 'REJECTED' && request.status !== 'REVOKED' && request.status !== 'APPROVED' && (
                      <Button size="sm" variant="ghost" disabled={busy === request.id} onClick={() => patchAccessRequest(request.id, { status: 'REJECTED', eventNotes: 'Access request rejected.' }, 'Access rejected')}>Reject</Button>
                    )}
                  </div>
                </div>
              </div>

              {request.events.length > 0 && (
                <div className="mt-4 border-t pt-3">
                  <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Audit trail</div>
                  <div className="space-y-1.5">
                    {request.events.slice(0, 5).map((event) => (
                      <div key={event.id} className="text-xs text-muted-foreground">
                        {new Date(event.createdAt).toLocaleString()} • {actorName(event.actor)} • {event.type.replace(/_/g, ' ')}
                        {event.toStatus ? ` → ${event.toStatus.replace(/_/g, ' ')}` : ''}
                        {event.notes ? ` — ${event.notes}` : ''}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
