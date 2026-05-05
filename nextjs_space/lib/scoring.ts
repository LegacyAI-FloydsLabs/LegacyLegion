// Lead scoring engine — produces 0-100 score and breakdown
// Aligns with MQL/SQL definitions in legacyai_lead_capture_strategy.md

export interface ScoreInput {
  industry?: string | null
  revenueRange?: string | null
  currentMarketingSpend?: string | null
  employeeCount?: string | null
  source?: string | null
  biggestPainPoint?: string | null
  currentProvider?: string | null
  state?: string | null
  city?: string | null
}

export interface ScoreBreakdown {
  industryFit: number
  revenueFit: number
  spendFit: number
  sizeFit: number
  sourceQuality: number
  geoFit: number
  engagement: number
  total: number
  qualification: 'MQL' | 'SQL' | 'DISQUALIFIED'
  reasons: string[]
}

const FIT_INDUSTRIES = ['HVAC', 'PLUMBING', 'LEGAL', 'DENTAL', 'ROOFING']

export function scoreLead(input: ScoreInput): ScoreBreakdown {
  const reasons: string[] = []

  // 1. Industry fit (max 20)
  let industryFit = 0
  if (input?.industry && FIT_INDUSTRIES.includes(input.industry)) {
    industryFit = 20
    reasons.push(`Target industry: ${input.industry}`)
  } else if (input?.industry === 'OTHER') {
    industryFit = 8
  }

  // 2. Revenue fit (max 20) — sweet spot is $1M-$5M, $5M-$20M
  let revenueFit = 0
  switch (input?.revenueRange) {
    case '1M-5M': revenueFit = 20; reasons.push('Revenue in core sweet spot ($1M-$5M)'); break
    case '5M-20M': revenueFit = 18; reasons.push('Revenue in scale range ($5M-$20M)'); break
    case '500K-1M': revenueFit = 12; break
    case '20M+': revenueFit = 10; reasons.push('Revenue above target — likely needs enterprise'); break
    case '<500K': revenueFit = 4; reasons.push('Revenue below MQL threshold'); break
  }

  // 3. Marketing spend (max 18) — current spend signals budget capacity
  let spendFit = 0
  switch (input?.currentMarketingSpend) {
    case '5000-10000': spendFit = 18; reasons.push('Strong existing marketing budget'); break
    case '10000+': spendFit = 16; reasons.push('Large marketing budget — competitive deal'); break
    case '2000-5000': spendFit = 14; reasons.push('Healthy marketing budget'); break
    case '500-2000': spendFit = 8; break
    case '<500': spendFit = 3; break
  }

  // 4. Company size (max 12)
  let sizeFit = 0
  switch (input?.employeeCount) {
    case '5-15': sizeFit = 12; break
    case '16-50': sizeFit = 11; break
    case '51-150': sizeFit = 9; break
    case '1-4': sizeFit = 5; break
    case '150+': sizeFit = 6; break
  }

  // 5. Source quality (max 15)
  let sourceQuality = 0
  switch (input?.source) {
    case 'REFERRAL': sourceQuality = 15; reasons.push('Referral source — highest quality channel'); break
    case 'WEB_FORM': sourceQuality = 11; break
    case 'CHAT_WIDGET': sourceQuality = 10; break
    case 'LINKEDIN': sourceQuality = 8; break
    case 'MANUAL': sourceQuality = 7; break
    case 'CSV_IMPORT': sourceQuality = 5; break
  }

  // 6. Geography fit (max 10) — Indiana priority, Midwest second
  let geoFit = 0
  const state = (input?.state ?? '').toUpperCase()
  if (state === 'IN' || state === 'INDIANA') {
    geoFit = 10
    reasons.push('Indiana — top priority geography')
  } else if (['IL', 'OH', 'KY', 'MI', 'WI', 'MO'].includes(state)) {
    geoFit = 7
    reasons.push('Midwest — secondary priority')
  } else if (state) {
    geoFit = 4
  }

  // 7. Engagement signals (max 5)
  let engagement = 0
  if (input?.biggestPainPoint && input.biggestPainPoint.length > 20) {
    engagement += 3
    reasons.push('Articulated specific pain point')
  }
  if (input?.currentProvider && input.currentProvider.length > 0) {
    engagement += 2
    reasons.push('Aware of competition / has incumbent')
  }

  const total = Math.min(
    100,
    industryFit + revenueFit + spendFit + sizeFit + sourceQuality + geoFit + engagement
  )

  let qualification: 'MQL' | 'SQL' | 'DISQUALIFIED'
  if (total >= 70) qualification = 'SQL'
  else if (total >= 45) qualification = 'MQL'
  else qualification = 'DISQUALIFIED'

  return {
    industryFit,
    revenueFit,
    spendFit,
    sizeFit,
    sourceQuality,
    geoFit,
    engagement,
    total,
    qualification,
    reasons,
  }
}

export function suggestTier(input: ScoreInput): string {
  const rev = input?.revenueRange
  const spend = input?.currentMarketingSpend
  if (rev === '5M-20M' || rev === '20M+' || spend === '10000+') return 'MARKET_DOMINATOR'
  if (rev === '1M-5M' || spend === '5000-10000' || spend === '2000-5000') return 'GROWTH_ENGINE'
  return 'LAUNCH_PAD'
}

export function tierMRR(tier: string | null | undefined): number {
  if (tier === 'MARKET_DOMINATOR') return 4000
  if (tier === 'GROWTH_ENGINE') return 2000
  if (tier === 'LAUNCH_PAD') return 750
  return 0
}
