export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireInternalUser } from '@/lib/authz'
import {
  getClientSnapshot,
  renderClientSnapshotJson,
  renderClientSnapshotMarkdown,
  renderClientSnapshotPdf,
  type ClientSnapshotFormat,
} from '@/lib/exports/client-snapshot'

const VALID_FORMATS = new Set<ClientSnapshotFormat>(['md', 'json', 'pdf'])

function downloadName(clientName: string, extension: string) {
  const slug = clientName.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'client'
  return `${slug}-snapshot.${extension}`
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireInternalUser()
  if ('response' in auth) return auth.response
  const userId = auth.userId

  const format = (new URL(req.url).searchParams.get('format') ?? 'md').toLowerCase() as ClientSnapshotFormat
  if (!VALID_FORMATS.has(format)) return NextResponse.json({ error: 'INVALID_EXPORT_FORMAT', allowed: ['md', 'json', 'pdf'] }, { status: 400 })

  try {
    const snapshot = await getClientSnapshot({ clientId: params.id, exportedById: userId })

    if (format === 'json') {
      return new NextResponse(renderClientSnapshotJson(snapshot), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${downloadName(snapshot.client.businessName, 'json')}"`,
        },
      })
    }

    if (format === 'pdf') {
      const pdf = await renderClientSnapshotPdf(snapshot)
      return new NextResponse(pdf.body, {
        headers: {
          'Content-Type': pdf.contentType,
          'Content-Disposition': `attachment; filename="${pdf.filename}"`,
        },
      })
    }

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
    console.error('client export failed', error)
    return NextResponse.json({ error: 'EXPORT_FAILED' }, { status: 500 })
  }
}
