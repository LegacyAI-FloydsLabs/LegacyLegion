import { dispatchTool } from '@/lib/agents/dispatcher'
import { AGENTS } from '@/lib/agents/registry'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

async function main() {
  assert(AGENTS.length === 6, `expected 6 agents, got ${AGENTS.length}`)
  assert(new Set(AGENTS.map((agent) => agent.id)).size === 6, 'agent ids must be unique')
  assert(AGENTS.every((agent) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(agent.id)), 'agent ids must be kebab-case')

  const missingClient = await dispatchTool('SEO_AUDIT', {}, { userId: 'test-user' })
  assert(missingClient.ok === false, 'missing client dispatch must fail')
  assert(missingClient.error?.code === 'CLIENT_REQUIRED', `expected CLIENT_REQUIRED, got ${missingClient.error?.code}`)

  console.log('phase1-dispatcher-test: PASS')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
