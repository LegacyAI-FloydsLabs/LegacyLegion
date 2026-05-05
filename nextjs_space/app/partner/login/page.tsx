import { PartnerLoginForm } from './partner-login-form'
import { AuthLayout } from '@/components/layouts/auth-layout'
import { Logo } from '@/components/brand/logo'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function PartnerLoginPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex justify-center pt-8">
        <Link href="/"><Logo size="lg" /></Link>
      </div>
      <div className="flex-1">
        <AuthLayout title="Partner Portal" description="Submit referrals & track commissions">
          <PartnerLoginForm />
          <div className="mt-6 text-center text-sm text-muted-foreground">
            New referral partner?{' '}
            <Link href="/partner/signup" className="text-primary hover:underline">Apply to join</Link>
          </div>
          <div className="mt-2 text-center text-xs text-muted-foreground">
            <Link href="/login" className="hover:underline">Team login →</Link>
          </div>
        </AuthLayout>
      </div>
    </div>
  )
}
