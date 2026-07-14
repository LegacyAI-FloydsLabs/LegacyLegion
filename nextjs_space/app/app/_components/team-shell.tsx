'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/brand/logo'
import { Button } from '@/components/ui/button'
import { DeviceVertical, useDevice } from '@/lib/device'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  LayoutDashboard, Users, KanbanSquare, BarChart3, Calculator,
  Bot, Network, Upload, LogOut, PanelLeft, Sparkles,
  FileSearch, Wrench, Building2, ClipboardList, MessageSquare, Plus,
} from 'lucide-react'

const UNIFIED_NAV = [
  { href: '/app', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/app/leads', label: 'Leads', icon: Users },
  { href: '/app/pipeline', label: 'Pipeline', icon: KanbanSquare },
  { href: '/app/agency', label: 'Clients', icon: Building2 },
  { href: '/app/agency/work-orders', label: 'Work Orders', icon: ClipboardList },
  { href: '/app/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/app/intelligence', label: 'Lead Intelligence', icon: Sparkles },
  { href: '/app/agency/intelligence', label: 'Client Intelligence', icon: Sparkles },
  { href: '/app/agency/prospects', label: 'Prospects', icon: FileSearch },
  { href: '/app/agency/tools', label: 'Agency Tools', icon: Wrench },
  { href: '/app/agency/chat', label: 'Agent Chat', icon: MessageSquare },
  { href: '/app/import', label: 'Import', icon: Upload },
  { href: '/app/referrals', label: 'Referrals', icon: Network },
  { href: '/app/roi-calculator', label: 'ROI Calculator', icon: Calculator },
  { href: '/app/agent', label: 'Agent Settings', icon: Bot },
]

function visibleNavItems(role: string) {
  if (role === 'superadmin') return UNIFIED_NAV
  return UNIFIED_NAV.filter((item) => item.href !== '/app/agent')
}

export function TeamShell({
  children, user,
}: {
  children: React.ReactNode
  user: { id: string; name: string; email: string; role: string }
}) {
  const pathname = usePathname() ?? ''
  const [open, setOpen] = useState(false)
  const { vertical, override, setOverride } = useDevice()

  const nav = visibleNavItems(user.role)

  return (
    <div className="min-h-screen bg-background">
      <ShellForVertical
        vertical={vertical}
        override={override}
        setOverride={setOverride}
        user={user}
        pathname={pathname}
        nav={nav}
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
  user: { id: string; name: string; email: string; role: string }
  pathname: string
  nav: typeof UNIFIED_NAV
  open: boolean
  setOpen: (open: boolean) => void
  children: React.ReactNode
}) {
  const content = children

  if (vertical === 'mobile') {
    return (
      <MobileShell
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

function NavList({
  nav,
  pathname,
  onNavigate,
}: {
  nav: typeof UNIFIED_NAV
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

function PrimaryActions() {
  return (
    <div className="flex items-center gap-1.5">
      <Link href="/app/leads/new">
        <Button size="sm" variant="outline" aria-label="New lead" title="New lead">
          <Plus className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Lead</span>
        </Button>
      </Link>
      <Link href="/app/agency/clients/new">
        <Button size="sm" variant="outline" aria-label="New client" title="New client">
          <Plus className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Client</span>
        </Button>
      </Link>
    </div>
  )
}

function MobileShell({
  user,
  pathname,
  nav,
  open,
  setOpen,
  override,
  setOverride,
  children,
}: {
  user: { id: string; name: string; email: string; role: string }
  pathname: string
  nav: typeof UNIFIED_NAV
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
            <Link href="/app" onClick={() => setOpen(false)}><Logo /></Link>
          </div>
          <nav className="flex-1 overflow-y-auto p-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground px-3 pb-2 pt-1">
              Command Center
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
            <span className="text-xs font-medium text-foreground">Command Center</span>
          </div>
          <OverrideChip override={override} setOverride={setOverride} />
          <PrimaryActions />
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
  user,
  pathname,
  nav,
  open,
  setOpen,
  override,
  setOverride,
  children,
}: {
  user: { id: string; name: string; email: string; role: string }
  pathname: string
  nav: typeof UNIFIED_NAV
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
            <Link href="/app">
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
            <span className="font-medium text-foreground">Unified Command Center</span>
          </div>
          <OverrideChip override={override} setOverride={setOverride} />
          <PrimaryActions />
          <ThemeToggle />
        </header>
        <main className="p-5">{children}</main>
      </div>
    </>
  )
}

function DesktopShell({
  user,
  pathname,
  nav,
  override,
  setOverride,
  children,
}: {
  user: { id: string; name: string; email: string; role: string }
  pathname: string
  nav: typeof UNIFIED_NAV
  override: DeviceVertical | null
  setOverride: (v: DeviceVertical | null) => void
  children: React.ReactNode
}) {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-card">
        <div className="flex h-full flex-col">
          <div className="px-5 py-5 border-b border-border">
            <Link href="/app"><Logo /></Link>
          </div>

          <nav className="flex-1 overflow-y-auto p-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground px-3 pb-2 pt-1">
              Command Center
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
            <span className="font-medium text-foreground">Unified Command Center</span>
            <span>Sales and client delivery in one workspace</span>
          </div>
          <OverrideChip override={override} setOverride={setOverride} />
          <PrimaryActions />
          <ThemeToggle />
        </header>
        <main className="p-8">{children}</main>
      </div>
    </>
  )
}
