import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { isPartnerRole } from '@/lib/authz';
import { PartnerShell } from './_components/partner-shell';

export const dynamic = 'force-dynamic';

export default async function PartnerPortalLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isPartnerRole(session.user.role)) {
    redirect('/partner/login');
  }
  return <PartnerShell>{children}</PartnerShell>;
}
