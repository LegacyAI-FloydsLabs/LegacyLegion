export const SUPERADMIN_ROLE = 'superadmin'
export const ADMIN_ROLE = 'admin'
export const TEAM_ROLE = 'team'
export const PARTNER_ROLE = 'partner'
export const DISABLED_ROLE_PREFIX = 'disabled:'

export const ACTIVE_ACCOUNT_ROLES = [SUPERADMIN_ROLE, ADMIN_ROLE, TEAM_ROLE, PARTNER_ROLE] as const

export type AccountRole = (typeof ACTIVE_ACCOUNT_ROLES)[number]

export function isAccountRole(role: unknown): role is AccountRole {
  return typeof role === 'string' && ACTIVE_ACCOUNT_ROLES.some((candidate) => candidate === role)
}

export function isDisabledRole(role: string | null | undefined): boolean {
  return typeof role === 'string' && role.startsWith(DISABLED_ROLE_PREFIX)
}

export function restoreRole(role: string | null | undefined): AccountRole {
  const candidate = isDisabledRole(role) ? role!.slice(DISABLED_ROLE_PREFIX.length) : role
  return isAccountRole(candidate) ? candidate : TEAM_ROLE
}

export function disableRole(role: string | null | undefined): string {
  return `${DISABLED_ROLE_PREFIX}${restoreRole(role)}`
}
