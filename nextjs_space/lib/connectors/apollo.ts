export class ConnectorNotConfiguredError extends Error {
  constructor(public readonly service: string, variableName: string) {
    super(`${variableName} is not configured.`)
    this.name = 'ConnectorNotConfiguredError'
  }
}

export class ConnectorHttpError extends Error {
  constructor(
    public readonly service: string,
    public readonly status: number,
    message: string,
    public readonly payload?: unknown
  ) {
    super(message)
    this.name = 'ConnectorHttpError'
  }
}

export interface ApolloPeopleSearchParams {
  page?: number
  per_page?: number
  q_keywords?: string
  person_titles?: string[]
  person_seniorities?: string[]
  person_locations?: string[]
  person_not_locations?: string[]
  person_email_status?: string[]
  organization_ids?: string[]
  organization_locations?: string[]
  organization_not_locations?: string[]
  organization_industry_tag_ids?: string[]
  organization_keyword_tags?: string[]
  organization_num_employees_ranges?: string[]
  revenue_range?: { min?: number; max?: number }
  sort_by_field?: string
  sort_ascending?: boolean
}

const APOLLO_BASE_URL = 'https://api.apollo.io/api/v1'

function clampPerPage(value: unknown) {
  const parsed = Number(value ?? 25)
  if (!Number.isFinite(parsed) || parsed <= 0) return 25
  return Math.min(Math.floor(parsed), 50)
}

export async function peopleSearch(params: ApolloPeopleSearchParams) {
  const apiKey = process.env.APOLLO_API_KEY
  if (!apiKey) throw new ConnectorNotConfiguredError('apollo', 'APOLLO_API_KEY')

  const response = await fetch(`${APOLLO_BASE_URL}/mixed_people/api_search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({ ...params, page: params.page ?? 1, per_page: clampPerPage(params.per_page) }),
  })

  const text = await response.text()
  let payload: any = null
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    payload = text
  }

  if (!response.ok) {
    const message = payload?.error_message ?? payload?.message ?? `Apollo returned HTTP ${response.status}.`
    throw new ConnectorHttpError('apollo', response.status, message, payload)
  }

  return payload
}
