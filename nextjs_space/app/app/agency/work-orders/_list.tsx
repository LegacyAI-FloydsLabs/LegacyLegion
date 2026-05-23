'use client'

import Link from 'next/link'
import { type FormEvent, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ClipboardList } from 'lucide-react'
import { Container } from '@/components/layouts/container'
import { PageHeader } from '@/components/layouts/page-header'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  BETA_WORK_ORDER_TEMPLATES,
  WORK_ORDER_OWNER_KINDS,
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_STATUSES,
} from '@/lib/work-orders'

interface ClientOption {
  id: string
  businessName: string
  industry: string
}

interface Item {
  id: string
  type: string
  title: string
  status: string
  priority: string
  ownerKind: string
  ownerLabel: string | null
  approvalStatus: string
  dueAt: string | null
  createdAt: string
  generatedAt: string | null
  deliveredAt: string | null
  client: ClientOption
  author: { name: string | null; email: string | null } | null
}

type WorkOrderForm = {
  clientId: string
  type: string
  title: string
  goal: string
  ownerKind: string
  priority: string
  dueAt: string
  evidenceLinks: string
  internalNotes: string
  clientSummary: string
  outputMarkdown: string
  nextAction: string
}

type FieldErrors = Partial<Record<keyof WorkOrderForm, string>>

function initialForm(clients: ClientOption[]): WorkOrderForm {
  const firstTemplate = BETA_WORK_ORDER_TEMPLATES[0]
  return {
    clientId: clients[0]?.id ?? '',
    type: firstTemplate.type,
    title: firstTemplate.label,
    goal: '',
    ownerKind: firstTemplate.defaultOwnerKind,
    priority: firstTemplate.defaultPriority,
    dueAt: '',
    evidenceLinks: '',
    internalNotes: '',
    clientSummary: '',
    outputMarkdown: '',
    nextAction: '',
  }
}

function badgeClass(status: string) {
  if (status === 'DELIVERED') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
  if (status === 'REVIEW') return 'bg-amber-500/15 text-amber-300 border-amber-500/30'
  if (status === 'IN_PROGRESS') return 'bg-blue-500/15 text-blue-300 border-blue-500/30'
  if (status === 'ARCHIVED') return 'bg-slate-500/15 text-slate-400 border-slate-500/30'
  return 'bg-slate-500/15 text-slate-300 border-slate-500/30'
}

function validate(form: WorkOrderForm): FieldErrors {
  const errors: FieldErrors = {}
  if (!form.clientId) errors.clientId = 'Client is required.'
  if (!form.type) errors.type = 'Template is required.'
  if (!form.title.trim()) errors.title = 'Title is required.'
  if (!form.goal.trim()) errors.goal = 'Goal is required.'
  return errors
}

export function WorkOrdersList({ clients, items: initialItems }: { clients: ClientOption[]; items: Item[] }) {
  const [items, setItems] = useState(initialItems)
  const [filter, setFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [form, setForm] = useState<WorkOrderForm>(() => initialForm(clients))

  const selectedTemplate = BETA_WORK_ORDER_TEMPLATES.find((template) => template.type === form.type) ?? BETA_WORK_ORDER_TEMPLATES[0]

  const filtered = useMemo(() => items.filter((item) => {
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false
    if (filter && !`${item.title} ${item.client.businessName} ${item.type}`.toLowerCase().includes(filter.toLowerCase())) return false
    return true
  }), [items, filter, statusFilter])

  function update<K extends keyof WorkOrderForm>(key: K, value: string) {
    setForm((current) => {
      const next = { ...current, [key]: value }
      if (key === 'type') {
        const template = BETA_WORK_ORDER_TEMPLATES.find((item) => item.type === value)
        if (template) {
          next.title = template.label
          next.ownerKind = template.defaultOwnerKind
          next.priority = template.defaultPriority
        }
      }
      return next
    })
    setErrors((current) => {
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  async function createWorkOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validate(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      toast.error('Fix the highlighted work order fields.')
      return
    }

    setBusy(true)
    try {
      const res = await fetch('/api/agency/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErrors(data?.fieldErrors ?? {})
        throw new Error(data?.error ?? 'Could not create work order')
      }
      const created = data.item as Item
      setItems((current) => [{
        ...created,
        createdAt: new Date(created.createdAt).toISOString(),
        generatedAt: created.generatedAt ? new Date(created.generatedAt).toISOString() : null,
        deliveredAt: created.deliveredAt ? new Date(created.deliveredAt).toISOString() : null,
        dueAt: created.dueAt ? new Date(created.dueAt).toISOString() : null,
      }, ...current])
      setForm(initialForm(clients))
      toast.success('Work order created')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create work order')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Container size="xl">
      <PageHeader title="Work Orders" description="Client-scoped operating spine for every marketing action." actions={<Badge variant="outline">{items.length} total</Badge>} />

      <Card className="mt-6 p-5">
        <form onSubmit={createWorkOrder} noValidate className="space-y-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            <div className="font-medium">Create work order</div>
          </div>
          {clients.length === 0 && <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">Create a client before opening work orders.</div>}
          <div className="grid gap-3 lg:grid-cols-2">
            <Field label="Client *" id="work-client" error={errors.clientId}>
              <select id="work-client" value={form.clientId} aria-invalid={Boolean(errors.clientId)} aria-describedby={errors.clientId ? 'work-client-error' : undefined} onChange={(event) => update('clientId', event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                {clients.map((client) => <option key={client.id} value={client.id}>{client.businessName}</option>)}
              </select>
            </Field>
            <Field label="Template *" id="work-template" error={errors.type}>
              <select id="work-template" value={form.type} aria-invalid={Boolean(errors.type)} aria-describedby={errors.type ? 'work-template-error' : undefined} onChange={(event) => update('type', event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                {BETA_WORK_ORDER_TEMPLATES.map((template) => <option key={template.type} value={template.type}>{template.label}</option>)}
              </select>
            </Field>
          </div>

          <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            <div className="font-medium text-foreground">{selectedTemplate.label}</div>
            <div className="mt-1">{selectedTemplate.description}</div>
            <div className="mt-2 text-xs">Required evidence: {selectedTemplate.requiredEvidence.join(', ')}</div>
            <div className="mt-1 text-xs">AI instructions: {selectedTemplate.aiInstructions}</div>
            <div className="mt-1 text-xs">Approval gate: {selectedTemplate.approvalRequired ? 'Human approval required before external/client-visible action.' : 'No approval required unless external action is added.'}</div>
          </div>

          <Field label="Title *" id="work-title" error={errors.title}>
            <Input id="work-title" value={form.title} aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? 'work-title-error' : undefined} onChange={(event) => update('title', event.target.value)} />
          </Field>
          <Field label="Goal *" id="work-goal" error={errors.goal}>
            <Textarea id="work-goal" rows={3} value={form.goal} aria-invalid={Boolean(errors.goal)} aria-describedby={errors.goal ? 'work-goal-error' : undefined} onChange={(event) => update('goal', event.target.value)} placeholder="What success looks like for this client-scoped action." />
          </Field>

          <div className="grid gap-3 lg:grid-cols-3">
            <Field label="Owner" id="work-owner">
              <select id="work-owner" value={form.ownerKind} onChange={(event) => update('ownerKind', event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                {WORK_ORDER_OWNER_KINDS.map((owner) => <option key={owner} value={owner}>{owner.replace(/_/g, ' ')}</option>)}
              </select>
            </Field>
            <Field label="Priority" id="work-priority">
              <select id="work-priority" value={form.priority} onChange={(event) => update('priority', event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                {WORK_ORDER_PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
              </select>
            </Field>
            <Field label="Due date" id="work-due-at"><Input id="work-due-at" type="date" value={form.dueAt} onChange={(event) => update('dueAt', event.target.value)} /></Field>
          </div>

          <Field label="Evidence links" id="work-evidence"><Textarea id="work-evidence" rows={2} value={form.evidenceLinks} onChange={(event) => update('evidenceLinks', event.target.value)} placeholder="One URL or screenshot path per line." /></Field>
          <Field label="Internal notes" id="work-internal-notes"><Textarea id="work-internal-notes" rows={2} value={form.internalNotes} onChange={(event) => update('internalNotes', event.target.value)} placeholder="Operator-only notes. No raw secrets." /></Field>
          <Field label="Client-facing summary" id="work-client-summary"><Textarea id="work-client-summary" rows={2} value={form.clientSummary} onChange={(event) => update('clientSummary', event.target.value)} placeholder="Safe summary for reports or approvals." /></Field>
          <Field label="Deliverable output" id="work-output"><Textarea id="work-output" rows={4} value={form.outputMarkdown} onChange={(event) => update('outputMarkdown', event.target.value)} placeholder="Optional: paste an AI/persona output to place this work order into Review." /></Field>
          <Field label="Next action" id="work-next-action"><Input id="work-next-action" value={form.nextAction} onChange={(event) => update('nextAction', event.target.value)} placeholder="What Douglas or Ryan should do next." /></Field>

          <div className="flex justify-end">
            <Button type="submit" disabled={busy || clients.length === 0}>{busy ? 'Creating…' : 'Create Work Order'}</Button>
          </div>
        </form>
      </Card>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Input className="max-w-sm" aria-label="Search work orders" placeholder="Search by client, title, type…" value={filter} onChange={(event) => setFilter(event.target.value)} />
        <div className="flex flex-wrap gap-1">
          {['ALL', ...WORK_ORDER_STATUSES].map((status) => (
            <button key={status} type="button" onClick={() => setStatusFilter(status)} className={`rounded-md border px-2.5 py-1 text-xs ${statusFilter === status ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
              {status.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      <Card className="mt-4 divide-y divide-border">
        {filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <ClipboardList className="mx-auto mb-2 h-6 w-6" />
            No work orders match.
          </div>
        )}
        {filtered.map((item) => (
          <Link key={item.id} href={`/app/agency/work-orders/${item.id}`} className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-muted/50">
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{item.type.replace(/_/g, ' ')} • {item.client.businessName}</div>
              <div className="truncate font-medium">{item.title}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {item.ownerKind.replace(/_/g, ' ')} • {item.priority} • {new Date(item.createdAt).toLocaleString()}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Badge variant="outline" className={badgeClass(item.status)}>{item.status.replace(/_/g, ' ')}</Badge>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{item.approvalStatus.replace(/_/g, ' ')}</span>
            </div>
          </Link>
        ))}
      </Card>
    </Container>
  )
}

function Field({ label, id, error, children }: { label: string; id: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p id={`${id}-error`} className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
