export const ACCESS_PLATFORMS = [
  'WEBSITE_CMS',
  'GBP',
  'GSC',
  'GA4',
  'GOOGLE_ADS',
  'META',
  'EMAIL',
  'SOCIAL',
  'OTHER',
] as const

export const ACCESS_STATUSES = [
  'NEEDED',
  'REQUESTED',
  'INVITE_SENT',
  'ACCESS_RECEIVED',
  'VERIFIED',
  'BLOCKED',
  'REVOKED',
] as const

const STATUS_SET = new Set<string>(ACCESS_STATUSES)
const PLATFORM_SET = new Set<string>(ACCESS_PLATFORMS)
const SUPERADMIN_STATUS_SET = new Set<string>(['ACCESS_RECEIVED', 'VERIFIED', 'BLOCKED', 'REVOKED'])

const SECRET_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
  /\b(password|passcode|recovery\s*code|backup\s*code|otp|2fa\s*code|secret|api[_\s-]?key|private\s*key)\b\s*(?:[:=]|is\b)/i,
  /\b(bearer|basic)\s+[a-z0-9._~+/=-]{16,}/i,
]

export type AccessPlatform = (typeof ACCESS_PLATFORMS)[number]
export type AccessStatus = (typeof ACCESS_STATUSES)[number]

export function cleanOptionalString(value: unknown, maxLength = 500): string | null {
  if (value == null) return null
  const text = String(value).trim()
  if (!text) return null
  return text.length > maxLength ? text.slice(0, maxLength) : text
}

export function normalizeAccessPlatform(value: unknown): AccessPlatform | null {
  const platform = String(value ?? '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_')
  return PLATFORM_SET.has(platform) ? (platform as AccessPlatform) : null
}

export function normalizeAccessStatus(value: unknown): AccessStatus | null {
  const status = String(value ?? '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_')
  return STATUS_SET.has(status) ? (status as AccessStatus) : null
}

export function isSuperadminAccessStatus(status: string): boolean {
  return SUPERADMIN_STATUS_SET.has(status)
}

export function containsCredentialMaterial(value: unknown): boolean {
  const text = String(value ?? '')
  if (!text) return false
  return SECRET_PATTERNS.some((pattern) => pattern.test(text))
}

export function findCredentialMaterialField(fields: Record<string, unknown>): string | null {
  for (const [field, value] of Object.entries(fields)) {
    if (containsCredentialMaterial(value)) return field
  }
  return null
}

export function statusTimestampPatch(status: AccessStatus) {
  const now = new Date()
  if (status === 'ACCESS_RECEIVED') return { receivedAt: now }
  if (status === 'VERIFIED') return { approvedAt: now, revokedAt: null }
  if (status === 'REVOKED') return { revokedAt: now }
  if (status === 'BLOCKED') return { approvedAt: null, revokedAt: null }
  return {}
}

export function redactAccessRequestForRole<T extends { externalVaultRef: string | null; decisionNotes: string | null }>(
  request: T,
  isSuperAdmin: boolean,
): T {
  if (isSuperAdmin) return request
  return { ...request, externalVaultRef: null, decisionNotes: null }
}
