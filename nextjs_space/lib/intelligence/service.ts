import { prisma } from '@/lib/db'
import { fetchPublicGBP, type GBPSnapshot } from './gbp'
import { summarizeGscCsv, type GscSummary } from './gsc'
import { upsertClientIntelligenceMemory } from '@/lib/agents/memory'

export class ClientIntelligenceError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 400) {
    super(message)
    this.name = 'ClientIntelligenceError'
  }
}

export async function refreshClientGBP(clientId: string) {
  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true, gbpUrl: true } })
  if (!client) throw new ClientIntelligenceError('CLIENT_NOT_FOUND', 'Client not found.', 404)
  if (!client.gbpUrl) throw new ClientIntelligenceError('GBP_URL_REQUIRED', 'Client Google Business Profile URL is required.', 400)

  const snapshot = await fetchPublicGBP(client.gbpUrl)
  await prisma.clientIntelligence.upsert({
    where: { clientId: client.id },
    create: { clientId: client.id, gbpSnapshotJson: snapshot as any, fetchedAt: new Date(snapshot.fetchedAt) },
    update: { gbpSnapshotJson: snapshot as any, fetchedAt: new Date(snapshot.fetchedAt) },
  })
  await upsertClientIntelligenceMemory(client.id)
  return snapshot
}

export async function saveClientGscSummary(clientId: string, csvText: string) {
  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } })
  if (!client) throw new ClientIntelligenceError('CLIENT_NOT_FOUND', 'Client not found.', 404)

  const summary = summarizeGscCsv(csvText)
  await prisma.clientIntelligence.upsert({
    where: { clientId: client.id },
    create: { clientId: client.id, gscSummaryJson: summary as any, fetchedAt: new Date() },
    update: { gscSummaryJson: summary as any, fetchedAt: new Date() },
  })
  await upsertClientIntelligenceMemory(client.id)
  return summary
}

export async function refreshAllActiveClientGBP() {
  const clients = await prisma.client.findMany({
    where: { status: { not: 'CHURNED' }, gbpUrl: { not: null } },
    select: { id: true, businessName: true },
  })

  const results: { clientId: string; businessName: string; ok: boolean; snapshot?: GBPSnapshot; error?: string }[] = []
  for (const client of clients) {
    try {
      results.push({ clientId: client.id, businessName: client.businessName, ok: true, snapshot: await refreshClientGBP(client.id) })
    } catch (error: any) {
      results.push({ clientId: client.id, businessName: client.businessName, ok: false, error: error?.message ?? 'GBP refresh failed' })
    }
  }

  return {
    checked: clients.length,
    refreshed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    results,
  }
}

export type { GBPSnapshot, GscSummary }
