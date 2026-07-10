export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireInternalUser } from '@/lib/authz'
import {
  getClientSnapshot,
  renderClientSnapshotJson,
  renderClientSnapshotMarkdown,
  renderClientSnapshotPdf,
  renderWeeklyReportMarkdown,
  type ClientSnapshotFormat,
  type WeeklyReportAudience,
} from '@/lib/exports/client-snapshot'
import { diagnosticId, logServerError, logServerEvent } from '@/lib/diagnostics'

const VALID_FORMATS = new Set<ClientSnapshotFormat>(['md', 'json', 'pdf'])
const VALID_REPORTS = new Set(['weekly-internal', 'weekly-client'])


function downloadName(clientName: string, extension: string) {
  const slug = clientName.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'client'
  return `${slug}-snapshot.${extension}`
}

function reportDownloadName(clientName: string, audience: WeeklyReportAudience) {
  const slug = clientName.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'client'
  return `${slug}-weekly-${audience === 'internal' ? 'internal' : 'client'}-report.md`
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireInternalUser()
  if ('response' in auth) return auth.response
  const userId = auth.userId

  const searchParams = new URL(req.url).searchParams
  const format = (searchParams.get('format') ?? 'md').toLowerCase() as ClientSnapshotFormat
  const report = (searchParams.get('report') ?? '').toLowerCase()
  if (!VALID_FORMATS.has(format)) return NextResponse.json({ error: 'INVALID_EXPORT_FORMAT', allowed: ['md', 'json', 'pdf'] }, { status: 400 })
  if (report && !VALID_REPORTS.has(report)) return NextResponse.json({ error: 'INVALID_REPORT_TYPE', allowed: [...VALID_REPORTS] }, { status: 400 })

  try {
    const snapshot = await getClientSnapshot({ clientId: params.id, exportedById: userId })


    if (report) {
      const audience: WeeklyReportAudience = report === 'weekly-internal' ? 'internal' : 'client'
      const body = renderWeeklyReportMarkdown(snapshot, audience)
      logServerEvent('report.generate.succeeded', { userId, clientId: params.id, audience })
      return new NextResponse(body, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="${reportDownloadName(snapshot.client.businessName, audience)}"`,
        },
      })
    }

    if (format === 'json') {
      logServerEvent('client.export.succeeded', { userId, clientId: params.id, format: 'json' })
      return new NextResponse(renderClientSnapshotJson(snapshot), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${downloadName(snapshot.client.businessName, 'json')}"`,
        },
      })
    }

    if (format === 'pdf') {
      const pdf = await renderClientSnapshotPdf(snapshot)
      logServerEvent('client.export.succeeded', { userId, clientId: params.id, format: 'pdf' })
      return new NextResponse(pdf.body, {
        headers: {
          'Content-Type': pdf.contentType,
          'Content-Disposition': `attachment; filename="${pdf.filename}"`,
        },
      })
    }

    logServerEvent('client.export.succeeded', { userId, clientId: params.id, format: 'md' })
    return new NextResponse(renderClientSnapshotMarkdown(snapshot), {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${downloadName(snapshot.client.businessName, 'md')}"`,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'CLIENT_NOT_FOUND') {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }
    const id = diagnosticId(report ? 'report_generate' : 'client_export')
    logServerError(report ? 'report.generate.failed' : 'client.export.failed', error, { diagnosticId: id, userId, clientId: params.id, format, report })
    return NextResponse.json({ error: report ? 'REPORT_FAILED' : 'EXPORT_FAILED', diagnosticId: id }, { status: 500 })
  }
}
