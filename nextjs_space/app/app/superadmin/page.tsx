import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdminRole } from '@/lib/authz'
import { prisma } from '@/lib/db'
import { PermissionDenied } from '../_components/permission-denied'
import { SuperadminConsole } from './_components/superadmin-console'

export const dynamic = 'force-dynamic'

export default async function SuperadminPage() {
  const session = await getServerSession(authOptions)
  const currentUserId = session?.user?.id
  if (!currentUserId || !isSuperAdminRole(session?.user?.role)) {
    return <PermissionDenied description="Account control, system readiness, and runtime operations require the SUPERADMIN role." />
  }

  const [users, leadCount, clientCount, workOrderCount, runtimeCount, recentRuntimeThreads] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true },
    }),
    prisma.lead.count(),
    prisma.client.count(),
    prisma.clientWorkOrder.count(),
    prisma.agentThread.count(),
    prisma.agentThread.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 8,
      select: {
        id: true,
        title: true,
        persona: true,
        updatedAt: true,
        user: { select: { name: true, email: true } },
        client: { select: { businessName: true } },
        _count: { select: { turns: true } },
      },
    }),
  ])

  const environment = process.env.VERCEL_ENV ?? 'local'
  const runtimeEnabled = environment !== 'preview' || process.env.MARKETING_RUNTIME_ENABLED === 'true'
  const integrations = [
    { label: 'Database', configured: true },
    { label: 'Authentication', configured: Boolean(process.env.NEXTAUTH_SECRET) },
    { label: 'RouteLLM', configured: Boolean(process.env.ABACUSAI_API_KEY) },
    { label: 'Pinecone memory', configured: Boolean(process.env.PINECONE_API_KEY && process.env.PINECONE_PRIMARY_HOST) },
    { label: 'Apollo', configured: Boolean(process.env.APOLLO_API_KEY) },
    { label: 'Explorium', configured: Boolean(process.env.EXPLORIUM_API_KEY) },
    { label: 'Scheduled jobs', configured: Boolean(process.env.CRON_SECRET) },
  ]

  return (
    <SuperadminConsole
      currentUserId={currentUserId}
      environment={environment}
      runtimeEnabled={runtimeEnabled}
      users={users.map((user) => ({
        ...user,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      }))}
      stats={{ users: users.length, leads: leadCount, clients: clientCount, workOrders: workOrderCount, runtimeThreads: runtimeCount }}
      integrations={integrations}
      recentRuntimeThreads={recentRuntimeThreads.map((thread) => ({
        ...thread,
        updatedAt: thread.updatedAt.toISOString(),
        turns: thread._count.turns,
      }))}
    />
  )
}
