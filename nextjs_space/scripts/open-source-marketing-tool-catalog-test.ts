import { AGENCY_TOOLS, buildAgencyPrompt } from '@/lib/agency-prompts'
import {
  OPEN_SOURCE_MARKETING_SOURCE_REPOS,
  OPEN_SOURCE_MARKETING_TOOLS,
  OPEN_SOURCE_TOOL_WORKFLOW_LABELS,
} from '@/lib/open-source-marketing-tool-catalog'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const expectedRepos = [
  'coreyhaines31/marketingskills',
  'zubair-trabzada/ai-marketing-claude',
  'eracle/OpenOutreach',
  'VishwaGauravIn/twitter-auto-poster-bot-ai',
  'Affitor/affiliate-skills',
  'builderz-labs/marketing-dashboard',
  'proxy-intell/facebook-ads-library-mcp',
]

for (const repo of expectedRepos) {
  assert(
    OPEN_SOURCE_MARKETING_SOURCE_REPOS.some((source) => source.repo === repo),
    `expected source repo ${repo} to be registered`,
  )
  assert(
    OPEN_SOURCE_MARKETING_TOOLS.some((tool) => tool.sourceRepo === repo),
    `expected at least one tool from ${repo}`,
  )
}

assert(OPEN_SOURCE_MARKETING_TOOLS.length >= 24, 'expected a broad open-source marketing tool catalog')
assert(Object.keys(OPEN_SOURCE_TOOL_WORKFLOW_LABELS).length >= 6, 'expected workflow labels for grouped UI rendering')

for (const tool of OPEN_SOURCE_MARKETING_TOOLS) {
  assert(tool.name.trim().length > 0, 'tool name must be present')
  assert(tool.platformUse.trim().length > 0, `${tool.name} must explain LegacyLegion platform use`)
  assert(tool.localSourcePath.startsWith('external/marketing-open-source/'), `${tool.name} must point at the local anonymous archive`)
  assert(tool.networkPolicy === 'local-archive-only', `${tool.name} must not auto-report upstream`)
  assert(!tool.localSourcePath.includes('.git'), `${tool.name} must not reference git metadata`)
}

const installedToolTypes = AGENCY_TOOLS.filter((tool) => tool.type.startsWith('OSS_'))
assert(installedToolTypes.length === OPEN_SOURCE_MARKETING_TOOLS.length, 'expected every downloaded tool to be installed as an Agency Tool')
assert(installedToolTypes.some((tool) => tool.label === 'Meta Ads Retrieval'), 'expected Meta Ads Retrieval to be runnable from Agency Tools')
assert(installedToolTypes.some((tool) => tool.label === 'Autonomous Lead Discovery'), 'expected OpenOutreach lead discovery to be runnable from Agency Tools')

const prompt = buildAgencyPrompt(installedToolTypes[0].type, {
  client: {
    businessName: 'Archive Install Test HVAC',
    industry: 'HVAC',
    city: 'Indianapolis',
    state: 'IN',
    website: 'https://example.invalid',
    gbpUrl: null,
    tier: 'GROWTH_ENGINE',
    monthlyMRR: 2500,
    strategyBrief: 'AI-led local marketing operations.',
  },
  intelligenceContext: '',
  userInput: 'Create the first installed-tool work order.',
})
assert(prompt.system.includes('do not report telemetry upstream'), 'expected installed tool prompt to block upstream reporting')
assert(prompt.user.includes('Local archive path:'), 'expected installed tool prompt to cite local source archive')
assert(prompt.system.includes('Ryan Sales Actions'), 'expected installed tool prompt to include Ryan ownership')

console.log('open-source-marketing-tool-catalog-test: PASS')
