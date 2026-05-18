import { LoginForm } from './login-form'
import { AuthLayout } from '@/components/layouts/auth-layout'
import { Logo } from '@/components/brand/logo'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <div className="flex justify-center pt-8">
        <Link href="/"><Logo size="lg" /></Link>
      </div>
      <div className="flex-1">
        <AuthLayout title="Team Sign In" description="Sign in to the LegacyLegion command center">
          <LoginForm />
          <div className="mt-6 rounded-lg border border-border bg-card/50 p-3 text-center text-sm text-muted-foreground">
            Team-only dogfood mode is active. Douglas controls account access; public signup, partner login, and client self-service entry points are hidden.
          </div>
        </AuthLayout>
      </div>
    </main>
  )
}
