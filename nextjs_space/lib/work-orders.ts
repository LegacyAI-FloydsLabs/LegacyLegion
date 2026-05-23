export const WORK_ORDER_STATUSES = ['DRAFT', 'IN_PROGRESS', 'REVIEW', 'DELIVERED', 'ARCHIVED'] as const
export const WORK_ORDER_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const
export const WORK_ORDER_OWNER_KINDS = ['DOUGLAS', 'RYAN', 'AI_PERSONA'] as const
export const WORK_ORDER_APPROVAL_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'NOT_REQUIRED'] as const

export type WorkOrderStatus = typeof WORK_ORDER_STATUSES[number]
export type WorkOrderPriority = typeof WORK_ORDER_PRIORITIES[number]
export type WorkOrderOwnerKind = typeof WORK_ORDER_OWNER_KINDS[number]
export type WorkOrderApprovalStatus = typeof WORK_ORDER_APPROVAL_STATUSES[number]

export type BetaWorkOrderTemplate = {
  type: string
  label: string
  description: string
  defaultOwnerKind: WorkOrderOwnerKind
  defaultPriority: WorkOrderPriority
  approvalRequired: boolean
  aiInstructions: string
  requiredEvidence: string[]
}

export const BETA_WORK_ORDER_TEMPLATES: BetaWorkOrderTemplate[] = [
  {
    type: 'GBP_AUDIT',
    label: 'Google Business Profile Audit',
    description: 'Audit GBP completeness, trust proof, categories, services, photos, posts, Q&A, and conversion readiness.',
    defaultOwnerKind: 'AI_PERSONA',
    defaultPriority: 'HIGH',
    approvalRequired: true,
    requiredEvidence: ['GBP URL', 'current categories', 'review count/rating', 'service areas', 'primary conversion action'],
    aiInstructions: 'Produce a GBP audit with completeness score, missing fields, category/service recommendations, review-response risks, and next actions for Douglas and Ryan.',
  },
  {
    type: 'GBP_CATEGORY_SERVICES',
    label: 'GBP Category / Services Optimization',
    description: 'Choose primary/secondary categories and services to improve local-pack relevance without overclaiming.',
    defaultOwnerKind: 'AI_PERSONA',
    defaultPriority: 'HIGH',
    approvalRequired: true,
    requiredEvidence: ['GBP URL', 'current category list', 'service list', 'target cities', 'highest-margin services'],
    aiInstructions: 'Recommend primary category, secondary categories, services, service descriptions, and approval-safe change order.',
  },
  {
    type: 'GBP_REVIEW_RESPONSE',
    label: 'GBP Review Response',
    description: 'Draft public review replies and private follow-up scripts.',
    defaultOwnerKind: 'AI_PERSONA',
    defaultPriority: 'MEDIUM',
    approvalRequired: true,
    requiredEvidence: ['review text', 'rating', 'customer context if known', 'whether service recovery is needed'],
    aiInstructions: 'Classify sentiment/risk, draft a concise public response, draft optional private outreach, and flag approval risks.',
  },
  {
    type: 'GBP_REVIEW_REQUEST',
    label: 'GBP Review Request Campaign',
    description: 'Create compliant scripts and timing for requesting customer reviews.',
    defaultOwnerKind: 'RYAN',
    defaultPriority: 'HIGH',
    approvalRequired: true,
    requiredEvidence: ['completed job type', 'customer touchpoint', 'preferred channel', 'review link availability'],
    aiInstructions: 'Create SMS/email/call review-request scripts, timing, exclusion rules, and follow-up limits.',
  },
  {
    type: 'WEBSITE_SEO_AUDIT',
    label: 'Website SEO Audit',
    description: 'Audit technical SEO, on-page structure, local relevance, conversion CTAs, and trust proof.',
    defaultOwnerKind: 'AI_PERSONA',
    defaultPriority: 'HIGH',
    approvalRequired: true,
    requiredEvidence: ['website URL', 'top services', 'service areas', 'conversion goal', 'known competitors if provided'],
    aiInstructions: 'Produce a local-service SEO audit with technical, content, local, trust, conversion, and 14-day priority sections.',
  },
  {
    type: 'LOCAL_SERVICE_AREA_PAGE_PLAN',
    label: 'Local Service-Area Page Plan',
    description: 'Plan service/city pages that match real services and avoid doorway-page spam.',
    defaultOwnerKind: 'AI_PERSONA',
    defaultPriority: 'MEDIUM',
    approvalRequired: true,
    requiredEvidence: ['service', 'city/area', 'proof of service area', 'unique local proof', 'CTA'],
    aiInstructions: 'Create URL/title/meta/H1/H2 outline, local proof requirements, FAQ, internal links, schema notes, and approval gate.',
  },
  {
    type: 'COMPETITOR_SNAPSHOT',
    label: 'Competitor Snapshot',
    description: 'Summarize observed competitor positioning and opportunities without inventing private metrics.',
    defaultOwnerKind: 'AI_PERSONA',
    defaultPriority: 'MEDIUM',
    approvalRequired: false,
    requiredEvidence: ['target service', 'target city', 'public competitor URLs or observed search results'],
    aiInstructions: 'Compare public positioning, trust proof, content depth, CTAs, GBP signals if observed, and practical counter-moves.',
  },
  {
    type: 'SOCIAL_CONTENT_CALENDAR',
    label: 'Social Content Calendar',
    description: 'Create an approval-ready social calendar from real services, proof, FAQs, and seasonality.',
    defaultOwnerKind: 'AI_PERSONA',
    defaultPriority: 'MEDIUM',
    approvalRequired: true,
    requiredEvidence: ['target platform', 'service focus', 'available photos/proof', 'posting cadence', 'offer/CTA'],
    aiInstructions: 'Create a dated content calendar with post concepts, captions, asset needs, approval state, and no unsupported claims.',
  },
  {
    type: 'LEAD_RESPONSE_SCRIPT',
    label: 'Lead Response Script',
    description: 'Give Ryan/Douglas fast call, voicemail, SMS, and email scripts for lead follow-up.',
    defaultOwnerKind: 'RYAN',
    defaultPriority: 'HIGH',
    approvalRequired: false,
    requiredEvidence: ['lead source', 'service need', 'urgency', 'contact channel', 'next desired action'],
    aiInstructions: 'Create first-touch call script, voicemail, SMS, email, objection handling, and CRM notes template.',
  },
  {
    type: 'WEEKLY_CLIENT_REPORT',
    label: 'Weekly Client Report',
    description: 'Prepare an evidence-backed client update from completed work, blockers, metrics, and next actions.',
    defaultOwnerKind: 'DOUGLAS',
    defaultPriority: 'MEDIUM',
    approvalRequired: true,
    requiredEvidence: ['completed work orders', 'lead activity', 'GBP actions', 'website/social actions', 'blocked access', 'next priorities'],
    aiInstructions: 'Create concise client-facing report with completed work, evidence, results, blockers, next week, and no internal secrets.',
  },
  {
    type: 'REFERRAL_PARTNER_PROSPECTING',
    label: 'Referral Partner Prospecting',
    description: 'Build a referral prospect list and outreach angle for realtors, agents, partners, or local businesses.',
    defaultOwnerKind: 'RYAN',
    defaultPriority: 'MEDIUM',
    approvalRequired: true,
    requiredEvidence: ['target partner type', 'city/area', 'client offer', 'qualification criteria', 'outreach channel'],
    aiInstructions: 'Define prospect criteria, list-building fields, qualification rubric, outreach sequence, and Ryan follow-up steps.',
  },
  {
    type: 'REPUTATION_TRUST_PROOF_AUDIT',
    label: 'Reputation / Trust Proof Audit',
    description: 'Audit reviews, testimonials, badges, before/after proof, warranties, and credibility signals.',
    defaultOwnerKind: 'AI_PERSONA',
    defaultPriority: 'HIGH',
    approvalRequired: true,
    requiredEvidence: ['website URL', 'GBP/review source', 'testimonial source', 'certifications', 'before/after proof if available'],
    aiInstructions: 'Identify missing trust proof, risky claims, review opportunities, testimonial reuse options, and proof-gathering work orders.',
  },
]

const TEMPLATE_MAP = new Map(BETA_WORK_ORDER_TEMPLATES.map((template) => [template.type, template]))

export function betaWorkOrderTemplate(type: string): BetaWorkOrderTemplate | null {
  return TEMPLATE_MAP.get(type.toUpperCase()) ?? null
}

export function normalizeEnum<T extends readonly string[]>(value: unknown, allowed: T, fallback: T[number]): T[number] {
  const candidate = String(value ?? '').trim().toUpperCase()
  return (allowed as readonly string[]).includes(candidate) ? candidate as T[number] : fallback
}

export function sanitizeText(value: unknown, maxLength: number): string | null {
  const text = String(value ?? '').trim()
  if (!text) return null
  return text.length > maxLength ? text.slice(0, maxLength) : text
}

export function sanitizeEvidenceLinks(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : String(value ?? '').split(/\n|,/)
  const output: string[] = []
  for (const item of raw) {
    const text = String(item ?? '').trim()
    if (!text) continue
    if (output.length >= 20) break
    output.push(text.length > 500 ? text.slice(0, 500) : text)
  }
  return output
}

export function defaultApprovalStatus(type: string, requested: unknown): WorkOrderApprovalStatus {
  const explicit = String(requested ?? '').trim()
  if (explicit) return normalizeEnum(explicit, WORK_ORDER_APPROVAL_STATUSES, 'PENDING')
  const template = betaWorkOrderTemplate(type)
  return template?.approvalRequired === false ? 'NOT_REQUIRED' : 'PENDING'
}
