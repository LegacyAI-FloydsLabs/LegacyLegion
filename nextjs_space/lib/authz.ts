import { getServerSession } from 'next-auth'
import type { Session } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'

export const SUPERADMIN_ROLE = 'superadmin'
export const ADMIN_ROLE = 'admin'
export const TEAM_ROLE = 'team'
export const PARTNER_ROLE = 'partner'

const INTERNAL_ROLES = new Set([SUPERADMIN_ROLE, ADMIN_ROLE, TEAM_ROLE])

export type AuthorizedSession = {
  session: Session
  userId: string
  role: string
}

export type AuthorizationResult = AuthorizedSession | { response: NextResponse }

export function isInternalRole(role: string | null | undefined): boolean {
  return typeof role === 'string' && INTERNAL_ROLES.has(role)
}

export function isAdminRole(role: string | null | undefined): boolean {
  return role === SUPERADMIN_ROLE || role === ADMIN_ROLE
}

export function isSuperAdminRole(role: string | null | undefined): boolean {
  return role === SUPERADMIN_ROLE
}

export function isPartnerRole(role: string | null | undefined): boolean {
  return role === PARTNER_ROLE
}

export function isInternalSession(session: Session | null): session is Session & { user: Session['user'] & { id: string; role: string } } {
  return Boolean(session?.user?.id && isInternalRole(session.user.role))
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

async function requireRole(allowed: (role: string | null | undefined) => boolean): Promise<AuthorizationResult> {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) return { response: unauthorized() }

  const role = session.user.role
  if (!allowed(role)) return { response: forbidden() }

  return { session, userId, role }
}

export async function requireInternalUser(): Promise<AuthorizationResult> {
  return requireRole(isInternalRole)
}

export async function requireAdminUser(): Promise<AuthorizationResult> {
  return requireRole(isAdminRole)
}


export async function requireSuperAdminUser(): Promise<AuthorizationResult> {
  return requireRole(isSuperAdminRole)
}
export async function requirePartnerUser(): Promise<AuthorizationResult> {
  return requireRole(isPartnerRole)
}
