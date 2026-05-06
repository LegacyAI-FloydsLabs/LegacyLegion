import { prisma } from '@/lib/db'

export const EXPORT_MARKDOWN_H2_ORDER = [
  'Profile',
  'Engagement',
  'Strategy',
  'Recent Work Orders',
  'Recent Notes',
  'Recent Conversations',
  'Intelligence Brief',
] as const

export type ClientSnapshotFormat = 'md' | 'json' | 'pdf'

export interface ClientSnapshot {
  generatedAt: string
  exportedById: string
  client: any
  workOrders: any[]
  notes: any[]
  conversations: any[]
  intelligenceBrief: any | null
}

function daysAgo(now: Date, days: number) {
  const value = new Date(now)
  value.setDate(value.getDate() - days)
  return value
}

function iso(value: Date | string | null | undefined) {
  if (!value) return null
  return value instanceof Date ? value.toISOString() : value
}

function cleanJson(value: any): any {
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(cleanJson)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cleanJson(item)]))
  }
  return value ?? null
}

export async function getClientSnapshot({
  clientId,
  exportedById,
  generatedAt = new Date(),
}: {
  clientId: string
  exportedById: string
  generatedAt?: Date
}): Promise<ClientSnapshot> {
  const [client, workOrders, notes, conversations, intelligenceBrief] = await Promise.all([
    prisma.client.findUnique({ where: { id: clientId } }),
    prisma.clientWorkOrder.findMany({
      where: { clientId, createdAt: { gte: daysAgo(generatedAt, 90) } },
      include: { author: { select: { name: true, email: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    }),
    prisma.clientNote.findMany({
      where: { clientId, createdAt: { gte: daysAgo(generatedAt, 90) } },
      include: { author: { select: { name: true, email: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    }),
    prisma.agentThread.findMany({
      where: { clientId, createdAt: { gte: daysAgo(generatedAt, 30) } },
      include: { turns: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] } },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    }),
    prisma.clientIntelligence.findUnique({ where: { clientId } }),
  ])
  if (!client) throw new Error('CLIENT_NOT_FOUND')

  return {
    generatedAt: generatedAt.toISOString(),
    exportedById,
    client: cleanJson(client),
    workOrders: cleanJson(workOrders),
    notes: cleanJson(notes),
    conversations: cleanJson(conversations),
    intelligenceBrief: cleanJson(intelligenceBrief),
  }
}

function valueOrDash(value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

function bullet(label: string, value: unknown) {
  return `- ${label}: ${valueOrDash(value)}`
}

function jsonBlock(value: unknown) {
  if (!value) return 'No data yet.'
  return `\n\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``
}

export function renderClientSnapshotMarkdown(snapshot: ClientSnapshot) {
  const client = snapshot.client
  const lines: string[] = [
    `# ${client.businessName}`,
    '',
    `Generated at: ${snapshot.generatedAt}`,
    '',
    '## Profile',
    bullet('Business', client.businessName),
    bullet('Owner', client.ownerName),
    bullet('Email', client.email),
    bullet('Phone', client.phone),
    bullet('Industry', client.industry),
    bullet('Market', [client.city, client.state].filter(Boolean).join(', ')),
    bullet('Website', client.website),
    bullet('Google Business Profile', client.gbpUrl),
    '',
    '## Engagement',
    bullet('Status', client.status),
    bullet('Tier', client.tier),
    bullet('Monthly MRR', client.monthlyMRR ? `$${client.monthlyMRR}` : null),
    bullet('Onboarded at', iso(client.onboardedAt)),
    bullet('Churned at', iso(client.churnedAt)),
    '',
    '## Strategy',
    client.strategyBrief || 'No strategy brief yet. Keep positioning partner-not-vendor: month-to-month, transparent work, client owns assets.',
    '',
    '## Recent Work Orders',
    ...(snapshot.workOrders.length
      ? snapshot.workOrders.flatMap((order) => [
        `### ${order.title}`,
        bullet('Type', order.type),
        bullet('Status', order.status),
        bullet('Created', order.createdAt),
        order.outputMarkdown || 'No output captured yet.',
        '',
      ])
      : ['No work orders in the last 90 days.', '']),
    '## Recent Notes',
    ...(snapshot.notes.length
      ? snapshot.notes.flatMap((note) => [
        `- ${note.createdAt} — ${note.author?.name ?? note.author?.email ?? 'Team'}${note.pinned ? ' (pinned)' : ''}`,
        `  ${String(note.body).replace(/\n/g, '\n  ')}`,
      ])
      : ['No notes in the last 90 days.']),
    '',
    '## Recent Conversations',
    ...(snapshot.conversations.length
      ? snapshot.conversations.flatMap((thread) => [
        `### ${thread.title ?? thread.persona}`,
        ...thread.turns.map((turn: any) => `- ${turn.createdAt} ${turn.role}: ${turn.content}`),
        '',
      ])
      : ['No agent conversations in the last 30 days.', '']),
    '## Intelligence Brief',
    snapshot.intelligenceBrief ? [
      bullet('Fetched at', snapshot.intelligenceBrief.fetchedAt),
      '### GBP Snapshot',
      jsonBlock(snapshot.intelligenceBrief.gbpSnapshotJson),
      '### GSC Summary',
      jsonBlock(snapshot.intelligenceBrief.gscSummaryJson),
    ].join('\n') : 'No intelligence brief persisted yet.',
  ]
  return `${lines.join('\n')}\n`
}

export function renderClientSnapshotJson(snapshot: ClientSnapshot) {
  return `${JSON.stringify(snapshot, null, 2)}\n`
}

export function normalizeExportForDiff(content: string) {
  return content
    .replace(/"generatedAt": "[^"]+"/g, '"generatedAt": "<generated-at>"')
    .replace(/Generated at: .*\n/g, 'Generated at: <generated-at>\n')
}

function escapePdfText(value: string) {
  return value.replace(/[\\()]/g, (char) => `\\${char}`).replace(/[\r\n\t]/g, ' ')
}

function pdfTextLines(markdown: string) {
  return markdown
    .split('\n')
    .map((line) => line.replace(/^#{1,3}\s*/, '').replace(/^[-*]\s*/, '• '))
    .filter((line) => line.trim().length > 0)
    .slice(0, 44)
}

function buildSimplePdf(lines: string[]) {
  const content = [
    'BT',
    '/F1 18 Tf',
    '72 760 Td',
    `(${escapePdfText(lines[0] ?? 'Client Snapshot')}) Tj`,
    '/F1 10 Tf',
    '0 -24 Td',
    ...lines.slice(1).map((line) => `(${escapePdfText(line.slice(0, 110))}) Tj\n0 -14 Td`),
    'ET',
  ].join('\n')

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}\nendstream`,
  ]

  let body = '%PDF-1.4\n'
  const offsets = [0]
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(body, 'utf8'))
    body += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`
  }
  const xrefOffset = Buffer.byteLength(body, 'utf8')
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (let i = 1; i < offsets.length; i++) body += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  return Buffer.from(body, 'utf8')
}

export async function renderClientSnapshotPdf(snapshot: ClientSnapshot) {
  const markdown = renderClientSnapshotMarkdown(snapshot)
  const body = buildSimplePdf(pdfTextLines(markdown))
  return {
    contentType: 'application/pdf' as const,
    filename: `${snapshot.client.businessName.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()}-snapshot.pdf`,
    body,
  }
}
