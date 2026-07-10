'use client'

import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { ChunkLoadErrorHandler } from '@/components/chunk-load-error-handler'
import { ModeProvider } from '@/lib/mode'
import { DeviceProvider } from '@/lib/device'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange defaultColorTheme="midnight-galaxy">
        <ModeProvider>
          <DeviceProvider>
            {children}
          </DeviceProvider>
        </ModeProvider>
        <Toaster />
        <ChunkLoadErrorHandler />
      </ThemeProvider>
    </SessionProvider>
  )
}
