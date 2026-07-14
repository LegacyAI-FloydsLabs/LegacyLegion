import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { hashIdentifier, logServerEvent } from '@/lib/diagnostics'
import { disableRole, isDisabledRole, TEAM_ROLE } from '@/lib/roles'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim() ?? ''
        if (!email || !credentials?.password) {
          logServerEvent('auth.credentials.rejected', { reason: 'missing_credentials' })
          return null
        }
        const user = await prisma.user.findUnique({
          where: { email },
        })
        if (!user) {
          logServerEvent('auth.credentials.rejected', { reason: 'unknown_user', emailHash: hashIdentifier(email) })
          return null
        }
        if (isDisabledRole(user.role)) {
          logServerEvent('auth.credentials.rejected', { reason: 'account_disabled', userId: user.id })
          return null
        }
        const ok = await bcrypt.compare(credentials.password, user.password)
        if (!ok) {
          logServerEvent('auth.credentials.rejected', { reason: 'bad_password', userId: user.id, role: user.role })
          return null
        }
        logServerEvent('auth.credentials.accepted', { userId: user.id, role: user.role })
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? '',
          role: user.role,
        } as any
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id
        token.role = (user as any).role
      } else if (token.id) {
        const current = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true },
        })
        token.role = current?.role ?? disableRole(TEAM_ROLE)
      }
      return token
    },
    async session({ session, token }) {
      if (session?.user) {
        ;(session.user as any).id = token.id as string
        ;(session.user as any).role = token.role as string
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
