import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type PermissionDeniedProps = {
  title?: string
  description?: string
}

export function PermissionDenied({
  title = 'Permission denied',
  description = 'This area is restricted to Douglas-level SUPERADMIN operations.',
}: PermissionDeniedProps) {
  return (
    <Card className="mx-auto max-w-xl p-8 text-center">
      <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-amber-300" />
      <h1 className="font-display text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <div className="mt-6">
        <Link href="/app">
          <Button variant="outline">Return to command center</Button>
        </Link>
      </div>
    </Card>
  )
}
