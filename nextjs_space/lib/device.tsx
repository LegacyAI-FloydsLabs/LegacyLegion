'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react'

export type DeviceVertical = 'mobile' | 'tablet' | 'desktop'

const DEVICE_VERTICALS: DeviceVertical[] = ['mobile', 'tablet', 'desktop']

function isDeviceVertical(v: string): v is DeviceVertical {
  return DEVICE_VERTICALS.includes(v as DeviceVertical)
}

interface DeviceCtx {
  vertical: DeviceVertical
  override: DeviceVertical | null
  setOverride: (v: DeviceVertical | null) => void
  coarse: boolean
}

const STORAGE_KEY = 'legacy-legion-device-vertical-override'

const DeviceContext = createContext<DeviceCtx>({
  vertical: 'desktop',
  override: null,
  setOverride: () => {},
  coarse: false,
})

function readOverride(): DeviceVertical | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (raw && isDeviceVertical(raw)) return raw
  return null
}

function writeOverride(v: DeviceVertical | null) {
  if (typeof window === 'undefined') return
  if (v === null) window.localStorage.removeItem(STORAGE_KEY)
  else window.localStorage.setItem(STORAGE_KEY, v)
}

function isCoarsePointer(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(pointer: coarse)').matches
}

function hasHover(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(hover: hover)').matches
}

function isTouchPrimary(): boolean {
  if (typeof window === 'undefined') return false
  return isCoarsePointer() && !hasHover()
}

function isIPadShim(): boolean {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent.toLowerCase()
  const maxTouch = window.navigator.maxTouchPoints
  const platform = (window.navigator as any).platform ?? ''
  const isAppleDesktopUA = ua.includes('macintosh') || platform.toLowerCase().includes('mac')
  return isAppleDesktopUA && maxTouch > 1 && !ua.includes('iphone')
}

function classify(smallestViewportPx: number): DeviceVertical {
  if (typeof window === 'undefined') return 'desktop'

  const finePointer = window.matchMedia('(pointer: fine)').matches
  const hover = hasHover()

  // 1. Fine pointer + hover => DESKTOP (even if touch present)
  if (finePointer && hover) return 'desktop'

  // 2. Touch-primary (coarse, no hover) => phone or tablet
  if (isTouchPrimary()) {
    // iPad shim: reports macOS + multi-touch
    if (isIPadShim()) return 'tablet'
    if (smallestViewportPx < 640) return 'mobile'
    return 'tablet'
  }

  // 3. Fallback / ambiguous: use viewport as tiebreaker only
  if (smallestViewportPx < 640) return 'mobile'
  if (smallestViewportPx < 1024) return 'tablet'
  return 'desktop'
}

// A tiny store so useSyncExternalStore can subscribe to resize changes.
type Listener = () => void
const listeners = new Set<Listener>()
let cachedVertical: DeviceVertical | null = null

function getSnapshot(): DeviceVertical {
  if (typeof window === 'undefined') return 'desktop'
  const smallest = Math.min(window.innerWidth, window.innerHeight)
  return classify(smallest)
}

const serverVertical: DeviceVertical = 'desktop'

function subscribe(listener: Listener) {
  listeners.add(listener)
  const onResize = () => {
    const next = getSnapshot()
    if (next !== cachedVertical) {
      cachedVertical = next
      listeners.forEach((l) => l())
    }
  }
  // Re-evaluate on orientation/resize with a simple debounce.
  let timeout: ReturnType<typeof setTimeout> | null = null
  const debounced = () => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(onResize, 150)
  }
  window.addEventListener('resize', debounced)
  window.addEventListener('orientationchange', debounced)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('resize', debounced)
    window.removeEventListener('orientationchange', debounced)
    if (timeout) clearTimeout(timeout)
  }
}

export function DeviceProvider({ children }: { children: React.ReactNode }) {
  const [override, setOverrideState] = useState<DeviceVertical | null>(null)

  useEffect(() => {
    setOverrideState(readOverride())
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setOverrideState(readOverride())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setOverride = useCallback((v: DeviceVertical | null) => {
    setOverrideState(v)
    writeOverride(v)
  }, [])

  const classified = useSyncExternalStore<DeviceVertical>(subscribe, getSnapshot, () => serverVertical)
  const vertical: DeviceVertical = override ?? classified

  const coarse = useMemo(() => {
    if (typeof window === 'undefined') return false
    return isCoarsePointer()
  }, [])

  return (
    <DeviceContext.Provider value={{ vertical, override, setOverride, coarse }}>
      {children}
    </DeviceContext.Provider>
  )
}

export function useDevice(): DeviceCtx {
  return useContext(DeviceContext)
}

export function useIsMobile(): boolean {
  return useDevice().vertical === 'mobile'
}

export function useIsTablet(): boolean {
  return useDevice().vertical === 'tablet'
}

export function useIsDesktop(): boolean {
  return useDevice().vertical === 'desktop'
}
