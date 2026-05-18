export type OpenSourceToolWorkflow =
  | 'strategy-audit'
  | 'lead-outreach'
  | 'content-production'
  | 'analytics-ops'
  | 'ad-intelligence'
  | 'affiliate-growth'
  | 'campaign-publishing'
  | 'ops-control'

export interface OpenSourceMarketingSourceRepo {
  repo: string
  url: string
  localSourcePath: string
  licenseNote: string
}

export interface OpenSourceMarketingTool {
  name: string
  sourceRepo: OpenSourceMarketingSourceRepo['repo']
  localSourcePath: string
  workflow: OpenSourceToolWorkflow
  platformUse: string
  integrationMode: 'playbook' | 'connector-candidate' | 'dashboard-pattern' | 'workflow-pattern'
  networkPolicy: 'local-archive-only'
  riskNote: string
}
export function openSourceAgencyToolType(tool: Pick<OpenSourceMarketingTool, 'name'>): `OSS_${string}` {
  return `OSS_${tool.name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')}`
}


export const OPEN_SOURCE_MARKETING_SOURCE_REPOS: OpenSourceMarketingSourceRepo[] = [
  {
    repo: 'coreyhaines31/marketingskills',
    url: 'https://github.com/coreyhaines31/marketingskills',
    localSourcePath: 'external/marketing-open-source/coreyhaines31__marketingskills',
    licenseNote: 'Local source archive only; review upstream license before copying implementation code.',
  },
  {
    repo: 'zubair-trabzada/ai-marketing-claude',
    url: 'https://github.com/zubair-trabzada/ai-marketing-claude',
    localSourcePath: 'external/marketing-open-source/zubair-trabzada__ai-marketing-claude',
    licenseNote: 'MIT-licensed marketing skill suite; imported here as cataloged playbooks, not installer scripts.',
  },
  {
    repo: 'eracle/OpenOutreach',
    url: 'https://github.com/eracle/OpenOutreach',
    localSourcePath: 'external/marketing-open-source/eracle__OpenOutreach',
    licenseNote: 'GPLv3 source archive; use as workflow reference unless licensing review approves code reuse.',
  },
  {
    repo: 'VishwaGauravIn/twitter-auto-poster-bot-ai',
    url: 'https://github.com/VishwaGauravIn/twitter-auto-poster-bot-ai',
    localSourcePath: 'external/marketing-open-source/VishwaGauravIn__twitter-auto-poster-bot-ai',
    licenseNote: 'Small Gemini-to-X posting bot; use as a guarded connector candidate only.',
  },
  {
    repo: 'Affitor/affiliate-skills',
    url: 'https://github.com/Affitor/affiliate-skills',
    localSourcePath: 'external/marketing-open-source/Affitor__affiliate-skills',
    licenseNote: 'MIT-licensed affiliate skill library; local archive contains skill playbooks and registry data.',
  },
  {
    repo: 'builderz-labs/marketing-dashboard',
    url: 'https://github.com/builderz-labs/marketing-dashboard',
    localSourcePath: 'external/marketing-open-source/builderz-labs__marketing-dashboard',
    licenseNote: 'Dashboard patterns imported as reference only; keep runtime credentials and writeback disabled by default.',
  },
  {
    repo: 'proxy-intell/facebook-ads-library-mcp',
    url: 'https://github.com/proxy-intell/facebook-ads-library-mcp',
    localSourcePath: 'external/marketing-open-source/proxy-intell__facebook-ads-library-mcp',
    licenseNote: 'MCP reference for Meta Ads Library workflows; requires explicit API key gating before live use.',
  },
]

export const OPEN_SOURCE_TOOL_WORKFLOW_LABELS: Record<OpenSourceToolWorkflow, string> = {
  'strategy-audit': 'Strategy and audit playbooks',
  'lead-outreach': 'Lead discovery and outreach',
  'content-production': 'Content production',
  'analytics-ops': 'Analytics and optimization',
  'ad-intelligence': 'Ad intelligence',
  'affiliate-growth': 'Affiliate growth',
  'campaign-publishing': 'Campaign publishing',
  'ops-control': 'Agency operations control',
}

export const OPEN_SOURCE_MARKETING_TOOLS: OpenSourceMarketingTool[] = [
  {
    name: 'Marketing Tool Registry',
    sourceRepo: 'coreyhaines31/marketingskills',
    localSourcePath: 'external/marketing-open-source/coreyhaines31__marketingskills/tools/REGISTRY.md',
    workflow: 'ops-control',
    platformUse: 'Gives LegacyLegion a source-backed map of analytics, SEO, CRM, enrichment, email, ads, CRO, and CMS connector candidates.',
    integrationMode: 'connector-candidate',
    networkPolicy: 'local-archive-only',
    riskNote: 'Treat as a planning registry; do not execute upstream CLIs without per-provider env gates.',
  },
  {
    name: 'SEO Audit Skill',
    sourceRepo: 'coreyhaines31/marketingskills',
    localSourcePath: 'external/marketing-open-source/coreyhaines31__marketingskills/skills/seo-audit/SKILL.md',
    workflow: 'strategy-audit',
    platformUse: 'Strengthens client website audits with technical SEO, content, and search visibility checks.',
    integrationMode: 'playbook',
    networkPolicy: 'local-archive-only',
    riskNote: 'Use as prompt guidance until a tested audit runner exists.',
  },
  {
    name: 'AI SEO Skill',
    sourceRepo: 'coreyhaines31/marketingskills',
    localSourcePath: 'external/marketing-open-source/coreyhaines31__marketingskills/skills/ai-seo/SKILL.md',
    workflow: 'strategy-audit',
    platformUse: 'Adds AI search visibility and citation readiness to local SEO client plans.',
    integrationMode: 'playbook',
    networkPolicy: 'local-archive-only',
    riskNote: 'Requires source citation discipline before customer-facing claims.',
  },
  {
    name: 'Analytics Tracking Skill',
    sourceRepo: 'coreyhaines31/marketingskills',
    localSourcePath: 'external/marketing-open-source/coreyhaines31__marketingskills/skills/analytics-tracking/SKILL.md',
    workflow: 'analytics-ops',
    platformUse: 'Turns client measurement setup into explicit events, UTMs, conversion tracking, and QA tasks.',
    integrationMode: 'playbook',
    networkPolicy: 'local-archive-only',
    riskNote: 'Keep analytics writes behind Ryan/Douglas approval until live connector tests exist.',
  },
  {
    name: 'Ad Creative Skill',
    sourceRepo: 'coreyhaines31/marketingskills',
    localSourcePath: 'external/marketing-open-source/coreyhaines31__marketingskills/skills/ad-creative/SKILL.md',
    workflow: 'content-production',
    platformUse: 'Expands generated Google, Meta, and LinkedIn ad variants for client work orders.',
    integrationMode: 'playbook',
    networkPolicy: 'local-archive-only',
    riskNote: 'Generated claims still need compliance and client approval gates.',
  },
  {
    name: 'Referral Program Skill',
    sourceRepo: 'coreyhaines31/marketingskills',
    localSourcePath: 'external/marketing-open-source/coreyhaines31__marketingskills/skills/referral-program/SKILL.md',
    workflow: 'campaign-publishing',
    platformUse: 'Helps build client referral offers, rewards, and partner activation campaigns.',
    integrationMode: 'workflow-pattern',
    networkPolicy: 'local-archive-only',
    riskNote: 'Financial incentives require human review before launch.',
  },
  {
    name: 'Market Audit Command',
    sourceRepo: 'zubair-trabzada/ai-marketing-claude',
    localSourcePath: 'external/marketing-open-source/zubair-trabzada__ai-marketing-claude/skills/market-audit/SKILL.md',
    workflow: 'strategy-audit',
    platformUse: 'Adds a six-dimension prospect or client audit pattern: messaging, CRO, SEO, competitors, trust, and growth strategy.',
    integrationMode: 'playbook',
    networkPolicy: 'local-archive-only',
    riskNote: 'Do not run its install script; copy only reviewed prompt patterns.',
  },
  {
    name: 'Market Copy Command',
    sourceRepo: 'zubair-trabzada/ai-marketing-claude',
    localSourcePath: 'external/marketing-open-source/zubair-trabzada__ai-marketing-claude/skills/market-copy/SKILL.md',
    workflow: 'content-production',
    platformUse: 'Produces before-and-after copy recommendations for landing pages and client proposals.',
    integrationMode: 'playbook',
    networkPolicy: 'local-archive-only',
    riskNote: 'Claims and guarantees must stay inside client-approved proof.',
  },
  {
    name: 'Market Emails Command',
    sourceRepo: 'zubair-trabzada/ai-marketing-claude',
    localSourcePath: 'external/marketing-open-source/zubair-trabzada__ai-marketing-claude/skills/market-emails/SKILL.md',
    workflow: 'campaign-publishing',
    platformUse: 'Adds welcome, nurture, and launch email work-order patterns for client campaigns.',
    integrationMode: 'playbook',
    networkPolicy: 'local-archive-only',
    riskNote: 'Sending remains disabled until email provider connectors have opt-in and suppression checks.',
  },
  {
    name: 'Market Social Calendar Command',
    sourceRepo: 'zubair-trabzada/ai-marketing-claude',
    localSourcePath: 'external/marketing-open-source/zubair-trabzada__ai-marketing-claude/skills/market-social/SKILL.md',
    workflow: 'content-production',
    platformUse: 'Creates 30-day social calendars Ryan can sell and Douglas can route into execution.',
    integrationMode: 'playbook',
    networkPolicy: 'local-archive-only',
    riskNote: 'Publishing must remain a separate approval step.',
  },
  {
    name: 'Market Proposal Command',
    sourceRepo: 'zubair-trabzada/ai-marketing-claude',
    localSourcePath: 'external/marketing-open-source/zubair-trabzada__ai-marketing-claude/skills/market-proposal/SKILL.md',
    workflow: 'strategy-audit',
    platformUse: 'Turns audit findings into client-ready proposal structure for Ryan sales follow-up.',
    integrationMode: 'playbook',
    networkPolicy: 'local-archive-only',
    riskNote: 'Pricing still comes from LegacyLegion tiers, not upstream defaults.',
  },
  {
    name: 'Autonomous Lead Discovery',
    sourceRepo: 'eracle/OpenOutreach',
    localSourcePath: 'external/marketing-open-source/eracle__OpenOutreach/README.md',
    workflow: 'lead-outreach',
    platformUse: 'Provides the strongest reference pattern for AI finding, qualifying, and queuing prospects instead of waiting on manual lists.',
    integrationMode: 'workflow-pattern',
    networkPolicy: 'local-archive-only',
    riskNote: 'LinkedIn automation and scraping require legal, account-risk, and consent review before live use.',
  },
  {
    name: 'Bayesian Lead Qualification Loop',
    sourceRepo: 'eracle/OpenOutreach',
    localSourcePath: 'external/marketing-open-source/eracle__OpenOutreach/linkedin/ml',
    workflow: 'lead-outreach',
    platformUse: 'Informs a future LegacyLegion lead-ranking loop that learns from Ryan accept/reject outcomes.',
    integrationMode: 'workflow-pattern',
    networkPolicy: 'local-archive-only',
    riskNote: 'Use the concept, not GPL implementation code, unless licensing is cleared.',
  },
  {
    name: 'Stateful Outreach Task Queue',
    sourceRepo: 'eracle/OpenOutreach',
    localSourcePath: 'external/marketing-open-source/eracle__OpenOutreach/linkedin/tasks',
    workflow: 'ops-control',
    platformUse: 'Maps directly to the missing AI-led operating layer: queued tasks, rate limits, follow-ups, and status transitions.',
    integrationMode: 'workflow-pattern',
    networkPolicy: 'local-archive-only',
    riskNote: 'Must be rebuilt with LegacyLegion data models and approval gates.',
  },
  {
    name: 'AI Follow-up Agent',
    sourceRepo: 'eracle/OpenOutreach',
    localSourcePath: 'external/marketing-open-source/eracle__OpenOutreach/linkedin/agents',
    workflow: 'lead-outreach',
    platformUse: 'Provides a reference for multi-turn prospect follow-up that can escalate to Ryan.',
    integrationMode: 'workflow-pattern',
    networkPolicy: 'local-archive-only',
    riskNote: 'No autonomous sending until identity, opt-out, and human approval rules are implemented.',
  },
  {
    name: 'Gemini X Auto Poster',
    sourceRepo: 'VishwaGauravIn/twitter-auto-poster-bot-ai',
    localSourcePath: 'external/marketing-open-source/VishwaGauravIn__twitter-auto-poster-bot-ai/index.js',
    workflow: 'campaign-publishing',
    platformUse: 'Shows a minimal generate-and-post path for future X/Twitter publishing integrations.',
    integrationMode: 'connector-candidate',
    networkPolicy: 'local-archive-only',
    riskNote: 'Original script posts immediately; LegacyLegion must split draft generation from approval and publishing.',
  },
  {
    name: 'Affiliate Program Search',
    sourceRepo: 'Affitor/affiliate-skills',
    localSourcePath: 'external/marketing-open-source/Affitor__affiliate-skills/skills/research/affiliate-program-search/SKILL.md',
    workflow: 'affiliate-growth',
    platformUse: 'Adds affiliate program research for clients that can monetize content or partnerships.',
    integrationMode: 'playbook',
    networkPolicy: 'local-archive-only',
    riskNote: 'Avoid upstream API calls unless explicitly enabled and attributed.',
  },
  {
    name: 'Trending Content Scout',
    sourceRepo: 'Affitor/affiliate-skills',
    localSourcePath: 'external/marketing-open-source/Affitor__affiliate-skills/skills/research/trending-content-scout/SKILL.md',
    workflow: 'content-production',
    platformUse: 'Finds winning content formats before generating client posts or scripts.',
    integrationMode: 'playbook',
    networkPolicy: 'local-archive-only',
    riskNote: 'Requires fresh source collection before claiming trends.',
  },
  {
    name: 'Content Angle Ranker',
    sourceRepo: 'Affitor/affiliate-skills',
    localSourcePath: 'external/marketing-open-source/Affitor__affiliate-skills/skills/research/content-angle-ranker/SKILL.md',
    workflow: 'content-production',
    platformUse: 'Ranks content angles by fit, competition, and likely engagement before producing work orders.',
    integrationMode: 'playbook',
    networkPolicy: 'local-archive-only',
    riskNote: 'Ranking inputs must be transparent to avoid plausible but unsupported recommendations.',
  },
  {
    name: 'FTC Compliance Checker',
    sourceRepo: 'Affitor/affiliate-skills',
    localSourcePath: 'external/marketing-open-source/Affitor__affiliate-skills/skills/meta/compliance-checker/SKILL.md',
    workflow: 'ops-control',
    platformUse: 'Adds a compliance gate for affiliate, referral, sponsored, and review-response content.',
    integrationMode: 'playbook',
    networkPolicy: 'local-archive-only',
    riskNote: 'Compliance output is a checklist, not legal advice.',
  },
  {
    name: 'Performance Report Skill',
    sourceRepo: 'Affitor/affiliate-skills',
    localSourcePath: 'external/marketing-open-source/Affitor__affiliate-skills/skills/analytics/performance-report/SKILL.md',
    workflow: 'analytics-ops',
    platformUse: 'Creates recurring performance summaries from client campaign and content metrics.',
    integrationMode: 'playbook',
    networkPolicy: 'local-archive-only',
    riskNote: 'Must distinguish measured results from recommendations.',
  },
  {
    name: 'Agency Operations Dashboard Pattern',
    sourceRepo: 'builderz-labs/marketing-dashboard',
    localSourcePath: 'external/marketing-open-source/builderz-labs__marketing-dashboard/README.md',
    workflow: 'ops-control',
    platformUse: 'Informs Ryan/Douglas cockpits with CRM, outreach, content, analytics, automations, and approvals in one control center.',
    integrationMode: 'dashboard-pattern',
    networkPolicy: 'local-archive-only',
    riskNote: 'Do not import seeded credentials, telemetry snippets, or external writeback defaults.',
  },
  {
    name: 'Approvals Board Pattern',
    sourceRepo: 'builderz-labs/marketing-dashboard',
    localSourcePath: 'external/marketing-open-source/builderz-labs__marketing-dashboard/src/app/approvals/page.tsx',
    workflow: 'ops-control',
    platformUse: 'Maps to LegacyLegion approval/safety gates before AI-generated work is delivered or published.',
    integrationMode: 'dashboard-pattern',
    networkPolicy: 'local-archive-only',
    riskNote: 'Implement against LegacyLegion auth and work-order status rules, not copied app state.',
  },
  {
    name: 'Cron Board Pattern',
    sourceRepo: 'builderz-labs/marketing-dashboard',
    localSourcePath: 'external/marketing-open-source/builderz-labs__marketing-dashboard/src/app/cron/page.tsx',
    workflow: 'ops-control',
    platformUse: 'Informs scheduled AI agency jobs like daily digests, client health checks, and follow-up queues.',
    integrationMode: 'dashboard-pattern',
    networkPolicy: 'local-archive-only',
    riskNote: 'Scheduling writes must stay disabled until Douglas-facing controls exist.',
  },
  {
    name: 'Content Calendar Pattern',
    sourceRepo: 'builderz-labs/marketing-dashboard',
    localSourcePath: 'external/marketing-open-source/builderz-labs__marketing-dashboard/src/components/content/content-calendar.tsx',
    workflow: 'content-production',
    platformUse: 'Adds a practical UI pattern for turning generated content plans into client calendars.',
    integrationMode: 'dashboard-pattern',
    networkPolicy: 'local-archive-only',
    riskNote: 'Calendar items should reference client approvals and source work orders.',
  },
  {
    name: 'Meta Platform ID Lookup',
    sourceRepo: 'proxy-intell/facebook-ads-library-mcp',
    localSourcePath: 'external/marketing-open-source/proxy-intell__facebook-ads-library-mcp/mcp_server.py',
    workflow: 'ad-intelligence',
    platformUse: 'Finds Meta platform IDs for competitor brands before pulling active ads.',
    integrationMode: 'connector-candidate',
    networkPolicy: 'local-archive-only',
    riskNote: 'Requires ScrapeCreators credentials and explicit country/rate-limit controls before live use.',
  },
  {
    name: 'Meta Ads Retrieval',
    sourceRepo: 'proxy-intell/facebook-ads-library-mcp',
    localSourcePath: 'external/marketing-open-source/proxy-intell__facebook-ads-library-mcp/mcp_server.py',
    workflow: 'ad-intelligence',
    platformUse: 'Pulls current competitor ads for local-market strategy and ad-copy work orders.',
    integrationMode: 'connector-candidate',
    networkPolicy: 'local-archive-only',
    riskNote: 'Live calls must be cached, attributed, and bounded by API credit checks.',
  },
  {
    name: 'Ad Image Analysis',
    sourceRepo: 'proxy-intell/facebook-ads-library-mcp',
    localSourcePath: 'external/marketing-open-source/proxy-intell__facebook-ads-library-mcp/src/services/gemini_service.py',
    workflow: 'ad-intelligence',
    platformUse: 'Analyzes competitor ad images for hooks, offers, design cues, and local creative patterns.',
    integrationMode: 'connector-candidate',
    networkPolicy: 'local-archive-only',
    riskNote: 'Image/video analysis needs customer-safe storage and no raw media leakage.',
  },
  {
    name: 'Batch Video Ad Analysis',
    sourceRepo: 'proxy-intell/facebook-ads-library-mcp',
    localSourcePath: 'external/marketing-open-source/proxy-intell__facebook-ads-library-mcp/src/services/gemini_service.py',
    workflow: 'ad-intelligence',
    platformUse: 'Offers a future batch workflow for summarizing competitor video strategy efficiently.',
    integrationMode: 'connector-candidate',
    networkPolicy: 'local-archive-only',
    riskNote: 'Needs Gemini key gating and token budget limits before execution.',
  },
]
