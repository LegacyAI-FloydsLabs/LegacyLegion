import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isInternalRole } from '@/lib/authz'
import { TeamShell } from './_components/team-shell'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')
  if (!isInternalRole((session.user as any).role)) redirect('/login')
  return (
    <TeamShell user={{
      id: (session.user as any).id,
      name: session.user.name ?? '',
      email: session.user.email ?? '',
      role: (session.user as any).role,
    }}>
      {children}
    </TeamShell>
  )
}
