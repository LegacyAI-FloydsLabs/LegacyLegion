import { ConnectorHttpError, ConnectorNotConfiguredError } from './apollo'

const EXPLORIUM_BASE_URL = 'https://api.explorium.ai/v1'

export interface ExploriumMatchRequest {
  filters: Record<string, unknown>
  size?: number
  page?: number
}

function clampSize(value: unknown) {
  const parsed = Number(value ?? 25)
  if (!Number.isFinite(parsed) || parsed <= 0) return 25
  return Math.min(Math.floor(parsed), 25)
}

async function exploriumPost(path: string, body: Record<string, unknown>) {
  const apiKey = process.env.EXPLORIUM_API_KEY
  if (!apiKey) throw new ConnectorNotConfiguredError('explorium', 'EXPLORIUM_API_KEY')

  const response = await fetch(`${EXPLORIUM_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      api_key: apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  })

  const text = await response.text()
  let payload: any = null
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    payload = text
  }

  if (!response.ok) {
    const message = payload?.error ?? payload?.message ?? `Explorium returned HTTP ${response.status}.`
    throw new ConnectorHttpError('explorium', response.status, message, payload)
  }

  return payload
}

export function businessesMatch(request: ExploriumMatchRequest) {
  const size = clampSize(request.size)
  return exploriumPost('/businesses', {
    mode: 'full',
    filters: request.filters,
    size,
    page_size: size,
    page: request.page ?? 1,
  })
}

export function prospectsMatch(request: ExploriumMatchRequest) {
  const size = clampSize(request.size)
  return exploriumPost('/prospects', {
    mode: 'full',
    filters: request.filters,
    size,
    page_size: size,
    page: request.page ?? 1,
  })
}

export function enrichBusiness(businessId: string) {
  return exploriumPost('/businesses/enrichments', { business_id: businessId })
}

export function enrichProspect(prospectId: string) {
  return exploriumPost('/prospects/contacts_information/enrich', { prospect_id: prospectId })
}
