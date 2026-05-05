export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

function generatePartnerCode(): string {
  const ts = Date.now().toString(36).toUpperCase().slice(-4)
  const rnd = Math.random().toString(36).toUpperCase().slice(2, 6)
  return `LEGION-${ts}${rnd}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const email = String(body?.email ?? '').toLowerCase().trim()
    const password = String(body?.password ?? '')
    const name = String(body?.name ?? '').trim()
    const phone = String(body?.phone ?? '').trim() || null
    const company = String(body?.company ?? '').trim() || null
    const category = String(body?.category ?? 'OTHER').trim() || 'OTHER'

    if (!email || !password || password.length < 6 || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return NextResponse.json({ error: 'Email already registered' }, { status: 400 })

    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { email, name, password: hashed, role: 'partner' },
    })

    const partnerCode = generatePartnerCode()
    const partner = await prisma.referralPartner.create({
      data: {
        userId: user.id, name, email, phone, company, category,
        tier: 'BRONZE', partnerCode,
      },
    })

    return NextResponse.json({ ok: true, partnerCode: partner.partnerCode })
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to create partner' }, { status: 500 })
  }
}
