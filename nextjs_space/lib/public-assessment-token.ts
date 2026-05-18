import { createHmac, timingSafeEqual } from 'crypto'

const TOKEN_TTL_MS = 15 * 60 * 1000
const VERSION = 'v1'

function tokenSecret(): string | null {
  const secret = process.env.LEAD_ASSESSMENT_TOKEN_SECRET || process.env.NEXTAUTH_SECRET
  return secret && secret.length >= 32 ? secret : null
}

function base64Url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url')
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

export function createLeadAssessmentToken(leadId: string, now = Date.now()): string | null {
  const secret = tokenSecret()
  if (!secret) return null

  const expiresAt = now + TOKEN_TTL_MS
  const payload = `${VERSION}.${leadId}.${expiresAt}`
  return `${base64Url(payload)}.${sign(payload, secret)}`
}

export function verifyLeadAssessmentToken(token: string, leadId: string, now = Date.now()): boolean {
  const secret = tokenSecret()
  if (!secret || !token || !leadId) return false

  const [encodedPayload, providedSignature] = token.split('.')
  if (!encodedPayload || !providedSignature) return false

  let payload: string
  try {
    payload = Buffer.from(encodedPayload, 'base64url').toString('utf8')
  } catch {
    return false
  }

  const [version, tokenLeadId, rawExpiresAt] = payload.split('.')
  if (version !== VERSION || tokenLeadId !== leadId) return false

  const expiresAt = Number(rawExpiresAt)
  if (!Number.isSafeInteger(expiresAt) || expiresAt < now) return false

  const expectedSignature = sign(payload, secret)
  const expected = Buffer.from(expectedSignature)
  const provided = Buffer.from(providedSignature)
  if (expected.length !== provided.length) return false

  return timingSafeEqual(expected, provided)
}
