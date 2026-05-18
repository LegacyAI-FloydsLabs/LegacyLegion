import { peopleSearch, ConnectorNotConfiguredError } from '../lib/connectors/apollo'
import { dedupeProspectCandidates, normalizeProspectCandidate } from '../lib/prospects/dedupe'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

async function testApolloMissingKey() {
  const original = process.env.APOLLO_API_KEY
  delete process.env.APOLLO_API_KEY
  try {
    await peopleSearch({ q_keywords: 'owner', per_page: 1 })
    throw new Error('peopleSearch should throw ConnectorNotConfiguredError when APOLLO_API_KEY is missing')
  } catch (error) {
    assert(error instanceof ConnectorNotConfiguredError, 'missing Apollo key should throw ConnectorNotConfiguredError')
    assert(error.service === 'apollo', 'missing Apollo key should identify apollo service')
  } finally {
    if (original) process.env.APOLLO_API_KEY = original
  }
}

async function testDedupeRules() {
  const candidates = [
    normalizeProspectCandidate({
      source: 'APOLLO',
      sourceId: 'new-1',
      companyName: 'Fresh HVAC',
      companyDomain: 'freshhvac.example',
      personFirstName: 'Fran',
      personLastName: 'Owner',
      personEmail: 'fran@freshhvac.example',
    }),
    normalizeProspectCandidate({
      source: 'APOLLO',
      sourceId: 'dup-email',
      companyName: 'Duplicate Email',
      companyDomain: 'dup.example',
      personLastName: 'Other',
      personEmail: 'existing@example.test',
    }),
    normalizeProspectCandidate({
      source: 'EXPLORIUM',
      sourceId: 'dup-domain-last',
      companyName: 'Domain Match',
      companyDomain: 'same-domain.example',
      personLastName: 'Smith',
      personEmail: null,
    }),
  ]

  const result = await dedupeProspectCandidates(candidates, {
    existingLeadEmails: new Set(['existing@example.test']),
    existingProspectEmails: new Set(),
    existingDomainLastNames: new Set(['same-domain.example::smith']),
  })

  assert(result.persistable.length === 1, `expected 1 persistable candidate, got ${result.persistable.length}`)
  assert(result.skipped.length === 2, `expected 2 skipped candidates, got ${result.skipped.length}`)
  assert(result.skipped.some((item) => item.reason === 'EMAIL_EXISTS'), 'expected EMAIL_EXISTS skip')
  assert(result.skipped.some((item) => item.reason === 'DOMAIN_LAST_NAME_EXISTS'), 'expected DOMAIN_LAST_NAME_EXISTS skip')
}

async function main() {
  await testApolloMissingKey()
  await testDedupeRules()
  console.log('phase2-prospects-test: PASS')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
