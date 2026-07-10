import { readFileSync } from 'node:fs'
import { MARKETING_MODEL_ROUTER, MARKETING_RUNTIME_STAGES } from '@/lib/agents/marketing-runtime'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function read(path: string) {
  return readFileSync(path, 'utf8')
}

function assertIncludes(source: string, needle: string, message: string) {
  assert(source.includes(needle), message)
}

function testRuntimeStageContract() {
  const ids = MARKETING_RUNTIME_STAGES.map((stage) => stage.id)
  for (const id of ['strategy', 'account', 'intelligence', 'llm-computer-work', 'cashflow', 'sales-field', 'operations-hil', 'automation', 'final-router']) {
    assert(ids.includes(id as any), `marketing runtime must include ${id} stage`)
    assert(MARKETING_MODEL_ROUTER[id as keyof typeof MARKETING_MODEL_ROUTER], `model router must include ${id}`)
  }

  const lanes = new Set(MARKETING_RUNTIME_STAGES.map((stage) => stage.lane))
  for (const lane of ['SENIOR_LLM', 'DOUGLAS_OFFICE_HIL', 'RYAN_FIELD_SALES', 'CASHFLOW_DECISION', 'APPROVAL_GATE']) {
    assert(lanes.has(lane as any), `runtime must account for ${lane}`)
  }

  const personas = new Set(MARKETING_RUNTIME_STAGES.map((stage) => stage.persona.id))
  for (const id of ['senior-advisor', 'account-manager', 'intelligence-agent', 'marketing-guru', 'lead-gen-manager', 'tool-builder']) {
    assert(personas.has(id), `marketing runtime must use ${id}`)
  }
}

function testRuntimeSource() {
  const runtime = read('lib/agents/marketing-runtime.ts')
  assertIncludes(runtime, 'runMarketingRuntime', 'runtime must export runMarketingRuntime')
  assertIncludes(runtime, 'MARKETING_MODEL_ROUTER', 'runtime must define a model router')
  assertIncludes(runtime, 'runAgentLoop', 'runtime must call the existing agent loop')
  assertIncludes(runtime, 'LLM owns ad creation, keyword work, business planning, strategy, content generation', 'runtime must assign computer work to LLMs')
  assertIncludes(runtime, 'Douglas is a junior operator for office tasks, cashflow decisions', 'runtime must assign office/HIL work to Douglas')
  assertIncludes(runtime, 'Ryan owns salesperson and in-field tasks', 'runtime must assign field sales work to Ryan')
  assertIncludes(runtime, 'Do not add or assume headless browser automation, CrewAI, Google ADK, Claude SDK', 'runtime must not add automation frameworks implicitly')
  assertIncludes(runtime, 'teach Douglas how to run a high-level marketing firm while doing the work', 'runtime must teach Douglas without blocking execution')
  assertIncludes(runtime, 'larger incumbent marketing companies such as Scorpion', 'runtime must preserve competitive positioning against larger incumbents')
  assertIncludes(runtime, 'low-pressure, field-level partners', 'runtime must preserve low-pressure field-level positioning')
  assertIncludes(runtime, 'what each marketing battle can win, what it can cost', 'runtime must explain marketing tradeoffs in field terms')
  assertIncludes(runtime, 'bridge human experience with AI', 'runtime must preserve LegacyAI website voice')
  assertIncludes(runtime, 'technical complexity into intuitive client-specific systems', 'runtime must translate AI into practical systems')
  assertIncludes(runtime, 'real customers, real numbers, and real operations', 'runtime must ground promises in real operating proof')
  assertIncludes(runtime, 'avoid technology-for-technology', 'runtime must avoid tech-for-tech-sake positioning')
  assertIncludes(runtime, 'MARKETING_FIRM_DOGFOOD', 'runtime must classify the marketing firm as a dogfood client')
  assertIncludes(runtime, 'Precision Sewer Inspection', 'runtime must classify Precision Sewer Inspection as owned dogfood')
  assertIncludes(runtime, 'Simple Man Plumbing', 'runtime must classify Simple Man Plumbing as close umbrella')
  assertIncludes(runtime, 'Restore & Renew', 'runtime must classify Restore & Renew as external client')
  assertIncludes(runtime, 'Managed-company relationship', 'runtime prompts must include managed-company relationship context')
  assertIncludes(runtime, 'SENIOR_MARKETING_RUNTIME', 'runtime must persist a distinct work-order type')
}

function testRuntimeApiRoute() {
  const route = read('app/api/agents/marketing-runtime/run/route.ts')
  assertIncludes(route, 'requireInternalUser', 'runtime route must require internal auth')
  assertIncludes(route, 'checkRateLimit', 'runtime route must be rate limited')
  assertIncludes(route, "bucket: 'agent-marketing-runtime'", 'runtime route must use a dedicated rate-limit bucket')
  assertIncludes(route, 'ABACUSAI_API_KEY', 'runtime route must gate on the configured RouteLLM key')
  assertIncludes(route, 'MARKETING_RUNTIME_ENABLED', 'runtime route must have an explicit preview kill switch')
  assertIncludes(route, 'VERCEL_ENV', 'runtime route must scope the kill switch to Vercel Preview')
  assertIncludes(route, 'MARKETING_RUNTIME_DISABLED', 'runtime route must return a machine-readable disabled code')
  assertIncludes(route, 'runMarketingRuntime', 'runtime route must call the marketing runtime')
}

function testRuntimeUiSurface() {
  const chat = read('app/app/agency/chat/_components/agency-chat-client.tsx')
  assertIncludes(chat, '/api/agents/marketing-runtime/run', 'agency chat must expose the marketing runtime API')
  assertIncludes(chat, 'Run Runtime', 'agency chat must expose a runtime control')
  assertIncludes(chat, 'setRuntimeLoading', 'agency chat must track runtime execution state')
  assertIncludes(chat, 'workOrderId', 'agency chat must acknowledge runtime-created work orders')
}

function main() {
  testRuntimeStageContract()
  testRuntimeSource()
  testRuntimeApiRoute()
  testRuntimeUiSurface()
  console.log('marketing-runtime-contract-test: PASS')
}

main()
