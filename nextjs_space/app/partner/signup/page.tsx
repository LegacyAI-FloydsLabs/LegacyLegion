import { PartnerSignupForm } from './partner-signup-form'
import { AuthLayout } from '@/components/layouts/auth-layout'
import { Logo } from '@/components/brand/logo'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function PartnerSignupPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex justify-center pt-8">
        <Link href="/"><Logo size="lg" /></Link>
      </div>
      <div className="flex-1">
        <AuthLayout title="Apply to Partner Program" description="Earn 5–10% recurring commissions on referred clients">
          <PartnerSignupForm />
          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already a partner?{' '}
            <Link href="/partner/login" className="text-primary hover:underline">Sign in</Link>
          </div>
        </AuthLayout>
      </div>
    </div>
  )
}
