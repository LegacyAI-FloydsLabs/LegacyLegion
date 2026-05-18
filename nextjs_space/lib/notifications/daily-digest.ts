import { prisma } from '@/lib/db'

export const DAILY_DIGEST_SECTION_TITLES = [
  'Yesterday',
  'New Prospects',
  'GBP Changes',
  'Top 3 Suggested Actions',
  'Open Work Orders By Status',
] as const

export const dailyDigestCronSchedule = '0 11,12 * * *'

export const DAILY_DIGEST_NOTIFICATION_TYPE = {
  name: 'Daily Agency Digest',
  recipient: 'USER',
  critical: false,
} as const

export type DailyDigestNotificationCheck =
  | { ok: true; notificationId: string; notificationType: typeof DAILY_DIGEST_NOTIFICATION_TYPE }
  | { ok: false; code: 'NOTIF_ID_DAILY_DIGEST_MISSING'; message: string; notificationType: typeof DAILY_DIGEST_NOTIFICATION_TYPE }

export interface DigestUser {
  id: string
  email: string
  name: string | null
}

export interface DailyDigestData {
  generatedForLocalDate: string
  users: DigestUser[]
  yesterdayWorkOrders: Array<{ clientName: string; title: string; status: string }>
  newProspects: Array<{ clientName: string; label: string; source: string }>
  gbpChanges: Array<{ clientName: string; summary: string }>
  suggestedActions: Array<{ clientName: string; actions: string[] }>
  openWorkOrdersByStatus: Record<string, number>
}

export interface SendDailyDigestResult {
  ok: boolean
  notificationId?: string
  subject?: string
  body?: string
  sent?: Array<{ userId: string; email: string; status: number }>
  skipped?: true
  code?: string
  message?: string
}

export function ensureDailyDigestNotificationTypeConfigured(): DailyDigestNotificationCheck {
  const notificationId = process.env.NOTIF_ID_DAILY_DIGEST?.trim()
  if (!notificationId) {
    return {
      ok: false,
      code: 'NOTIF_ID_DAILY_DIGEST_MISSING',
      message: 'NOTIF_ID_DAILY_DIGEST must be set to the platform notification type id for Daily Agency Digest.',
      notificationType: DAILY_DIGEST_NOTIFICATION_TYPE,
    }
  }
  return { ok: true, notificationId, notificationType: DAILY_DIGEST_NOTIFICATION_TYPE }
}

export function isIndianapolisDigestRunWindow(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Indiana/Indianapolis',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now)
  const hour = parts.find((part) => part.type === 'hour')?.value
  const minute = parts.find((part) => part.type === 'minute')?.value
  return hour === '07' && minute === '00'
}

export function indianapolisLocalDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Indiana/Indianapolis',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}`
}

function relativeWindow(now = new Date()) {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  return { yesterday, today }
}

function summarizeGbpSnapshot(snapshot: any) {
  if (!snapshot || typeof snapshot !== 'object') return 'No GBP snapshot available.'
  const reviewCount = snapshot.reviewCount ?? 'unknown review count'
  const rating = snapshot.rating ? `${snapshot.rating} rating` : 'rating not published'
  const category = snapshot.primaryCategory ?? 'category not published'
  return `GBP snapshot: ${reviewCount} reviews, ${rating}, ${category}.`
}

function actionListForClient(client: any) {
  const actions: string[] = []
  const reviewOrder = client.workOrders?.find((order: any) => order.status === 'REVIEW')
  if (reviewOrder) actions.push(`Review and approve "${reviewOrder.title}".`)
  const prospect = client.prospects?.[0]
  if (prospect) actions.push(`Follow up with ${[prospect.personFirstName, prospect.personLastName].filter(Boolean).join(' ') || prospect.companyName || 'the newest prospect'}.`)
  if (client.gbpUrl && !client.intelligence?.gbpSnapshotJson) actions.push('Refresh the Google Business Profile snapshot before the next client update.')
  if (client.strategyBrief) actions.push('Turn the current strategy brief into this week’s client-facing update.')
  actions.push('Confirm the next visible asset the client will own outright.')
  return actions.slice(0, 3)
}

export async function collectDailyDigestData(now = new Date()): Promise<DailyDigestData> {
  const { yesterday, today } = relativeWindow(now)
  const [users, workOrders, prospects, clients, openWorkOrders] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ['admin', 'team'] } },
      select: { id: true, email: true, name: true },
      orderBy: { email: 'asc' },
    }),
    prisma.clientWorkOrder.findMany({
      where: { createdAt: { gte: yesterday, lt: today } },
      select: { title: true, status: true, client: { select: { businessName: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.prospect.findMany({
      where: { createdAt: { gte: yesterday, lt: today } },
      select: { source: true, companyName: true, personFirstName: true, personLastName: true, client: { select: { businessName: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.client.findMany({
      where: { status: { in: ['ACTIVE', 'ONBOARDING'] } },
      include: {
        intelligence: true,
        workOrders: { where: { status: { in: ['DRAFT', 'IN_PROGRESS', 'REVIEW'] } }, orderBy: { createdAt: 'desc' }, take: 3 },
        prospects: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { businessName: 'asc' },
    }),
    prisma.clientWorkOrder.groupBy({
      by: ['status'],
      where: { status: { in: ['DRAFT', 'IN_PROGRESS', 'REVIEW', 'DELIVERED', 'ARCHIVED'] } },
      _count: { _all: true },
    }),
  ])

  return {
    generatedForLocalDate: indianapolisLocalDate(now),
    users,
    yesterdayWorkOrders: workOrders.map((order) => ({
      clientName: order.client.businessName,
      title: order.title,
      status: order.status,
    })),
    newProspects: prospects.map((prospect) => ({
      clientName: prospect.client?.businessName ?? 'LegacyAI',
      label: [prospect.personFirstName, prospect.personLastName].filter(Boolean).join(' ') || prospect.companyName || 'Unnamed prospect',
      source: prospect.source,
    })),
    gbpChanges: clients
      .filter((client) => client.intelligence?.gbpSnapshotJson)
      .map((client) => ({ clientName: client.businessName, summary: summarizeGbpSnapshot(client.intelligence?.gbpSnapshotJson) })),
    suggestedActions: clients.map((client) => ({ clientName: client.businessName, actions: actionListForClient(client) })),
    openWorkOrdersByStatus: openWorkOrders.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = row._count._all
      return acc
    }, { DRAFT: 0, IN_PROGRESS: 0, REVIEW: 0, DELIVERED: 0, ARCHIVED: 0 }),
  }
}

export function buildDailyDigestTemplate(data: DailyDigestData) {
  const yesterdayCount = data.yesterdayWorkOrders.length
  const prospectsCount = data.newProspects.length
  const lines: string[] = [
    `# Daily Agency Digest — ${data.generatedForLocalDate}`,
    '',
    'Partner, not vendor. Keep the work visible, month-to-month, and owned by the client.',
    '',
    '## Yesterday',
    `${yesterdayCount} work order${yesterdayCount === 1 ? '' : 's'} created or updated yesterday.`,
    ...data.yesterdayWorkOrders.map((order) => `- ${order.clientName}: ${order.title} (${order.status})`),
    ...(yesterdayCount === 0 ? ['- No work orders changed yesterday.'] : []),
    '',
    '## New Prospects',
    `${prospectsCount} new prospect${prospectsCount === 1 ? '' : 's'} captured.`,
    ...data.newProspects.map((prospect) => `- ${prospect.clientName}: ${prospect.label} via ${prospect.source}`),
    ...(prospectsCount === 0 ? ['- No new prospects captured yesterday.'] : []),
    '',
    '## GBP Changes',
    ...data.gbpChanges.map((change) => `- ${change.clientName}: ${change.summary}`),
    ...(data.gbpChanges.length === 0 ? ['- No GBP changes detected.'] : []),
    '',
    '## Top 3 Suggested Actions',
    ...data.suggestedActions.flatMap((client) => [
      `- ${client.clientName}`,
      ...client.actions.slice(0, 3).map((action) => `  - ${action}`),
    ]),
    ...(data.suggestedActions.length === 0 ? ['- No active clients need action.'] : []),
    '',
    '## Open Work Orders By Status',
    ...Object.entries(data.openWorkOrdersByStatus).map(([status, count]) => `- ${status}: ${count}`),
  ]
  return `${lines.join('\n')}\n`
}

async function composeDigestWithRouteLLM(template: string): Promise<{ ok: true; body: string } | { ok: false; code: string; message: string }> {
  const apiKey = process.env.ABACUSAI_API_KEY?.trim()
  if (!apiKey) return { ok: false, code: 'ROUTELLM_NOT_CONFIGURED', message: 'ABACUSAI_API_KEY is required to compose the daily digest.' }
  const response = await fetch('https://routellm.abacus.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'route-llm',
      messages: [
        { role: 'system', content: 'Write a concise internal daily agency digest. Preserve the provided section headings exactly. Do not invent facts.' },
        { role: 'user', content: template },
      ],
      max_tokens: 1200,
      temperature: 0,
    }),
  })
  if (!response.ok) return { ok: false, code: 'ROUTELLM_REQUEST_FAILED', message: `RouteLLM returned HTTP ${response.status}` }
  const json = await response.json().catch(() => null)
  const body = json?.choices?.[0]?.message?.content
  if (!body) return { ok: false, code: 'ROUTELLM_EMPTY_DIGEST', message: 'RouteLLM returned an empty digest body.' }
  return { ok: true, body }
}

type PlatformNotificationResult =
  | { ok: true; status: number }
  | { ok: false; code: string; message: string }

async function sendPlatformNotification(input: { user: DigestUser; subject: string; body: string; notificationId: string }): Promise<PlatformNotificationResult> {
  const url = process.env.NOTIFICATION_API_URL?.trim()
  const apiKey = process.env.NOTIFICATION_API_KEY?.trim()
  if (!url || !apiKey) return { ok: false, code: 'NOTIFICATION_API_NOT_CONFIGURED', message: 'NOTIFICATION_API_URL and NOTIFICATION_API_KEY are required to send daily digest email.' }
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      notificationId: input.notificationId,
      type: DAILY_DIGEST_NOTIFICATION_TYPE.name,
      recipient: { userId: input.user.id, email: input.user.email },
      subject: input.subject,
      body: input.body,
    }),
  })
  if (!response.ok) return { ok: false, code: 'NOTIFICATION_API_SEND_FAILED', message: `Notification API returned HTTP ${response.status}` }
  return { ok: true, status: response.status }
}

export async function sendDailyAgencyDigest(now = new Date()): Promise<SendDailyDigestResult> {
  const notification = ensureDailyDigestNotificationTypeConfigured()
  if (!notification.ok) return { ok: false, code: notification.code, message: notification.message }

  const data = await collectDailyDigestData(now)
  if (data.users.length === 0) return { ok: true, skipped: true, notificationId: notification.notificationId, message: 'No admin/team users receive daily digests.' }

  const template = buildDailyDigestTemplate(data)
  const composed = await composeDigestWithRouteLLM(template)
  if (!composed.ok) return { ok: false, code: composed.code, message: composed.message, body: template, notificationId: notification.notificationId }

  const subject = `Daily Agency Digest — ${data.generatedForLocalDate}`
  const sent: Array<{ userId: string; email: string; status: number }> = []
  for (const user of data.users) {
    const result = await sendPlatformNotification({ user, subject, body: composed.body, notificationId: notification.notificationId })
    if (!result.ok) return { ok: false, code: result.code, message: result.message, subject, body: composed.body, notificationId: notification.notificationId, sent }
    sent.push({ userId: user.id, email: user.email, status: result.status })
  }
  return { ok: true, notificationId: notification.notificationId, subject, body: composed.body, sent }
}
