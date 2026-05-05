import { SignupForm } from './signup-form'
import { AuthLayout } from '@/components/layouts/auth-layout'
import { Logo } from '@/components/brand/logo'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex justify-center pt-8">
        <Link href="/"><Logo size="lg" /></Link>
      </div>
      <div className="flex-1">
        <AuthLayout title="Create Team Account" description="Internal access for the LegacyAI team">
          <SignupForm />
          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline">Sign in</Link>
          </div>
        </AuthLayout>
      </div>
    </div>
  )
}
