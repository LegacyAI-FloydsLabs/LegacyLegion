'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PARTNER_CATEGORIES } from '@/lib/types'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export function PartnerSignupForm() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '', company: '', category: 'INSURANCE',
  })
  const [loading, setLoading] = useState(false)

  function up(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })) }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/partner/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error ?? 'Failed to create partner account')
        setLoading(false)
        return
      }
      await signIn('credentials', { email: form.email, password: form.password, redirect: false })
      toast.success(`Welcome aboard. Your partner code is ${data?.partnerCode ?? ''}`)
      router.replace('/partner')
    } catch {
      toast.error('Failed to create account')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label htmlFor="partner-full-name">Full name</Label><Input id="partner-full-name" required value={form.name} onChange={(e) => up('name', e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="partner-company">Company</Label><Input id="partner-company" value={form.company} onChange={(e) => up('company', e.target.value)} /></div>
      </div>
      <div className="space-y-1.5"><Label htmlFor="partner-email">Email</Label><Input id="partner-email" type="email" required value={form.email} onChange={(e) => up('email', e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label htmlFor="partner-phone">Phone</Label><Input id="partner-phone" value={form.phone} onChange={(e) => up('phone', e.target.value)} /></div>
        <div className="space-y-1.5">
          <Label htmlFor="partner-category">Category</Label>
          <Select value={form.category} onValueChange={(v) => up('category', v)}>
            <SelectTrigger id="partner-category" aria-label="Category"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PARTNER_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5"><Label htmlFor="partner-password">Password</Label><Input id="partner-password" type="password" required minLength={6} value={form.password} onChange={(e) => up('password', e.target.value)} /></div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
      </Button>
    </form>
  )
}
