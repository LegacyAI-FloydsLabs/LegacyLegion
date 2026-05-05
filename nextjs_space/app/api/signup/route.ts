export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const email = String(body?.email ?? '').toLowerCase().trim()
    const password = String(body?.password ?? '')
    const name = String(body?.name ?? '').trim()

    if (!email || !password || password.length < 6) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 })
    }

    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { email, name, password: hashed, role: 'team' },
    })

    return NextResponse.json({ ok: true, id: user.id })
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }
}
