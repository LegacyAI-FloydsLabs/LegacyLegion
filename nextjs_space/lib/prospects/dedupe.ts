export type ProspectSource = 'EXPLORIUM' | 'APOLLO' | 'MANUAL'

export interface ProspectCandidate {
  source: ProspectSource
  sourceId: string
  clientId?: string | null
  companyName?: string | null
  companyDomain?: string | null
  companyIndustry?: string | null
  companyEmployeeCount?: number | null
  companyRevenue?: number | null
  personFirstName?: string | null
  personLastName?: string | null
  personTitle?: string | null
  personEmail?: string | null
  personPhone?: string | null
  personLinkedinUrl?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  enrichedJson?: unknown
}

export type ProspectSkipReason = 'EMAIL_EXISTS' | 'DOMAIN_LAST_NAME_EXISTS' | 'SOURCE_ID_EXISTS'

export interface ProspectSkip {
  candidate: ProspectCandidate
  reason: ProspectSkipReason
}

export interface ExistingProspectKeys {
  existingLeadEmails: Set<string>
  existingProspectEmails: Set<string>
  existingDomainLastNames: Set<string>
  existingSourceKeys?: Set<string>
}

export function normalizeEmail(email: string | null | undefined) {
  const trimmed = String(email ?? '').trim().toLowerCase()
  return trimmed || null
}

export function normalizeDomain(domain: string | null | undefined) {
  const trimmed = String(domain ?? '').trim().toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
  return trimmed || null
}

export function domainLastNameKey(domain: string | null | undefined, lastName: string | null | undefined) {
  const normalizedDomain = normalizeDomain(domain)
  const normalizedLastName = String(lastName ?? '').trim().toLowerCase()
  if (!normalizedDomain || !normalizedLastName) return null
  return `${normalizedDomain}::${normalizedLastName}`
}

export function normalizeProspectCandidate(candidate: ProspectCandidate): ProspectCandidate {
  return {
    ...candidate,
    companyDomain: normalizeDomain(candidate.companyDomain),
    personEmail: normalizeEmail(candidate.personEmail),
    personFirstName: candidate.personFirstName?.trim() || null,
    personLastName: candidate.personLastName?.trim() || null,
  }
}

export async function dedupeProspectCandidates(
  rawCandidates: ProspectCandidate[],
  existing: ExistingProspectKeys
) {
  const persistable: ProspectCandidate[] = []
  const skipped: ProspectSkip[] = []
  const seenEmails = new Set([...existing.existingLeadEmails, ...existing.existingProspectEmails])
  const seenDomainLastNames = new Set(existing.existingDomainLastNames)
  const seenSourceKeys = new Set(existing.existingSourceKeys ?? [])

  for (const rawCandidate of rawCandidates) {
    const candidate = normalizeProspectCandidate(rawCandidate)
    const email = normalizeEmail(candidate.personEmail)
    const domainLast = domainLastNameKey(candidate.companyDomain, candidate.personLastName)
    const sourceKey = `${candidate.source}::${candidate.sourceId}`

    if (seenSourceKeys.has(sourceKey)) {
      skipped.push({ candidate, reason: 'SOURCE_ID_EXISTS' })
      continue
    }
    if (email && seenEmails.has(email)) {
      skipped.push({ candidate, reason: 'EMAIL_EXISTS' })
      continue
    }
    if (domainLast && seenDomainLastNames.has(domainLast)) {
      skipped.push({ candidate, reason: 'DOMAIN_LAST_NAME_EXISTS' })
      continue
    }

    persistable.push(candidate)
    seenSourceKeys.add(sourceKey)
    if (email) seenEmails.add(email)
    if (domainLast) seenDomainLastNames.add(domainLast)
  }

  return { persistable, skipped }
}
