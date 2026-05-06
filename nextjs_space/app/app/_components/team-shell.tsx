'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/brand/logo'
import { Button } from '@/components/ui/button'
import { useMode, WorkspaceMode } from '@/lib/mode'
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
  { href: '/app/intelligence', label: 'Intelligence', icon: Sparkles },
  { href: '/app/agent', label: 'Agent Settings', icon: Bot },
]

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

  // If user lands on /app/agency* but mode is sales, sync mode to agency. And vice-versa.
  useEffect(() => {
    if (pathname.startsWith('/app/agency') && mode !== 'agency') setMode('agency')
  }, [pathname, mode, setMode])

  const NAV = mode === 'agency' ? AGENCY_NAV : SALES_NAV
  const switchMode = (next: WorkspaceMode) => {
    setMode(next)
    if (next === 'agency' && !pathname.startsWith('/app/agency')) router.push('/app/agency')
    if (next === 'sales' && pathname.startsWith('/app/agency')) router.push('/app')
  }

  return (
    <div className="min-h-screen bg-background">
      {open && (
        <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />
      )}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-card transition-transform duration-normal lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex h-full flex-col">
          <div className="px-5 py-5 border-b border-border">
            <Link href={mode === 'agency' ? '/app/agency' : '/app'} onClick={() => setOpen(false)}><Logo /></Link>
          </div>

          {/* Mode switcher */}
          <div className="px-3 pt-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground px-1 pb-1.5">Mode</div>
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
          </div>

          <nav className="flex-1 overflow-y-auto p-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground px-3 pb-2 pt-1">
              {mode === 'agency' ? 'Client Work' : 'Workspace'}
            </div>
            <ul className="space-y-0.5">
              {NAV.map((n) => {
                const active = pathname === n.href || (n.href !== '/app' && pathname.startsWith(n.href))
                return (
                  <li key={n.href}>
                    <Link
                      href={n.href}
                      onClick={() => setOpen(false)}
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
          </nav>
          <div className="border-t border-border p-3">
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-fuchsia-600 grid place-items-center text-xs font-semibold text-white">
                {(user?.name?.[0] ?? user?.email?.[0] ?? 'U').toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{user?.name || user?.email}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{user?.role}</div>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => signOut({ callbackUrl: '/' })} title="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-card/80 backdrop-blur-md px-4 sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)}>
            <PanelLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 text-sm text-muted-foreground flex items-center gap-2">
            {mode === 'agency' ? (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-2 py-0.5 text-[11px] font-medium text-fuchsia-300">
                  <Briefcase className="h-3 w-3" /> Agency Mode
                </span>
                <span className="hidden sm:inline">Doing the work FOR clients</span>
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  <Target className="h-3 w-3" /> Sales Mode
                </span>
                <span className="hidden sm:inline">Closing new business</span>
              </>
            )}
          </div>
          {mode === 'sales' ? (
            <Link href="/get-started" target="_blank">
              <Button size="sm" variant="outline">View Public Form</Button>
            </Link>
          ) : (
            <Link href="/app/agency/clients/new">
              <Button size="sm" variant="outline">+ New Client</Button>
            </Link>
          )}
        </header>
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
