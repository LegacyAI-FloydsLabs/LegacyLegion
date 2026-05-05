import Link from 'next/link'
import { Logo } from '@/components/brand/logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Activity, BarChart3, Bot, Building2, CheckCircle2, ChevronRight,
  Filter, Gauge, MessageSquare, ShieldCheck, Sparkles, Target, Users, Zap,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

const FEATURES = [
  { icon: Target, title: 'Multi-Channel Lead Capture', body: 'Web forms, an embeddable AI chat widget, referral portal, CSV import, and manual entry — every channel feeds the same pipeline.' },
  { icon: Bot, title: '24/7 AI Qualification', body: 'A configurable agent endpoint qualifies leads instantly using a Pinecone knowledge base of local SEO and competitive intelligence.' },
  { icon: Gauge, title: 'Lead Scoring (0–100)', body: 'Automatic scoring on industry fit, revenue, marketing spend, geography, and source quality — aligned to MQL/SQL definitions.' },
  { icon: Filter, title: 'Visual Pipeline', body: 'Kanban view from New → Contacted → Discovery → Proposal → Negotiation → Won/Lost. Drag, drop, advance.' },
  { icon: BarChart3, title: 'Performance Analytics', body: 'Charts for leads over time, channel performance, industry breakdown, conversion funnel, and pipeline value.' },
  { icon: Users, title: 'Referral Partner Portal', body: 'A separate login for insurance agents, accountants, and existing clients to submit referrals and track commissions.' },
]

const INDUSTRIES = ['HVAC', 'Plumbing', 'Legal', 'Dental', 'Roofing']

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-[1200px] flex h-16 items-center justify-between px-4 sm:px-6">
          <Link href="/"><Logo /></Link>
          <nav className="hidden md:flex items-center gap-1">
            <Link href="#features" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Features</Link>
            <Link href="#industries" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Industries</Link>
            <Link href="#pricing" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
            <Link href="/get-started" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Get a Free Audit</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/partner/login" className="hidden sm:inline-flex">
              <Button variant="ghost" size="sm">Partner Portal</Button>
            </Link>
            <Link href="/login">
              <Button size="sm">Team Login</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden hero-gradient">
        <div className="absolute inset-0 grid-pattern opacity-30 pointer-events-none" />
        <div className="relative mx-auto max-w-[1200px] px-4 sm:px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
          <div className="flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              The AI-first lead engine for Indianapolis service businesses
            </div>
            <h1 className="mt-6 font-display text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight max-w-4xl">
              Capture, qualify, and close leads on <span className="text-gradient">autopilot</span>.
            </h1>
            <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl">
              LegacyLegion is the complete lead generation platform built by LegacyAI. Multi-channel capture, AI qualification, visual pipeline, and partner portal — in one dark, modern command center.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
              <Link href="/get-started">
                <Button size="lg" className="glow-primary">
                  Get a Free SEO Audit
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline">Team Sign In</Button>
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-4 sm:gap-12 text-sm">
              <div><div className="text-2xl font-display font-bold text-foreground">$750+</div><div className="text-muted-foreground text-xs sm:text-sm">Starting Tier</div></div>
              <div><div className="text-2xl font-display font-bold text-foreground">24/7</div><div className="text-muted-foreground text-xs sm:text-sm">AI Lead Qualification</div></div>
              <div><div className="text-2xl font-display font-bold text-foreground">M2M</div><div className="text-muted-foreground text-xs sm:text-sm">Month-to-Month</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 sm:py-24">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold">Platform</p>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl font-bold tracking-tight">Everything you need to run a lead pipeline.</h2>
            <p className="mt-4 text-muted-foreground">Replaces a half-dozen disconnected tools with one integrated stack.</p>
          </div>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <Card key={i} className="group transition-all duration-normal hover:shadow-[0_12px_36px_-8px_hsl(var(--primary)/0.35)] hover:-translate-y-0.5">
                <CardContent className="p-6">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Industries */}
      <section id="industries" className="py-20 sm:py-24 bg-card/30">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold">Verticals</p>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl font-bold tracking-tight">Built for Indianapolis service businesses.</h2>
            <p className="mt-4 text-muted-foreground">Forms, scoring, and intelligence tuned to the verticals where Ryan has scaled real revenue — not generic dashboards.</p>
            <ul className="mt-6 space-y-3">
              {[
                'Industry-specific intake forms with vertical-aware questions',
                'Pinecone-backed SEO assessment delivered with each new lead',
                'Pricing-tier suggestion based on revenue and current spend',
                'Built-in ROI calculator for prospect demos',
              ].map((p, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                  <span className="text-sm">{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {INDUSTRIES.map((ind) => (
              <Link key={ind} href={`/get-started?industry=${ind.toUpperCase()}`} className="group">
                <Card className="h-full transition-all duration-normal hover:bg-primary/5 hover:border-primary/40">
                  <CardContent className="p-5 flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">{ind}</div>
                      <div className="text-xs text-muted-foreground">Open intake →</div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 sm:py-24">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold">Pricing</p>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl font-bold tracking-tight">Three tiers. Month-to-month. You own everything.</h2>
          </div>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { name: 'Launch Pad', price: 750, target: 'Solo operators & new practices', features: ['AI-optimized website', 'Google Business Profile', '24/7 AI chat agent', 'Local SEO (5 keywords)', 'Review automation'] },
              { name: 'Growth Engine', price: 2000, target: '$1M–$5M service companies', features: ['Everything in Launch Pad', 'Google Ads management', 'Advanced local SEO (15+ kw)', 'AI lead scoring', 'Content marketing'], highlight: true },
              { name: 'Market Dominator', price: 4000, target: '$5M+ regional leaders', features: ['Everything in Growth Engine', 'Multi-location SEO', 'Custom AI agents', 'Competitive intelligence', 'Weekly executive reviews'] },
            ].map((t) => (
              <Card key={t.name} className={t.highlight ? 'border-primary/60 glow-primary' : ''}>
                <CardContent className="p-6">
                  {t.highlight && <div className="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary px-2.5 py-0.5 text-xs font-medium mb-3"><Zap className="h-3 w-3" /> Most Popular</div>}
                  <h3 className="font-display text-xl font-bold">{t.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="font-display text-4xl font-bold">${t.price.toLocaleString()}</span>
                    <span className="text-muted-foreground text-sm">/mo</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{t.target}</p>
                  <ul className="mt-5 space-y-2.5">
                    {t.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/get-started" className="mt-6 block">
                    <Button className="w-full" variant={t.highlight ? 'default' : 'outline'}>Start with {t.name}</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-card/30">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <Card className="overflow-hidden border-primary/40">
            <CardContent className="p-10 sm:p-14 hero-gradient">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">See LegacyLegion in action.</h2>
                  <p className="mt-2 text-muted-foreground max-w-xl">Submit a free SEO audit request and watch the platform qualify, score, and assess your business in real time.</p>
                </div>
                <Link href="/get-started"><Button size="lg" className="glow-primary">Get a Free Audit <ChevronRight className="ml-1 h-4 w-4" /></Button></Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-10">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Logo size="sm" />
            <span>© {new Date().getFullYear()} LegacyAI</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/get-started" className="text-muted-foreground hover:text-foreground">Free Audit</Link>
            <Link href="/partner/login" className="text-muted-foreground hover:text-foreground">Partner Portal</Link>
            <Link href="/login" className="text-muted-foreground hover:text-foreground">Team Login</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
