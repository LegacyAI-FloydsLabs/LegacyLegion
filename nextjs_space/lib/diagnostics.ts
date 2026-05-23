import { createHash, randomUUID } from 'node:crypto'

export type DiagnosticFields = Record<string, unknown>

function safeFields(fields: DiagnosticFields = {}) {
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined),
  )
}

export function diagnosticId(scope: string): string {
  return `${scope}_${randomUUID().slice(0, 8)}`
}

export function hashIdentifier(value: string | null | undefined): string | null {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (!normalized) return null
  return createHash('sha256').update(normalized).digest('hex').slice(0, 16)
}

export function logServerEvent(event: string, fields: DiagnosticFields = {}) {
  console.info(JSON.stringify({ level: 'info', event, at: new Date().toISOString(), ...safeFields(fields) }))
}

export function logServerError(event: string, error: unknown, fields: DiagnosticFields = {}) {
  console.error(JSON.stringify({
    level: 'error',
    event,
    at: new Date().toISOString(),
    ...safeFields(fields),
    error: error instanceof Error ? error.message : 'Unknown error',
  }))
}
