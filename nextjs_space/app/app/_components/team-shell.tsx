'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/brand/logo'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard, Users, KanbanSquare, BarChart3, Calculator,
  Bot, Network, Upload, LogOut, PanelLeft, Settings, Sparkles,
} from 'lucide-react'

const NAV = [
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

export function TeamShell({
  children, user,
}: {
  children: React.ReactNode
  user: { id: string; name: string; email: string; role: string }
}) {
  const pathname = usePathname() ?? ''
  const [open, setOpen] = useState(false)

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
            <Link href="/app" onClick={() => setOpen(false)}><Logo /></Link>
          </div>
          <nav className="flex-1 overflow-y-auto p-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground px-3 pb-2">Workspace</div>
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
          <div className="flex-1 text-sm text-muted-foreground">{user?.role === 'admin' ? 'Admin Workspace' : 'Team Workspace'}</div>
          <Link href="/get-started" target="_blank">
            <Button size="sm" variant="outline">View Public Form</Button>
          </Link>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
