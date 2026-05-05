'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type WorkspaceMode = 'sales' | 'agency'

interface ModeCtx {
  mode: WorkspaceMode
  setMode: (m: WorkspaceMode) => void
}

const ModeContext = createContext<ModeCtx>({ mode: 'sales', setMode: () => {} })

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<WorkspaceMode>('sales')

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('legacylegion.mode')
      if (stored === 'agency' || stored === 'sales') setModeState(stored)
    } catch { /* noop */ }
  }, [])

  const setMode = (m: WorkspaceMode) => {
    setModeState(m)
    try { window.localStorage.setItem('legacylegion.mode', m) } catch { /* noop */ }
  }

  return <ModeContext.Provider value={{ mode, setMode }}>{children}</ModeContext.Provider>
}

export function useMode() {
  return useContext(ModeContext)
}
