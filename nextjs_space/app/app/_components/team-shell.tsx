'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/brand/logo'
import { Button } from '@/components/ui/button'
import { useMode, WorkspaceMode } from '@/lib/mode'
import { DeviceVertical, useDevice } from '@/lib/device'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  LayoutDashboard, Users, KanbanSquare, BarChart3, Calculator,
  Bot, Network, Upload, LogOut, PanelLeft, Sparkles,
  Briefcase, FileSearch, Wrench, Target, Building2, ClipboardList,
  Megaphone, ArrowRight, MessageSquare,
} from 'lucide-react'

const SALES_NAV = [
  { href: '/app', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/app/leads', label: 'Leads', icon: Users },
  { href: '/app/pipeline', label: 'Pipeline', icon: KanbanSquare },
  { href: '/app/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/app/intelligence', label: 'Intelligence', icon: Sparkles },
  { href: '/app/import', label: 'Import', icon: Upload },
  { href: '/app/referrals', label: 'Referrals', icon: Network },
  { href: '/app/roi-calculator', label: 'ROI Calculator', icon: Calculator },
  { href: '/app/agent', label: 'Agent Settings', icon: Bot },
]

const AGENCY_NAV = [
  { href: '/app/agency', label: 'Clients', icon: Building2 },
  { href: '/app/agency/work-orders', label: 'Work Orders', icon: ClipboardList },
  { href: '/app/agency/tools', label: 'Agency Tools', icon: Wrench },
  { href: '/app/agency/chat', label: 'Agent Chat', icon: MessageSquare },
  { href: '/app/agency/prospects', label: 'Prospects', icon: FileSearch },
  { href: '/app/agency/intelligence', label: 'Intelligence', icon: Sparkles },
  { href: '/app/agent', label: 'Agent Settings', icon: Bot },
]

function visibleNavItems(mode: WorkspaceMode, role: string) {
  const nav = mode === 'agency' ? AGENCY_NAV : SALES_NAV
  if (role === 'superadmin') return nav
  return nav.filter((item) => item.href !== '/app/agent')
}

export function TeamShell({
  children, user,
}: {
  children: React.ReactNode
  user: { id: string; name: string; email: string; role: string }
}) {
  const pathname = usePathname() ?? ''
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const { mode, setMode } = useMode()
  const { vertical, override, setOverride } = useDevice()

  // If user lands on /app/agency* but mode is sales, sync mode to agency. And vice-versa.
  useEffect(() => {
    if (pathname.startsWith('/app/agency') && mode !== 'agency') setMode('agency')
  }, [pathname, mode, setMode])

  const NAV = visibleNavItems(mode, user.role)
  const switchMode = (next: WorkspaceMode) => {
    setMode(next)
    if (next === 'agency' && !pathname.startsWith('/app/agency')) router.push('/app/agency')
    if (next === 'sales' && pathname.startsWith('/app/agency')) router.push('/app')
  }

  return (
    <div className="min-h-screen bg-background">
      <ShellForVertical
        vertical={vertical}
        override={override}
        setOverride={setOverride}
        mode={mode}
        switchMode={switchMode}
        user={user}
        pathname={pathname}
        nav={NAV}
        open={open}
        setOpen={setOpen}
      >
        {children}
      </ShellForVertical>
    </div>
  )
}

function ShellForVertical({
  vertical,
  override,
  setOverride,
  mode,
  switchMode,
  user,
  pathname,
  nav,
  open,
  setOpen,
  children,
}: {
  vertical: DeviceVertical
  override: DeviceVertical | null
  setOverride: (v: DeviceVertical | null) => void
  mode: WorkspaceMode
  switchMode: (next: WorkspaceMode) => void
  user: { id: string; name: string; email: string; role: string }
  pathname: string
  nav: typeof SALES_NAV
  open: boolean
  setOpen: (open: boolean) => void
  children: React.ReactNode
}) {
  const content = children

  if (vertical === 'mobile') {
    return (
      <MobileShell
        mode={mode}
        switchMode={switchMode}
        user={user}
        pathname={pathname}
        nav={nav}
        open={open}
        setOpen={setOpen}
        override={override}
        setOverride={setOverride}
      >
        {content}
      </MobileShell>
    )
  }

  if (vertical === 'tablet') {
    return (
      <TabletShell
        mode={mode}
        switchMode={switchMode}
        user={user}
        pathname={pathname}
        nav={nav}
        open={open}
        setOpen={setOpen}
        override={override}
        setOverride={setOverride}
      >
        {content}
      </TabletShell>
    )
  }

  return (
    <DesktopShell
      mode={mode}
      switchMode={switchMode}
      user={user}
      pathname={pathname}
      nav={nav}
      override={override}
      setOverride={setOverride}
    >
      {content}
    </DesktopShell>
  )
}

function ModeBadge({ mode, showLabel }: { mode: WorkspaceMode; showLabel?: boolean }) {
  if (mode === 'agency') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
        <Briefcase className="h-3 w-3" /> Agency{showLabel ? ' Mode' : ''}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
      <Target className="h-3 w-3" /> Sales{showLabel ? ' Mode' : ''}
    </span>
  )
}

function ModeSwitcher({ mode, switchMode }: { mode: WorkspaceMode; switchMode: (m: WorkspaceMode) => void }) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-background p-1">
      <button
        type="button"
        onClick={() => switchMode('sales')}
        className={cn(
          'flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
          mode === 'sales' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
        )}
        title="Sales / pipeline workspace"
      >
        <Target className="h-3.5 w-3.5" />
        Sales
      </button>
      <button
        type="button"
        onClick={() => switchMode('agency')}
        className={cn(
          'flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
          mode === 'agency' ? 'bg-fuchsia-600/20 text-fuchsia-300' : 'text-muted-foreground hover:text-foreground'
        )}
        title="Agency workspace — work FOR clients"
      >
        <Briefcase className="h-3.5 w-3.5" />
        Agency
      </button>
    </div>
  )
}

function NavList({
  nav,
  pathname,
  onNavigate,
}: {
  nav: typeof SALES_NAV
  pathname: string
  onNavigate?: () => void
}) {
  return (
    <ul className="space-y-0.5">
      {nav.map((n) => {
        const active = pathname === n.href || (n.href !== '/app' && pathname.startsWith(n.href))
        return (
          <li key={n.href}>
            <Link
              href={n.href}
              onClick={() => onNavigate?.()}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function UserRow({ user }: { user: { id: string; name: string; email: string; role: string } }) {
  const router = useRouter()
  return (
    <div className="flex items-center gap-3 px-2 py-2">
      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-fuchsia-600 grid place-items-center text-xs font-semibold text-white">
        {(user?.name?.[0] ?? user?.email?.[0] ?? 'U').toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{user?.name || user?.email}</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{user?.role}</div>
      </div>
      <Button variant="ghost" size="icon-sm" onClick={async () => { await signOut({ redirect: false }); router.replace('/login') }} aria-label="Sign out" title="Sign out">
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  )
}

function OverrideChip({
  override,
  setOverride,
}: {
  override: DeviceVertical | null
  setOverride: (v: DeviceVertical | null) => void
}) {
  return (
    <select
      aria-label="Preview device vertical"
      value={override ?? 'auto'}
      onChange={(e) => {
        const v = e.target.value
        setOverride(v === 'auto' ? null : (v as DeviceVertical))
      }}
      className="rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground"
      title="QA: force a device vertical"
    >
      <option value="auto">Auto</option>
      <option value="mobile">Mobile</option>
      <option value="tablet">Tablet</option>
      <option value="desktop">Desktop</option>
    </select>
  )
}

function PrimaryAction({ mode }: { mode: WorkspaceMode }) {
  if (mode === 'sales') {
    return (
      <Link href="/app/leads/new">
        <Button size="sm" variant="outline">+ New Lead</Button>
      </Link>
    )
  }
  return (
    <Link href="/app/agency/clients/new">
      <Button size="sm" variant="outline">+ New Client</Button>
    </Link>
  )
}

function MobileShell({
  mode,
  switchMode,
  user,
  pathname,
  nav,
  open,
  setOpen,
  override,
  setOverride,
  children,
}: {
  mode: WorkspaceMode
  switchMode: (m: WorkspaceMode) => void
  user: { id: string; name: string; email: string; role: string }
  pathname: string
  nav: typeof SALES_NAV
  open: boolean
  setOpen: (open: boolean) => void
  override: DeviceVertical | null
  setOverride: (v: DeviceVertical | null) => void
  children: React.ReactNode
}) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" onClick={() => setOpen(false)} />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-card transition-transform duration-normal',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          <div className="px-5 py-5 border-b border-border">
            <Link href={mode === 'agency' ? '/app/agency' : '/app'} onClick={() => setOpen(false)}><Logo /></Link>
          </div>
          <div className="px-3 pt-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground px-1 pb-1.5">Mode</div>
            <ModeSwitcher mode={mode} switchMode={switchMode} />
          </div>
          <nav className="flex-1 overflow-y-auto p-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground px-3 pb-2 pt-1">
              {mode === 'agency' ? 'Client Work' : 'Workspace'}
            </div>
            <NavList nav={nav} pathname={pathname} onNavigate={() => setOpen(false)} />
          </nav>
          <div className="border-t border-border p-3">
            <UserRow user={user} />
          </div>
        </div>
      </aside>

      <div>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card/80 backdrop-blur-md px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
          <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
            <PanelLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <ModeBadge mode={mode} />
          </div>
          <OverrideChip override={override} setOverride={setOverride} />
          <PrimaryAction mode={mode} />
          <ThemeToggle />
        </header>
        <main className="p-4 px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pb-[calc(theme(spacing.4)+env(safe-area-inset-bottom))]">{children}</main>
        <nav className="fixed bottom-0 inset-x-0 z-30 h-16 border-t border-border bg-card/95 backdrop-blur-md px-2 px-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] pb-[env(safe-area-inset-bottom)]">
          <ul className="flex h-full items-center justify-around">
            {nav.slice(0, 5).map((n) => {
              const active = pathname === n.href || (n.href !== '/app' && pathname.startsWith(n.href))
              return (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    className={cn(
                      'flex flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1 text-[10px] min-w-[3.5rem]',
                      active ? 'text-primary' : 'text-muted-foreground'
                    )}
                  >
                    <n.icon className="h-5 w-5" />
                    <span className="truncate max-w-[4rem]">{n.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
        <div className="h-16" />
      </div>
    </>
  )
}

function TabletShell({
  mode,
  switchMode,
  user,
  pathname,
  nav,
  open,
  setOpen,
  override,
  setOverride,
  children,
}: {
  mode: WorkspaceMode
  switchMode: (m: WorkspaceMode) => void
  user: { id: string; name: string; email: string; role: string }
  pathname: string
  nav: typeof SALES_NAV
  open: boolean
  setOpen: (open: boolean) => void
  override: DeviceVertical | null
  setOverride: (v: DeviceVertical | null) => void
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" onClick={() => setOpen(false)} />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 border-r border-border bg-card transition-all duration-normal',
          collapsed ? 'w-16' : 'w-56'
        )}
      >
        <div className="flex h-full flex-col">
          <div className={cn('border-b border-border', collapsed ? 'px-2 py-5' : 'px-4 py-5')}>
            <Link href={mode === 'agency' ? '/app/agency' : '/app'}>
              {collapsed ? <Logo size="sm" /> : <Logo />}
            </Link>
          </div>
          <nav className="flex-1 overflow-y-auto p-2">
            <ul className="space-y-1">
              {nav.map((n) => {
                const active = pathname === n.href || (n.href !== '/app' && pathname.startsWith(n.href))
                return (
                  <li key={n.href}>
                    <Link
                      href={n.href}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                        active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                      title={collapsed ? n.label : undefined}
                    >
                      <n.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="truncate">{n.label}</span>}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
          <div className="border-t border-border p-2">
            <UserRow user={user} />
          </div>
        </div>
      </aside>

      <div className={cn('transition-all duration-normal', collapsed ? 'pl-16' : 'pl-56')}>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-card/80 backdrop-blur-md px-5">
          <Button variant="ghost" size="icon" onClick={() => setCollapsed((c) => !c)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <PanelLeft className={cn('h-5 w-5 transition-transform', collapsed && 'rotate-180')} />
          </Button>
          <div className="flex-1 text-sm text-muted-foreground flex items-center gap-2">
            <ModeBadge mode={mode} showLabel />
          </div>
          <OverrideChip override={override} setOverride={setOverride} />
          <PrimaryAction mode={mode} />
          <ThemeToggle />
        </header>
        <main className="p-5">{children}</main>
      </div>
    </>
  )
}

function DesktopShell({
  mode,
  switchMode,
  user,
  pathname,
  nav,
  override,
  setOverride,
  children,
}: {
  mode: WorkspaceMode
  switchMode: (m: WorkspaceMode) => void
  user: { id: string; name: string; email: string; role: string }
  pathname: string
  nav: typeof SALES_NAV
  override: DeviceVertical | null
  setOverride: (v: DeviceVertical | null) => void
  children: React.ReactNode
}) {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-card">
        <div className="flex h-full flex-col">
          <div className="px-5 py-5 border-b border-border">
            <Link href={mode === 'agency' ? '/app/agency' : '/app'}><Logo /></Link>
          </div>

          <div className="px-3 pt-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground px-1 pb-1.5">Mode</div>
            <ModeSwitcher mode={mode} switchMode={switchMode} />
          </div>

          <nav className="flex-1 overflow-y-auto p-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground px-3 pb-2 pt-1">
              {mode === 'agency' ? 'Client Work' : 'Workspace'}
            </div>
            <NavList nav={nav} pathname={pathname} />
          </nav>
          <div className="border-t border-border p-3">
            <UserRow user={user} />
          </div>
        </div>
      </aside>

      <div className="pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-card/80 backdrop-blur-md px-6">
          <div className="flex-1 text-sm text-muted-foreground flex items-center gap-2">
            <ModeBadge mode={mode} showLabel />
            <span>Doing the work {mode === 'agency' ? 'FOR clients' : 'to close new business'}</span>
          </div>
          <OverrideChip override={override} setOverride={setOverride} />
          <PrimaryAction mode={mode} />
          <ThemeToggle />
        </header>
        <main className="p-8">{children}</main>
      </div>
    </>
  )
}
