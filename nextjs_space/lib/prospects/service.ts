import { prisma } from '@/lib/db'
import { peopleSearch, ConnectorHttpError, ConnectorNotConfiguredError } from '@/lib/connectors/apollo'
import { businessesMatch } from '@/lib/connectors/explorium'
import {
  dedupeProspectCandidates,
  domainLastNameKey,
  normalizeDomain,
  normalizeEmail,
  type ProspectCandidate,
  type ProspectSource,
} from './dedupe'

export type ProspectSearchSource = 'explorium' | 'apollo' | 'auto'

export interface ProspectSearchInput {
  userId: string
  clientId?: string | null
  nlQuery?: string
  criteria?: Record<string, any>
  source?: ProspectSearchSource
  limit?: number
}

export interface ProspectPromoteInput {
  userId: string
  prospectId: string
}

export class ProspectSearchError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 400, public readonly details?: unknown) {
    super(message)
    this.name = 'ProspectSearchError'
  }
}

function clampLimit(limit: unknown) {
  const parsed = Number(limit ?? 5)
  if (!Number.isFinite(parsed) || parsed <= 0) return 5
  return Math.min(Math.floor(parsed), 25)
}

function sourceLabel(source: ProspectSearchSource): ProspectSource {
  if (source === 'apollo') return 'APOLLO'
  return 'EXPLORIUM'
}

function compactObject<T extends Record<string, any>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== null && entry !== '')) as T
}

export async function resolveProspectCriteria(nlQuery: string, fallback: Record<string, any> = {}) {
  const apiKey = process.env.ABACUSAI_API_KEY
  if (!apiKey) throw new ProspectSearchError('ROUTELLM_NOT_CONFIGURED', 'ABACUSAI_API_KEY is not configured.', 503)

  const response = await fetch('https://routellm.abacus.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'route-llm',
      temperature: 0,
      max_tokens: 500,
      messages: [
        {
          role: 'system',
          content: 'Extract B2B prospect search criteria as strict JSON only. Keys: city, state, country_code, industry, company_size, person_titles, q_keywords. Default city Indianapolis, state in, country_code us when absent.',
        },
        { role: 'user', content: nlQuery },
      ],
    }),
  })

  if (!response.ok) throw new ProspectSearchError('ROUTELLM_FAILED', `RouteLLM returned HTTP ${response.status}.`, 502)
  const payload = await response.json()
  const content = String(payload?.choices?.[0]?.message?.content ?? '{}').trim()
  const jsonText = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim()
  try {
    return { ...fallback, ...JSON.parse(jsonText) }
  } catch {
    throw new ProspectSearchError('CRITERIA_PARSE_FAILED', 'RouteLLM did not return valid criteria JSON.', 502, content)
  }
}

function valuesFilter(value: unknown) {
  const values = [value].flat().filter((entry) => entry !== undefined && entry !== null && entry !== '').map(String)
  return values.length ? { values } : undefined
}

function exploriumFilters(criteria: Record<string, any>) {
  const category = criteria.google_category ?? criteria.industry ?? criteria.linkedin_category
  return compactObject({
    country_code: valuesFilter(String(criteria.country_code ?? criteria.country ?? 'us').toLowerCase()),
    region_country_code: criteria.state ? valuesFilter(`us-${String(criteria.state).toLowerCase()}`) : undefined,
    city_region_country: criteria.city ? valuesFilter(`${criteria.city}, ${criteria.state ?? 'IN'}, US`) : undefined,
    company_size: criteria.company_size ? valuesFilter(criteria.company_size) : undefined,
    google_category: category ? valuesFilter(category) : undefined,
    company_revenue: criteria.revenue_range ? valuesFilter(criteria.revenue_range) : undefined,
  })
}

function apolloParams(criteria: Record<string, any>, limit: number) {
  return compactObject({
    page: 1,
    per_page: limit,
    q_keywords: criteria.q_keywords ?? criteria.keywords,
    person_titles: criteria.person_titles,
    person_seniorities: criteria.person_seniorities,
    person_locations: criteria.person_locations ?? [`${criteria.city ?? 'Indianapolis'}, ${criteria.state ?? 'Indiana'}, US`],
    person_email_status: criteria.person_email_status ?? ['verified', 'likely'],
    organization_locations: criteria.organization_locations ?? [`${criteria.state ?? 'Indiana'}, US`],
    organization_keyword_tags: criteria.organization_keyword_tags ?? (criteria.industry ? [criteria.industry].flat() : undefined),
    organization_num_employees_ranges: criteria.organization_num_employees_ranges,
    revenue_range: criteria.revenue_range,
  })
}

function mapExploriumBusiness(record: any, clientId?: string | null): ProspectCandidate {
  return {
    source: 'EXPLORIUM',
    sourceId: String(record.business_id ?? record.id ?? record.domain ?? record.website ?? record.name),
    clientId,
    companyName: record.name ?? null,
    companyDomain: record.domain ?? record.website ?? null,
    companyIndustry: record.google_category ?? record.linkedin_category ?? record.industry ?? null,
    companyEmployeeCount: typeof record.number_of_employees === 'number' ? record.number_of_employees : null,
    personPhone: record.phone ?? null,
    personLinkedinUrl: record.linkedin_url ?? null,
    city: record.city ?? record.address?.city ?? null,
    state: record.state ?? record.region ?? record.address?.region ?? null,
    country: record.country_code ?? record.address?.country_code ?? null,
    enrichedJson: record,
  }
}

function mapApolloPerson(record: any, clientId?: string | null): ProspectCandidate {
  const phone = record.phone_numbers?.[0]?.raw_number ?? record.organization?.primary_phone?.number ?? null
  return {
    source: 'APOLLO',
    sourceId: String(record.id),
    clientId,
    companyName: record.organization?.name ?? null,
    companyDomain: record.organization?.website_url ?? null,
    companyIndustry: record.organization?.industry ?? null,
    companyEmployeeCount: record.organization?.estimated_num_employees ?? null,
    personFirstName: record.first_name ?? null,
    personLastName: record.last_name ?? null,
    personTitle: record.title ?? null,
    personEmail: record.email_status === 'verified' || record.email_status === 'likely' ? record.email : null,
    personPhone: phone,
    personLinkedinUrl: record.linkedin_url ?? null,
    city: record.city ?? null,
    state: record.state ?? null,
    country: record.country ?? null,
    enrichedJson: record,
  }
}

async function existingKeys() {
  const [leads, prospects] = await Promise.all([
    prisma.lead.findMany({ select: { email: true, website: true, ownerName: true } }),
    prisma.prospect.findMany({ select: { source: true, sourceId: true, personEmail: true, companyDomain: true, personLastName: true } }),
  ])

  return {
    existingLeadEmails: new Set(leads.map((lead: any) => normalizeEmail(lead.email)).filter(Boolean) as string[]),
    existingProspectEmails: new Set(prospects.map((prospect: any) => normalizeEmail(prospect.personEmail)).filter(Boolean) as string[]),
    existingDomainLastNames: new Set([
      ...leads.map((lead: any) => domainLastNameKey(lead.website, String(lead.ownerName ?? '').split(/\s+/).pop())).filter(Boolean),
      ...prospects.map((prospect: any) => domainLastNameKey(prospect.companyDomain, prospect.personLastName)).filter(Boolean),
    ] as string[]),
    existingSourceKeys: new Set(prospects.map((prospect: any) => `${prospect.source}::${prospect.sourceId}`)),
  }
}

function connectorError(error: unknown): never {
  if (error instanceof ConnectorNotConfiguredError) {
    throw new ProspectSearchError('CONNECTOR_NOT_CONFIGURED', `${error.service} connector is not configured.`, 503, { service: error.service })
  }
  if (error instanceof ConnectorHttpError) {
    if (error.status === 401 || error.status === 403) throw new ProspectSearchError('PROSPECT_SOURCE_AUTH', error.message, 503, error.payload)
    if (error.status === 422 || (error.status >= 400 && error.status < 500)) throw new ProspectSearchError('PROSPECT_FILTER_INVALID', error.message, 400, error.payload)
    throw new ProspectSearchError('PROSPECT_UPSTREAM', error.message, 502, error.payload)
  }
  throw error
}

export async function searchProspects(input: ProspectSearchInput) {
  const limit = clampLimit(input.limit)
  const requestedSource = input.source ?? 'auto'
  const source = requestedSource === 'auto' ? 'explorium' : requestedSource
  const criteria = input.nlQuery ? await resolveProspectCriteria(input.nlQuery, input.criteria ?? {}) : (input.criteria ?? {})

  let rawPayload: any
  let candidates: ProspectCandidate[]
  try {
    if (source === 'apollo') {
      rawPayload = await peopleSearch(apolloParams(criteria, limit))
      candidates = (rawPayload?.people ?? []).map((record: any) => mapApolloPerson(record, input.clientId))
    } else {
      rawPayload = await businessesMatch({ filters: exploriumFilters(criteria), size: limit, page: 1 })
      candidates = (rawPayload?.data ?? []).map((record: any) => mapExploriumBusiness(record, input.clientId))
    }
  } catch (error) {
    connectorError(error)
  }

  const deduped = await dedupeProspectCandidates(candidates, await existingKeys())
  await prisma.leadGenCampaign.create({
    data: {
      ownerId: input.userId,
      clientId: input.clientId ?? null,
      name: input.nlQuery?.slice(0, 80) || `${source} prospect search`,
      source: sourceLabel(source),
      criteriaJson: criteria,
      totalFound: candidates.length,
      totalPersisted: deduped.persistable.length,
      lastRunAt: new Date(),
    } as any,
  })

  if (deduped.persistable.length) {
    await prisma.prospect.createMany({
      data: deduped.persistable.map((candidate) => ({
        source: candidate.source,
        sourceId: candidate.sourceId,
        clientId: candidate.clientId ?? null,
        companyName: candidate.companyName ?? null,
        companyDomain: normalizeDomain(candidate.companyDomain),
        companyIndustry: candidate.companyIndustry ?? null,
        companyEmployeeCount: candidate.companyEmployeeCount ?? null,
        companyRevenue: candidate.companyRevenue ?? null,
        personFirstName: candidate.personFirstName ?? null,
        personLastName: candidate.personLastName ?? null,
        personTitle: candidate.personTitle ?? null,
        personEmail: normalizeEmail(candidate.personEmail),
        personPhone: candidate.personPhone ?? null,
        personLinkedinUrl: candidate.personLinkedinUrl ?? null,
        city: candidate.city ?? null,
        state: candidate.state ?? null,
        country: candidate.country ?? null,
        enrichedJson: candidate.enrichedJson as any,
      })),
      skipDuplicates: true,
    })
  }

  const persisted = deduped.persistable.length
    ? await prisma.prospect.findMany({
      where: {
        OR: deduped.persistable.map((candidate) => ({
          source: candidate.source,
          sourceId: candidate.sourceId,
        })),
      },
      orderBy: { createdAt: 'desc' },
      take: deduped.persistable.length,
    })
    : []

  return {
    source,
    criteria,
    counts: { found: candidates.length, deduped: deduped.skipped.length, persisted: deduped.persistable.length },
    prospects: persisted,
    skipped: deduped.skipped.map((item) => ({ reason: item.reason, sourceId: item.candidate.sourceId })),
  }
}

export async function promoteProspectToLead(input: ProspectPromoteInput) {
  const prospect = await prisma.prospect.findUnique({ where: { id: input.prospectId } })
  if (!prospect) throw new ProspectSearchError('PROSPECT_NOT_FOUND', 'Prospect not found.', 404)
  if ((prospect as any).promotedToLeadId) return { leadId: (prospect as any).promotedToLeadId, alreadyPromoted: true }
  if (!prospect.personEmail && !prospect.personPhone) throw new ProspectSearchError('PROSPECT_CONTACT_REQUIRED', 'Prospect must have an email or phone before promotion.', 400)

  const ownerName = [prospect.personFirstName, prospect.personLastName].filter(Boolean).join(' ') || 'Unknown Owner'
  const lead = await prisma.lead.create({
    data: {
      businessName: prospect.companyName ?? 'Unknown Business',
      ownerName,
      email: prospect.personEmail,
      phone: prospect.personPhone,
      industry: prospect.companyIndustry ?? 'OTHER',
      city: prospect.city,
      state: prospect.state,
      website: prospect.companyDomain,
      source: 'PROSPECTING',
      channel: prospect.source.toLowerCase(),
      assignedToId: input.userId,
    },
  })

  await prisma.prospect.update({ where: { id: prospect.id }, data: { promotedToLeadId: lead.id } })
  return { leadId: lead.id, alreadyPromoted: false }
}
