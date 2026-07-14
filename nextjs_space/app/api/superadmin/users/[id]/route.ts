export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { requireSuperAdminUser } from '@/lib/authz'
import { prisma } from '@/lib/db'
import { logServerEvent } from '@/lib/diagnostics'
import { disableRole, isAccountRole, isDisabledRole, restoreRole, SUPERADMIN_ROLE } from '@/lib/roles'

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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSuperAdminUser()
  if ('response' in auth) return auth.response

  const existing = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, role: true },
  })
  if (!existing) return NextResponse.json({ error: 'Account not found.' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const action = clean(body?.action)
  const data: Prisma.UserUpdateInput = {}
  let nextRole: string | null = null

  if ('name' in body) data.name = clean(body.name) || null

  if ('role' in body) {
    const requestedRole = clean(body.role)
    if (!isAccountRole(requestedRole)) {
      return NextResponse.json({ error: 'Select a valid account role.' }, { status: 400 })
    }
    nextRole = requestedRole
  } else if (action === 'disable') {
    nextRole = disableRole(existing.role)
  } else if (action === 'restore') {
    nextRole = restoreRole(existing.role)
  }

  if (nextRole && nextRole !== existing.role) {
    if (existing.id === auth.userId) {
      return NextResponse.json({ error: 'You cannot change or disable your own role.' }, { status: 400 })
    }
    if (existing.role === SUPERADMIN_ROLE && nextRole !== SUPERADMIN_ROLE) {
      const activeSuperadmins = await prisma.user.count({ where: { role: SUPERADMIN_ROLE } })
      if (activeSuperadmins <= 1) {
        return NextResponse.json({ error: 'The last active superadmin cannot be demoted or disabled.' }, { status: 409 })
      }
    }
    data.role = nextRole
  }

  const password = String(body?.password ?? '')
  if ('password' in body) {
    if (password.length < 12) {
      return NextResponse.json({ error: 'Temporary password must be at least 12 characters.' }, { status: 400 })
    }
    data.password = await bcrypt.hash(password, 12)
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No account changes were supplied.' }, { status: 400 })
  }

  const user = await prisma.user.update({ where: { id: existing.id }, data, select: USER_SELECT })
  logServerEvent('superadmin.user.updated', {
    actorId: auth.userId,
    targetUserId: user.id,
    action: action || 'update',
    roleChanged: Boolean(nextRole && nextRole !== existing.role),
    passwordChanged: 'password' in body,
    disabled: isDisabledRole(user.role),
  })
  return NextResponse.json({ user })
}
