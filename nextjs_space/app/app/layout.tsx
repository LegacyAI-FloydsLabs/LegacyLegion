import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { TeamShell } from './_components/team-shell'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')
  if ((session.user as any).role === 'partner') redirect('/partner')
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
