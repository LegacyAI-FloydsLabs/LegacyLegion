export const INDUSTRIES = [
  { value: 'HVAC', label: 'HVAC' },
  { value: 'PLUMBING', label: 'Plumbing' },
  { value: 'LEGAL', label: 'Legal / Law Firm' },
  { value: 'DENTAL', label: 'Dental / Medical Practice' },
  { value: 'ROOFING', label: 'Roofing' },
  { value: 'OTHER', label: 'Other Service Business' },
] as const

export const REVENUE_RANGES = [
  { value: '<500K', label: 'Under $500K' },
  { value: '500K-1M', label: '$500K – $1M' },
  { value: '1M-5M', label: '$1M – $5M' },
  { value: '5M-20M', label: '$5M – $20M' },
  { value: '20M+', label: '$20M+' },
] as const

export const MARKETING_SPEND = [
  { value: '<500', label: 'Under $500/mo' },
  { value: '500-2000', label: '$500 – $2,000/mo' },
  { value: '2000-5000', label: '$2,000 – $5,000/mo' },
  { value: '5000-10000', label: '$5,000 – $10,000/mo' },
  { value: '10000+', label: '$10,000+/mo' },
] as const

export const EMPLOYEE_COUNT = [
  { value: '1-4', label: '1 – 4' },
  { value: '5-15', label: '5 – 15' },
  { value: '16-50', label: '16 – 50' },
  { value: '51-150', label: '51 – 150' },
  { value: '150+', label: '150+' },
] as const

export const PIPELINE_STAGES = [
  { value: 'NEW', label: 'New', color: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  { value: 'CONTACTED', label: 'Contacted', color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' },
  { value: 'DISCOVERY', label: 'Discovery Call', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  { value: 'PROPOSAL', label: 'Proposal', color: 'bg-violet-500/15 text-violet-300 border-violet-500/30' },
  { value: 'NEGOTIATION', label: 'Negotiation', color: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30' },
  { value: 'WON', label: 'Won', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  { value: 'LOST', label: 'Lost', color: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
] as const

export const LEAD_SOURCES = [
  { value: 'WEB_FORM', label: 'Web Form' },
  { value: 'CHAT_WIDGET', label: 'Chat Widget' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'MANUAL', label: 'Manual Entry' },
  { value: 'CSV_IMPORT', label: 'CSV Import' },
  { value: 'LINKEDIN', label: 'LinkedIn Outreach' },
] as const

export const PRICING_TIERS = [
  { value: 'LAUNCH_PAD', label: 'Launch Pad', mrr: 750 },
  { value: 'GROWTH_ENGINE', label: 'Growth Engine', mrr: 2000 },
  { value: 'MARKET_DOMINATOR', label: 'Market Dominator', mrr: 4000 },
] as const

export const PARTNER_TIERS = [
  { value: 'BRONZE', label: 'Bronze', commission: '5%', oneTime: 500 },
  { value: 'SILVER', label: 'Silver', commission: '7.5%', oneTime: 1000 },
  { value: 'GOLD', label: 'Gold', commission: '10%', oneTime: 2000 },
] as const

export const PARTNER_CATEGORIES = [
  { value: 'INSURANCE', label: 'Insurance Agent' },
  { value: 'ACCOUNTANT', label: 'Accountant / CPA' },
  { value: 'CONSULTANT', label: 'Consultant' },
  { value: 'EXISTING_CLIENT', label: 'Existing Client' },
  { value: 'OTHER', label: 'Other' },
] as const

export function stageColor(status: string | null | undefined): string {
  const s = PIPELINE_STAGES.find(x => x.value === status)
  return s?.color ?? 'bg-muted text-muted-foreground border-border'
}

export function stageLabel(status: string | null | undefined): string {
  const s = PIPELINE_STAGES.find(x => x.value === status)
  return s?.label ?? String(status ?? 'Unknown')
}

export function industryLabel(value: string | null | undefined): string {
  return INDUSTRIES.find(x => x.value === value)?.label ?? String(value ?? 'Other')
}

export function sourceLabel(value: string | null | undefined): string {
  return LEAD_SOURCES.find(x => x.value === value)?.label ?? String(value ?? '—')
}
