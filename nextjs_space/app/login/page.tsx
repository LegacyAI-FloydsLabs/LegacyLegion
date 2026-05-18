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
          <div className="mt-6 text-center text-sm text-muted-foreground">
            New to the team?{' '}
            <Link href="/signup" className="text-primary hover:underline">Create an account</Link>
          </div>
          <div className="mt-2 text-center text-xs text-muted-foreground">
            Are you a referral partner?{' '}
            <Link href="/partner/login" className="text-primary hover:underline">Partner login</Link>
          </div>
        </AuthLayout>
      </div>
    </main>
  )
}
