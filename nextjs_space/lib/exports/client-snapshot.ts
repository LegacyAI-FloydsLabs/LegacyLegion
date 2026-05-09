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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function markdownToEnterpriseHtml(markdown: string) {
  const html: string[] = []
  let inList = false
  let inCode = false
  let inSection = false
  const closeList = () => {
    if (inList) {
      html.push('</ul>')
      inList = false
    }
  }
  const closeSection = () => {
    if (inSection) {
      html.push('</section>')
      inSection = false
    }
  }

  for (const rawLine of markdown.split('\n')) {
    const line = rawLine.trimEnd()
    if (line.startsWith('```')) {
      closeList()
      html.push(inCode ? '</pre>' : '<pre class="json-block">')
      inCode = !inCode
      continue
    }
    if (inCode) {
      html.push(escapeHtml(rawLine))
      continue
    }
    if (!line.trim()) {
      closeList()
      continue
    }
    if (line.startsWith('# ')) {
      closeList()
      closeSection()
      html.push(`<h1>${escapeHtml(line.slice(2))}</h1>`)
      continue
    }
    if (line.startsWith('## ')) {
      closeList()
      closeSection()
      html.push(`<section class="snapshot-section"><h2>${escapeHtml(line.slice(3))}</h2>`)
      inSection = true
      continue
    }
    if (line.startsWith('### ')) {
      closeList()
      html.push(`<h3>${escapeHtml(line.slice(4))}</h3>`)
      continue
    }
    if (line.startsWith('- ')) {
      if (!inList) {
        html.push('<ul>')
        inList = true
      }
      html.push(`<li>${escapeHtml(line.slice(2))}</li>`)
      continue
    }
    closeList()
    html.push(`<p>${escapeHtml(line)}</p>`)
  }
  closeList()
  if (inCode) html.push('</pre>')
  closeSection()
  return html.join('\n')
}

export function buildClientSnapshotHtml(snapshot: ClientSnapshot) {
  const markdown = renderClientSnapshotMarkdown(snapshot)
  const title = escapeHtml(snapshot.client.businessName)
  return `<!doctype html>
<html lang="en" data-design-system="legacy-legion-enterprise">
<head>
  <meta charset="utf-8" />
  <title>LegacyLegion Client Snapshot — ${title}</title>
  <style>
    :root {
      --ink: #111827;
      --muted: #4b5563;
      --surface: #f8fafc;
      --panel: #ffffff;
      --brand: #4f46e5;
      --accent: #0891b2;
      --rule: #dbeafe;
    }
    body { margin: 0; background: var(--surface); color: var(--ink); font: 14px/1.55 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .document { max-width: 920px; margin: 0 auto; padding: 40px; }
    .hero { border-radius: 28px; padding: 34px; color: white; background: linear-gradient(135deg, #111827, #312e81 58%, #155e75); }
    .eyebrow { letter-spacing: .16em; text-transform: uppercase; font-size: 11px; opacity: .78; }
    h1 { margin: 10px 0 12px; font-size: 34px; line-height: 1.05; }
    .promise { margin: 0; max-width: 680px; color: #dbeafe; }
    .snapshot-section { margin-top: 22px; border: 1px solid var(--rule); border-radius: 20px; background: var(--panel); padding: 22px 24px; box-shadow: 0 16px 40px rgba(15, 23, 42, .06); }
    h2 { margin: 0 0 14px; color: var(--brand); font-size: 18px; }
    h3 { margin: 18px 0 8px; color: #1f2937; font-size: 15px; }
    p, li { color: var(--muted); }
    ul { margin: 0; padding-left: 18px; }
    pre { white-space: pre-wrap; border-radius: 14px; padding: 14px; background: #0f172a; color: #e0f2fe; }
  </style>
</head>
<body>
  <main class="document">
    <header class="hero">
      <div class="eyebrow">LegacyLegion Enterprise Export</div>
      <h1>LegacyLegion Client Snapshot</h1>
      <p class="promise">Partner, not vendor. Month-to-month execution. Client owns assets. AI-first Indianapolis local operating system.</p>
    </header>
    ${markdownToEnterpriseHtml(markdown)}
  </main>
</body>
</html>`
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

function extractPdfLinesFromHtml(html: string) {
  return decodeHtmlEntities(html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<h1[^>]*>/gi, '\n# ')
    .replace(/<h2[^>]*>/gi, '\n## ')
    .replace(/<h3[^>]*>/gi, '\n### ')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(h1|h2|h3|li|p|pre)>/gi, '\n')
    .replace(/<\/(section|header|main|div)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
  )
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function escapePdfText(value: string) {
  return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ').replace(/[\\()]/g, (char) => `\\${char}`)
}

function wrapPdfText(text: string, fontSize: number, maxWidth: number) {
  const maxChars = Math.max(18, Math.floor(maxWidth / (fontSize * 0.48)))
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length > maxChars && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }
  if (current) lines.push(current)
  return lines.length ? lines : ['']
}

type PdfStyle = { font: 'F1' | 'F2'; size: number; rgb: [number, number, number]; leading: number; before: number; after: number }

const PDF_STYLES = {
  title: { font: 'F2', size: 22, rgb: [0.07, 0.09, 0.16], leading: 26, before: 8, after: 14 },
  h1: { font: 'F2', size: 18, rgb: [0.31, 0.27, 0.9], leading: 22, before: 8, after: 10 },
  h2: { font: 'F2', size: 14, rgb: [0.03, 0.41, 0.51], leading: 18, before: 12, after: 8 },
  h3: { font: 'F2', size: 11, rgb: [0.12, 0.16, 0.22], leading: 15, before: 8, after: 5 },
  body: { font: 'F1', size: 9.5, rgb: [0.29, 0.33, 0.39], leading: 13, before: 2, after: 3 },
} satisfies Record<string, PdfStyle>

function pdfTextCommand(text: string, x: number, y: number, style: PdfStyle) {
  const [r, g, b] = style.rgb
  return `BT /${style.font} ${style.size} Tf ${r} ${g} ${b} rg 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${escapePdfText(text)}) Tj ET`
}

function convertSnapshotHtmlToPdf(html: string, title: string) {
  const width = 612
  const height = 792
  const marginX = 54
  const contentWidth = width - marginX * 2
  const pages: string[] = []
  let stream: string[] = []
  let y = 700

  const beginPage = () => {
    stream = [
      'q 0.07 0.09 0.16 rg 0 742 612 50 re f Q',
      pdfTextCommand('LegacyLegion Enterprise Export', 54, 762, { ...PDF_STYLES.h3, rgb: [1, 1, 1] }),
      pdfTextCommand('Partner, not vendor · Month-to-month · Client owns assets · AI-first Indianapolis local', 54, 746, { ...PDF_STYLES.body, rgb: [0.86, 0.91, 1] }),
    ]
    y = 710
  }

  const finishPage = () => {
    const pageNumber = pages.length + 1
    stream.push('q 0.86 0.91 1 RG 54 54 504 0.5 re S Q')
    stream.push(pdfTextCommand(`LegacyLegion Client Snapshot · Page ${pageNumber}`, 54, 34, { ...PDF_STYLES.body, rgb: [0.45, 0.49, 0.56] }))
    pages.push(stream.join('\n'))
  }

  const ensureSpace = (needed: number) => {
    if (y - needed >= 82) return
    finishPage()
    beginPage()
  }

  beginPage()
  for (const line of extractPdfLinesFromHtml(html)) {
    const kind = line.startsWith('## ') ? 'h2' : line.startsWith('### ') ? 'h3' : line.startsWith('# ') ? 'h1' : 'body'
    const style = PDF_STYLES[kind]
    const text = line.replace(/^#{1,3}\s*/, '')
    const wrapped = wrapPdfText(text, style.size, contentWidth - (text.startsWith('• ') ? 12 : 0))
    ensureSpace(style.before + wrapped.length * style.leading + style.after)
    y -= style.before
    if (kind === 'h2') {
      stream.push('q 0.94 0.97 1 rg 48 ' + (y - 5).toFixed(2) + ' 516 24 re f Q')
    }
    for (const segment of wrapped) {
      stream.push(pdfTextCommand(segment, text.startsWith('• ') ? marginX + 10 : marginX, y, style))
      y -= style.leading
    }
    y -= style.after
  }
  finishPage()

  const objects: string[] = []
  const pageCount = pages.length
  const pageObjectIds = pages.map((_, index) => 6 + index * 2)
  objects[0] = '<< /Type /Catalog /Pages 2 0 R >>'
  objects[1] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageCount} >>`
  objects[2] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'
  objects[4] = `<< /Title (${escapePdfText(title)}) /Creator (LegacyLegion local HTML-to-PDF renderer) >>`
  pages.forEach((content, index) => {
    const pageId = pageObjectIds[index]
    const contentId = pageId + 1
    objects[pageId - 1] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`
    objects[contentId - 1] = `<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}\nendstream`
  })

  let body = '%PDF-1.4\n'
  const offsets = [0]
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(body, 'utf8'))
    body += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`
  }
  const xrefOffset = Buffer.byteLength(body, 'utf8')
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (let i = 1; i < offsets.length; i++) body += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  return Buffer.from(body, 'utf8')
}

export async function renderClientSnapshotPdf(snapshot: ClientSnapshot) {
  const html = buildClientSnapshotHtml(snapshot)
  const body = convertSnapshotHtmlToPdf(html, `LegacyLegion Client Snapshot — ${snapshot.client.businessName}`)
  return {
    contentType: 'application/pdf' as const,
    filename: `${snapshot.client.businessName.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()}-snapshot.pdf`,
    source: 'local-html-to-pdf' as const,
    body,
  }
}
