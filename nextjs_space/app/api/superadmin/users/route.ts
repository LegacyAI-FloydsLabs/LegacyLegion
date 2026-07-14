export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { requireSuperAdminUser } from '@/lib/authz'
import { prisma } from '@/lib/db'
import { logServerEvent } from '@/lib/diagnostics'
import { isAccountRole } from '@/lib/roles'

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const

function clean(value: unknown): string {
  return String(value ?? '').trim()
}

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdminUser()
  if ('response' in auth) return auth.response

  const body = await req.json().catch(() => ({}))
  const email = clean(body?.email).toLowerCase()
  const name = clean(body?.name) || null
  const password = String(body?.password ?? '')
  const role = clean(body?.role)

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }
  if (password.length < 12) {
    return NextResponse.json({ error: 'Temporary password must be at least 12 characters.' }, { status: 400 })
  }
  if (!isAccountRole(role)) {
    return NextResponse.json({ error: 'Select a valid account role.' }, { status: 400 })
  }

  try {
    const user = await prisma.user.create({
      data: { email, name, password: await bcrypt.hash(password, 12), role },
      select: USER_SELECT,
    })
    logServerEvent('superadmin.user.created', { actorId: auth.userId, targetUserId: user.id, role: user.role })
    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'An account with that email already exists.' }, { status: 409 })
    }
    throw error
  }
}
