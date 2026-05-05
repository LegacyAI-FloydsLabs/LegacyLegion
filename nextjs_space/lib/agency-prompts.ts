// Server-side prompt builders for Agency Mode tools.
// These are the actual playbooks Ryan + the team will run on behalf of clients.

export type AgencyToolType =
  | 'SEO_AUDIT'
  | 'GBP_OPTIMIZATION'
  | 'COMPETITOR_SWEEP'
  | 'KEYWORD_RESEARCH'
  | 'CONTENT_BRIEF'
  | 'AD_COPY'
  | 'LOCAL_LANDING_PAGE'
  | 'REVIEW_RESPONSE'
  | 'EMAIL_CAMPAIGN'

export const AGENCY_TOOLS: { type: AgencyToolType; label: string; description: string; needsInput?: string }[] = [
  { type: 'SEO_AUDIT', label: 'SEO Audit', description: 'Full local SEO audit: technical, on-page, content gaps, link signals, quick wins.' },
  { type: 'GBP_OPTIMIZATION', label: 'GBP Optimization', description: 'Google Business Profile audit + 30/60/90 optimization plan.' },
  { type: 'COMPETITOR_SWEEP', label: 'Competitor Sweep', description: 'Identify and dissect the top local competitors and where to overtake them.' },
  { type: 'KEYWORD_RESEARCH', label: 'Keyword Research', description: 'High-intent local keyword universe + clustering + priority.' },
  { type: 'CONTENT_BRIEF', label: 'Content Brief', description: 'Blog/landing page outline + word counts + entities to cover.', needsInput: 'Topic or target keyword' },
  { type: 'AD_COPY', label: 'Ad Copy Pack', description: 'Google + Meta ad copy variants tuned to the offer.', needsInput: 'Offer or campaign focus (e.g. "24/7 emergency HVAC")' },
  { type: 'LOCAL_LANDING_PAGE', label: 'Local Landing Page', description: 'Draft a city/service landing page (hero, sections, FAQ, schema).', needsInput: 'Service + city (e.g. "AC repair Carmel IN")' },
  { type: 'REVIEW_RESPONSE', label: 'Review Response', description: 'Drafts an on-brand reply to a customer review.', needsInput: 'Paste the review text' },
  { type: 'EMAIL_CAMPAIGN', label: 'Email Campaign', description: '5-touch nurture sequence for the segment provided.', needsInput: 'Audience + goal' },
]

export const BRAND_RULES = `You are LegacyAI's senior strategist working ON BEHALF OF the client below.
LegacyAI is an Indianapolis AI-first marketing firm, partner-not-vendor model, month-to-month, client owns all assets.
Writing rules:
- Concrete, specific, and actionable. No marketing fluff.
- Markdown with ## section headings, bold key terms, short bullets, numbered steps.
- Cite the LegacyAI knowledge-base context where relevant; if context is empty, say so once and proceed using best practice.
- NEVER invent specific keyword volumes, ranking positions, traffic numbers, or competitor names you weren't given. Use phrases like "likely high intent" or "in markets like yours".
- End every deliverable with a "### Next Steps" block listing what LegacyAI will execute this week.`

interface BuildArgs {
  client: {
    businessName: string
    industry: string
    city?: string | null
    state?: string | null
    website?: string | null
    gbpUrl?: string | null
    tier?: string | null
    monthlyMRR?: number | null
    strategyBrief?: string | null
  }
  intelligenceContext: string
  userInput?: string
}

function clientHeader(c: BuildArgs['client'], intelligenceContext: string): string {
  return `Client snapshot:
- Business: ${c.businessName}
- Industry: ${c.industry}
- Location: ${c.city ?? 'Indianapolis'}, ${c.state ?? 'IN'}
- Website: ${c.website || 'not provided'}
- Google Business Profile: ${c.gbpUrl || 'not provided'}
- Tier: ${c.tier ?? 'LAUNCH_PAD'} (${c.monthlyMRR ?? 0}/mo MRR)
- Strategy brief: ${c.strategyBrief || 'none yet'}

LegacyAI knowledge-base context (top matches):
${intelligenceContext || '[no indexed insights matched — proceed using best practice]'}
`
}

export function buildAgencyPrompt(type: AgencyToolType, args: BuildArgs): { system: string; user: string; intelQuery: string } {
  const c = args.client
  const loc = `${c.city ?? 'Indianapolis'}, ${c.state ?? 'IN'}`
  const head = clientHeader(c, args.intelligenceContext ?? '')
  const userInput = (args.userInput ?? '').trim()
  let system = BRAND_RULES
  let user = head
  let intelQuery = `${c.industry} local SEO ${loc}`

  switch (type) {
    case 'SEO_AUDIT':
      intelQuery = `${c.industry} local SEO audit ${loc} ranking factors`
      system += `\n\nDeliver a full local SEO audit organized as:\n## Executive Summary\n## Technical Health\n## On-Page & Content\n## Local Pack & Citations\n## Backlink & Authority Signals\n## Quick Wins (next 14 days)\n## 90-Day Roadmap\n### Next Steps`
      user += `\nWrite the full SEO audit now.`
      break
    case 'GBP_OPTIMIZATION':
      intelQuery = `Google Business Profile optimization ${c.industry} ${loc}`
      system += `\n\nDeliver a GBP optimization plan organized as:\n## Profile Completeness Score\n## Categories & Services\n## Photos & Posts\n## Reviews & Q&A\n## Products / Booking Links\n## Local Justifications & Attributes\n## 30/60/90 Plan\n### Next Steps`
      user += `\nWrite the GBP optimization plan now.`
      break
    case 'COMPETITOR_SWEEP':
      intelQuery = `${c.industry} competitors ${loc} local pack`
      system += `\n\nDeliver a competitor sweep organized as:\n## Likely Top Local Competitors (3-5, by archetype, since we lack scrapes)\n## Where They Win\n## Where They Are Weak\n## Three Specific Plays To Overtake Them\n### Next Steps`
      user += `\nWrite the competitor sweep now.`
      break
    case 'KEYWORD_RESEARCH':
      intelQuery = `${c.industry} keywords ${loc} commercial intent`
      system += `\n\nDeliver keyword research organized as:\n## Money Keywords (transactional, top 10)\n## Service-Modifier Keywords (top 10)\n## Long-Tail / Question Keywords (top 10)\n## Local Geo-Modified Keywords (top 10)\n## Cluster Map (group keywords into 4-6 page targets)\n## Priority Order (with rationale)\n### Next Steps`
      user += `\nWrite the keyword research deliverable now.`
      break
    case 'CONTENT_BRIEF':
      intelQuery = `${userInput || c.industry} content brief ${loc}`
      system += `\n\nDeliver a content brief organized as:\n## Target Query & Search Intent\n## Recommended URL & Title\n## Meta Description\n## H1 + Section Outline (with H2s and word counts)\n## Entities & Subtopics To Cover\n## Internal Links\n## CTA Block\n### Next Steps`
      user += `\nTopic / target keyword: ${userInput || '[derive from industry + location]'}\nWrite the content brief now.`
      break
    case 'AD_COPY':
      intelQuery = `${c.industry} ${userInput || 'service'} ad copy ${loc}`
      system += `\n\nDeliver an ad copy pack organized as:\n## Google Search Ads — 5 RSA variants (15 headlines, 4 descriptions formatted)\n## Meta Ads — 3 angles, each with 3 headlines + 2 primary texts\n## Negative Keywords to Add\n## Landing Page Hero suggestion\n### Next Steps`
      user += `\nOffer / campaign focus: ${userInput || '[infer from industry]'}\nWrite the ad copy pack now.`
      break
    case 'LOCAL_LANDING_PAGE':
      intelQuery = `${userInput || c.industry + ' ' + loc} landing page schema`
      system += `\n\nDeliver a landing page draft organized as:\n## Suggested URL & Title Tag\n## Meta Description\n## Hero (H1 + subhead + CTA)\n## Trust Strip\n## Service Sections (3-5)\n## Local Proof (testimonials/reviews placeholders)\n## FAQ (5)\n## LocalBusiness JSON-LD (filled with what we know, [PLACEHOLDER] for missing)\n### Next Steps`
      user += `\nService + city target: ${userInput || c.industry + ' in ' + loc}\nWrite the landing page now.`
      break
    case 'REVIEW_RESPONSE':
      intelQuery = `online review response ${c.industry}`
      system += `\n\nDeliver a review-response draft organized as:\n## Sentiment & Risk Read\n## Recommended Public Response (3 sentence cap, warm, specific, ownership)\n## Optional Private Outreach Script\n## What To Fix Internally If Recurring\n### Next Steps`
      user += `\nReview text:\n"""\n${userInput || '[no review supplied]'}\n"""\nDraft the response now.`
      break
    case 'EMAIL_CAMPAIGN':
      intelQuery = `${c.industry} email nurture ${userInput || 'lead'}`
      system += `\n\nDeliver a 5-touch nurture sequence:\n## Audience & Goal\n## Touch 1 — Welcome (subject + body)\n## Touch 2 — Value (subject + body)\n## Touch 3 — Proof (subject + body)\n## Touch 4 — Offer (subject + body)\n## Touch 5 — Break-up (subject + body)\n### Next Steps`
      user += `\nAudience + goal: ${userInput || '[infer from industry]'}\nWrite the sequence now.`
      break
  }
  return { system, user, intelQuery }
}
