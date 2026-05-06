import { fetchPublicGBP } from '../lib/intelligence/gbp'
import { parseGscCsv, summarizeGscRows } from '../lib/intelligence/gsc'
import { buildAgencyPrompt } from '../lib/agency-prompts'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

async function testFetchPublicGBP() {
  const snapshot = await fetchPublicGBP('https://www.google.com/maps/search/?api=1&query=The%20Children%27s%20Museum%20of%20Indianapolis')
  assert(snapshot.reviewCount > 0, `expected non-zero reviewCount, got ${snapshot.reviewCount}`)
  assert(snapshot.photoCount > 0, `expected non-zero photoCount, got ${snapshot.photoCount}`)
  assert(Boolean(snapshot.primaryCategory), 'expected primaryCategory')
  assert(snapshot.sourceUrl.includes('google.com/maps'), 'expected sourceUrl to retain Maps origin')
}

function testGscSummary() {
  const rows = parseGscCsv(`Date,Query,Clicks,Impressions,CTR,Position
2026-05-01,emergency plumber indianapolis,10,100,10%,3.2
2026-05-02,emergency plumber indianapolis,4,80,5%,8.1
2026-05-01,water heater repair,0,50,0%,22
2026-05-02,water heater repair,3,75,4%,14
`)
  const summary = summarizeGscRows(rows)
  assert(summary.rowCount === 4, `expected 4 rows, got ${summary.rowCount}`)
  assert(summary.queryCount === 2, `expected 2 queries, got ${summary.queryCount}`)
  assert(summary.lostQueries[0]?.query === 'emergency plumber indianapolis', 'expected emergency plumber to be the top lost query')
  assert(summary.topMovers[0]?.query === 'water heater repair', 'expected water heater repair to be the top mover')
}

function testPromptIncludesLiveGBP() {
  const prompt = buildAgencyPrompt('GBP_OPTIMIZATION', {
    client: {
      businessName: 'Phase 1 HVAC',
      industry: 'HVAC',
      city: 'Indianapolis',
      state: 'IN',
      gbpUrl: 'https://www.google.com/maps/search/?api=1&query=The%20Children%27s%20Museum%20of%20Indianapolis',
      liveGBP: {
        name: "The Children's Museum of Indianapolis",
        rating: 4.7,
        reviewCount: 62070,
        photoCount: 187,
        primaryCategory: "Children's museum",
        categories: ["Children's museum", 'Museum'],
        fetchedAt: '2026-05-06T00:00:00.000Z',
      },
    },
    intelligenceContext: 'local SEO context',
  })
  assert(prompt.user.includes('<INTELLIGENCE>'), 'expected prompt to include INTELLIGENCE block')
  assert(prompt.user.includes('<LIVE_GBP>'), 'expected prompt to include LIVE_GBP block')
  assert(prompt.user.includes('Review count: 62070'), 'expected prompt to include live review count')
}

async function main() {
  await testFetchPublicGBP()
  testGscSummary()
  testPromptIncludesLiveGBP()
  console.log('phase3-intelligence-test: PASS')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
