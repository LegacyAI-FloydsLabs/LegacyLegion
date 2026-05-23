'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { KeyRound, ShieldCheck, ShieldAlert, LockKeyhole } from 'lucide-react'
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
  if (status === 'VERIFIED') return 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
  if (status === 'ACCESS_RECEIVED') return 'border-blue-500/30 bg-blue-500/15 text-blue-300'
  if (status === 'BLOCKED' || status === 'REVOKED') return 'border-rose-500/30 bg-rose-500/15 text-rose-300'
  if (status === 'INVITE_SENT' || status === 'REQUESTED') return 'border-amber-500/30 bg-amber-500/15 text-amber-300'
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
  const [form, setForm] = useState({ platform: 'WEBSITE_CMS', resourceUrl: '', requestNotes: '' })
  const [vaultDrafts, setVaultDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialRequests.map((request) => [request.id, request.externalVaultRef ?? ''])),
  )
  const isSuperAdmin = currentUserRole === 'superadmin'

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
        body: JSON.stringify({ ...form, status: 'REQUESTED' }),
      })
      if (!res.ok) throw new Error(await readError(res))
      const data = await res.json()
      upsertRequest(data.accessRequest)
      setForm({ platform: 'WEBSITE_CMS', resourceUrl: '', requestNotes: '' })
      toast.success('Access request recorded')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not record access request')
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
      status: externalVaultRef ? 'ACCESS_RECEIVED' : request.status,
      eventNotes: externalVaultRef ? 'External reference recorded; raw credentials remain outside LegacyLegion.' : 'External reference cleared.',
    }, 'External reference updated')
  }

  return (
    <div className="space-y-4">
      <Card className="border-amber-500/30 bg-amber-500/10 p-4">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
          <div>
            <div className="font-medium text-amber-100">Do not store passwords or recovery material here.</div>
            <div className="mt-1 text-sm text-amber-100/80">
              Track whether access is needed, requested, invited, received, verified, blocked, or revoked. Raw credentials stay outside LegacyLegion; only SUPERADMIN can record external references.
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-4 flex items-center gap-2">
          <KeyRound className="h-4 w-4" />
          <div className="font-medium">New access request</div>
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
            <Label htmlFor="access-notes">Request notes</Label>
            <Textarea
              id="access-notes"
              rows={3}
              value={form.requestNotes}
              onChange={(event) => setForm((prev) => ({ ...prev, requestNotes: event.target.value }))}
              placeholder="Who needs access, why, and what invite/admin path is expected. No passwords, recovery codes, API keys, or tokens."
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button size="sm" onClick={createAccessRequest} disabled={busy === 'create'}>{busy === 'create' ? 'Recording…' : 'Record access request'}</Button>
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
                    {request.approver ? ` • SUPERADMIN action by ${actorName(request.approver)}` : ''}
                  </div>
                  {request.resourceUrl && (
                    <a href={request.resourceUrl} target="_blank" rel="noreferrer" className="mt-2 block break-all text-sm text-primary hover:underline">{request.resourceUrl}</a>
                  )}
                  {request.requestNotes && <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{request.requestNotes}</div>}
                  {isSuperAdmin && request.decisionNotes && <div className="mt-2 whitespace-pre-wrap text-sm text-emerald-200">SUPERADMIN notes: {request.decisionNotes}</div>}
                </div>
                <div className="min-w-[260px] space-y-2">
                  {isSuperAdmin ? (
                    <>
                      <Label htmlFor={`external-reference-${request.id}`} className="text-xs">External reference only</Label>
                      <Input
                        id={`external-reference-${request.id}`}
                        value={vaultDrafts[request.id] ?? ''}
                        onChange={(event) => setVaultDrafts((prev) => ({ ...prev, [request.id]: event.target.value }))}
                        placeholder="No raw credentials"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" disabled={busy === request.id} onClick={() => saveVaultRef(request)}>Save reference</Button>
                        {request.status !== 'INVITE_SENT' && request.status !== 'ACCESS_RECEIVED' && request.status !== 'VERIFIED' && request.status !== 'REVOKED' && (
                          <Button size="sm" variant="outline" disabled={busy === request.id} onClick={() => patchAccessRequest(request.id, { status: 'INVITE_SENT', eventNotes: 'Admin invitation sent or requested through platform workflow.' }, 'Invite status recorded')}>Invite Sent</Button>
                        )}
                        {request.status !== 'VERIFIED' && (
                          <Button
                            size="sm"
                            disabled={busy === request.id || !(vaultDrafts[request.id] ?? '').trim()}
                            onClick={() => patchAccessRequest(request.id, { status: 'VERIFIED', eventNotes: 'Access verified for controlled internal use.' }, 'Access verified')}
                          >
                            <ShieldCheck className="mr-1 h-4 w-4" />Verify
                          </Button>
                        )}
                        {request.status !== 'REVOKED' && (
                          <Button size="sm" variant="outline" disabled={busy === request.id} onClick={() => patchAccessRequest(request.id, { status: 'REVOKED', eventNotes: 'Access revoked.' }, 'Access revoked')}>Revoke</Button>
                        )}
                        {request.status !== 'BLOCKED' && request.status !== 'VERIFIED' && request.status !== 'REVOKED' && (
                          <Button size="sm" variant="ghost" disabled={busy === request.id} onClick={() => patchAccessRequest(request.id, { status: 'BLOCKED', eventNotes: 'Access blocked pending external action.' }, 'Access blocked')}>Block</Button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                      <LockKeyhole className="mb-2 h-4 w-4" />
                      External references and credential notes are SUPERADMIN-only. Ryan sees status, platform, URL, non-secret notes, and audit history only.
                    </div>
                  )}
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
