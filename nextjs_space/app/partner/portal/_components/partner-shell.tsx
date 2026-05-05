'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { LayoutDashboard, UserPlus, LogOut } from 'lucide-react';
import { Logo } from '@/components/brand/logo';
import { cn } from '@/lib/utils';

const items = [
  { href: '/partner/portal', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/partner/portal/refer', label: 'Submit Referral', icon: UserPlus },
];

export function PartnerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-border bg-card/40 lg:flex">
        <div className="flex h-16 items-center px-5">
          <Link href="/partner/portal"><Logo /></Link>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {items.map((it) => {
            const Icon = it.icon;
            const active = pathname === it.href;
            return (
              <Link
                key={it.href}
                href={it.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-card/60 hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-3">
          <button
            onClick={() => signOut({ callbackUrl: '/partner/login' })}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-card/60 hover:text-foreground"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>
      <main className="lg:pl-60">
        <div className="min-h-screen px-4 py-8 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
