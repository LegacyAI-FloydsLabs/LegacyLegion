import { readFileSync } from 'node:fs'
import {
  containsCredentialMaterial,
  findCredentialMaterialField,
  normalizeAccessPlatform,
  normalizeAccessStatus,
} from '@/lib/client-access'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function modelBlock(schema: string, model: string) {
  const start = schema.indexOf(`model ${model} `)
  assert(start >= 0, `${model} model missing`)
  const rest = schema.slice(start + 1)
  const next = rest.search(/\nmodel\s+/)
  return schema.slice(start, next >= 0 ? start + 1 + next : schema.length)
}

function testNormalizers() {
  assert(normalizeAccessPlatform('google ads') === 'GOOGLE_ADS', 'platform normalizer should accept human text')
  assert(normalizeAccessPlatform('bad platform') === null, 'unknown platform must be rejected')
  assert(normalizeAccessStatus('received in vault') === 'RECEIVED_IN_VAULT', 'status normalizer should accept human text')
  assert(normalizeAccessStatus('published') === null, 'unknown status must be rejected')
}

function testCredentialMaterialDetector() {
  assert(containsCredentialMaterial('password: never-put-this-here'), 'password labels must be rejected')
  assert(containsCredentialMaterial('Bearer abcdefghijklmnopqrstuvwxyz0123456789'), 'bearer tokens must be rejected')
  assert(!containsCredentialMaterial('1Password item: LegacyLegion / Client / GBP Admin'), 'external vault references must be allowed')
  assert(findCredentialMaterialField({ safe: '1Password item', unsafe: 'api key = nope' }) === 'unsafe', 'offending field should be identified')
}

function testSchemaContracts() {
  const schema = readFileSync('prisma/schema.prisma', 'utf8')
  const accessRequest = modelBlock(schema, 'ClientAccessRequest')
  const accessEvent = modelBlock(schema, 'ClientAccessEvent')

  assert(/\bexternalVaultRef\s+String\?/.test(accessRequest), 'access request must store external vault references only')
  assert(/\bevents\s+ClientAccessEvent\[\]/.test(accessRequest), 'access request must retain audit events')
  assert(/\btype\s+String\b/.test(accessEvent), 'access events must record event type')
  assert(/\bactor\s+User\?/.test(accessEvent), 'access events must record actor relation')
  assert(!/^\s*(password|credential|secret|token|recovery)\s+/im.test(accessRequest), 'access request must not define raw secret fields')
}

function testRouteContracts() {
  const listRoute = readFileSync('app/api/agency/clients/[id]/access-requests/route.ts', 'utf8')
  const updateRoute = readFileSync('app/api/agency/clients/[id]/access-requests/[requestId]/route.ts', 'utf8')
  const panel = readFileSync('app/app/agency/clients/[id]/_components/client-access-panel.tsx', 'utf8')
  const migration = readFileSync('prisma/migrations/20260518042000_client_access_intake/migration.sql', 'utf8')

  assert(listRoute.includes('requireInternalUser'), 'access intake list/create route must require an internal user')
  assert(listRoute.includes('findCredentialMaterialField'), 'access intake create route must reject raw credential material')
  assert(updateRoute.includes('isAdminRole'), 'access decision route must check admin role')
  assert(updateRoute.includes('Admin role required for access decisions'), 'non-admin access decisions must be rejected')
  assert(panel.includes('Do not store passwords or recovery material here.'), 'workspace UI must warn against raw credential storage')
  assert(migration.includes('CREATE TABLE "ClientAccessRequest"'), 'migration must create access request table')
  assert(migration.includes('CREATE TABLE "ClientAccessEvent"'), 'migration must create access event table')
}

testNormalizers()
testCredentialMaterialDetector()
testSchemaContracts()
testRouteContracts()
console.log('Client access intake contract tests passed')
