import Link from 'next/link'
import { Logo } from '@/components/brand/logo'
import { GetStartedForm } from './get-started-form'
import { Card, CardContent } from '@/components/ui/card'
import { Bot, Gauge, Sparkles, Target } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function GetStartedPage() {
  return (
    <main className="min-h-screen hero-gradient">
      <header className="border-b border-border/40 bg-background/40 backdrop-blur-md">
        <div className="mx-auto max-w-[1200px] flex h-16 items-center justify-between px-4 sm:px-6">
          <Link href="/"><Logo /></Link>
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">Team Login →</Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-12 grid lg:grid-cols-[1.2fr_1fr] gap-10">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Free SEO audit — powered by LegacyAI
          </div>
          <h1 className="mt-4 font-display text-4xl sm:text-5xl font-bold tracking-tight">
            Get your free <span className="text-gradient">AI audit</span>.
          </h1>
          <p className="mt-4 text-muted-foreground max-w-xl">
            Tell us about your business. Within seconds, our AI agent qualifies your fit, scores the opportunity, and pulls a custom SEO assessment from our local intelligence index.
          </p>
          <div className="mt-8 grid gap-3">
            {[
              { icon: Bot, title: 'Instant AI assessment', body: 'Tailored to your industry and city.' },
              { icon: Gauge, title: '0–80 score, in real time', body: 'See exactly where you stand against competitors.' },
              { icon: Target, title: 'Recommended tier', body: 'Launch Pad, Growth Engine, or Market Dominator.' },
            ].map((it, i) => (
              <Card key={i}>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="shrink-0 h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center">
                    <it.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium">{it.title}</div>
                    <div className="text-sm text-muted-foreground">{it.body}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card className="shadow-lg">
          <CardContent className="p-6">
            <GetStartedForm />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
