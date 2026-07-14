'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, Bot, BriefcaseBusiness, KeyRound, ShieldCheck, UserPlus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ACTIVE_ACCOUNT_ROLES, isDisabledRole, restoreRole } from '@/lib/roles'

type ConsoleUser = {
  id: string
  email: string
  name: string | null
  role: string
  createdAt: string
  updatedAt: string
}

type RuntimeThread = {
  id: string
  title: string | null
  persona: string
  updatedAt: string
  turns: number
  user: { name: string | null; email: string } | null
  client: { businessName: string } | null
}

type SuperadminConsoleProps = {
  currentUserId: string
  environment: string
  runtimeEnabled: boolean
  users: ConsoleUser[]
  stats: { users: number; leads: number; clients: number; workOrders: number; runtimeThreads: number }
  integrations: { label: string; configured: boolean }[]
  recentRuntimeThreads: RuntimeThread[]
}

async function responseError(response: Response): Promise<string> {
  const data = await response.json().catch(() => ({})) as { error?: string }
  return data.error ?? 'The account change could not be saved.'
}

function roleLabel(role: string): string {
  return role.replace('disabled:', '').replace(/_/g, ' ').toUpperCase()
}

function UserControls({ user, currentUserId }: { user: ConsoleUser; currentUserId: string }) {
  const router = useRouter()
  const [role, setRole] = useState(restoreRole(user.role))
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const disabled = isDisabledRole(user.role)
  const isCurrentUser = user.id === currentUserId

  async function patch(payload: Record<string, string>) {
    setBusy(true)
    try {
      const response = await fetch(`/api/superadmin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error(await responseError(response))
      setPassword('')
      toast.success('Account updated')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Account update failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-2 lg:grid-cols-[180px_1fr_auto_auto]">
      <Select value={role} onValueChange={(value) => setRole(restoreRole(value))} disabled={busy || disabled || isCurrentUser}>
        <SelectTrigger aria-label={`Role for ${user.email}`}><SelectValue /></SelectTrigger>
        <SelectContent>
          {ACTIVE_ACCOUNT_ROLES.map((accountRole) => (
            <SelectItem key={accountRole} value={accountRole}>{roleLabel(accountRole)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="password"
        value={password}
        minLength={12}
        autoComplete="new-password"
        onChange={(event) => setPassword(event.target.value)}
        placeholder="New temporary password"
        aria-label={`New temporary password for ${user.email}`}
        disabled={busy}
      />
      <Button
        variant="outline"
        disabled={busy || (!password && role === restoreRole(user.role))}
        onClick={() => patch(password ? { role, password } : { role })}
      >
        {password ? <KeyRound className="mr-1 h-4 w-4" /> : null}Save
      </Button>
      <Button
        variant={disabled ? 'outline' : 'destructive'}
        disabled={busy || isCurrentUser}
        onClick={() => patch({ action: disabled ? 'restore' : 'disable' })}
      >
        {disabled ? 'Restore' : 'Disable'}
      </Button>
    </div>
  )
}

export function SuperadminConsole({
  currentUserId,
  environment,
  runtimeEnabled,
  users,
  stats,
  integrations,
  recentRuntimeThreads,
}: SuperadminConsoleProps) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'team' })

  async function createUser() {
    setBusy(true)
    try {
      const response = await fetch('/api/superadmin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!response.ok) throw new Error(await responseError(response))
      setForm({ name: '', email: '', password: '', role: 'team' })
      toast.success('Account created')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Account creation failed')
    } finally {
      setBusy(false)
    }
  }

  const summary = [
    { label: 'Accounts', value: stats.users, icon: Users },
    { label: 'Leads', value: stats.leads, icon: Activity },
    { label: 'Clients', value: stats.clients, icon: BriefcaseBusiness },
    { label: 'Work orders', value: stats.workOrders, icon: ShieldCheck },
    { label: 'Agent threads', value: stats.runtimeThreads, icon: Bot },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Superadmin Console</h1>
          <p className="mt-1 text-muted-foreground">Operator access, system readiness, and autonomous-runtime visibility.</p>
        </div>
        <Badge variant="outline">{environment.toUpperCase()}</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {summary.map((item) => (
          <Card key={item.label}>
            <CardContent className="flex items-center justify-between p-4">
              <div><div className="text-xs text-muted-foreground">{item.label}</div><div className="mt-1 text-2xl font-semibold">{item.value}</div></div>
              <item.icon className="h-5 w-5 text-primary" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader><CardTitle className="text-lg">System readiness</CardTitle></CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {integrations.map((integration) => (
              <div key={integration.label} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <span>{integration.label}</span>
                <Badge variant="outline" className={integration.configured ? 'border-emerald-500/30 text-emerald-300' : 'border-amber-500/30 text-amber-300'}>
                  {integration.configured ? 'Configured' : 'Needs setup'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Autonomous runtime</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center justify-between rounded-md border p-3">
              <span>Marketing runtime</span>
              <Badge variant="outline" className={runtimeEnabled ? 'border-emerald-500/30 text-emerald-300' : 'border-amber-500/30 text-amber-300'}>
                {runtimeEnabled ? 'Ready' : 'Disabled here'}
              </Badge>
            </div>
            <p className="text-muted-foreground">Runs remain review-gated. This console exposes readiness without exposing provider keys or bypassing work-order approval.</p>
            <Link href="/app/agency/chat"><Button className="w-full" disabled={!runtimeEnabled}><Bot className="mr-2 h-4 w-4" />Open Runtime Control</Button></Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><UserPlus className="h-5 w-5" />Create account</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1.4fr_1.2fr_180px_auto]">
          <div><Label htmlFor="new-user-name">Name</Label><Input id="new-user-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div>
          <div><Label htmlFor="new-user-email">Email</Label><Input id="new-user-email" type="email" autoComplete="off" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></div>
          <div><Label htmlFor="new-user-password">Temporary password</Label><Input id="new-user-password" type="password" minLength={12} autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></div>
          <div><Label>Role</Label><Select value={form.role} onValueChange={(role) => setForm({ ...form, role })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ACTIVE_ACCOUNT_ROLES.map((role) => <SelectItem key={role} value={role}>{roleLabel(role)}</SelectItem>)}</SelectContent></Select></div>
          <Button className="self-end" onClick={createUser} disabled={busy || !form.email || form.password.length < 12}>Create</Button>
          <p className="text-xs text-muted-foreground md:col-span-2 xl:col-span-5">Passwords are accepted only for hashing and are never displayed or returned. Send temporary credentials through a secure channel.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Account control</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="space-y-3 rounded-md border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><div className="font-medium">{user.name || 'Unnamed account'}</div><div className="text-sm text-muted-foreground">{user.email}</div></div>
                <div className="flex items-center gap-2">
                  {user.id === currentUserId ? <Badge variant="secondary">You</Badge> : null}
                  <Badge variant="outline" className={isDisabledRole(user.role) ? 'border-rose-500/30 text-rose-300' : ''}>{isDisabledRole(user.role) ? `DISABLED · ${roleLabel(user.role)}` : roleLabel(user.role)}</Badge>
                  <span className="text-xs text-muted-foreground">Updated {new Date(user.updatedAt).toLocaleString()}</span>
                </div>
              </div>
              <UserControls user={user} currentUserId={currentUserId} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Recent agent activity</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {recentRuntimeThreads.map((thread) => (
            <div key={thread.id} className="grid gap-1 rounded-md border p-3 text-sm md:grid-cols-[1fr_180px_100px_180px]">
              <div><div className="font-medium">{thread.title || thread.persona}</div><div className="text-xs text-muted-foreground">{thread.client?.businessName ?? 'No client'} · {thread.user?.name ?? thread.user?.email ?? 'Unknown operator'}</div></div>
              <div className="text-muted-foreground">{thread.persona}</div>
              <div>{thread.turns} turns</div>
              <div className="text-xs text-muted-foreground">{new Date(thread.updatedAt).toLocaleString()}</div>
            </div>
          ))}
          {recentRuntimeThreads.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">No agent activity recorded.</p> : null}
        </CardContent>
      </Card>
    </div>
  )
}
