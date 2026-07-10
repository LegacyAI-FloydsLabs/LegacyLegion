'use client'

import { Moon, Sun, Monitor, Check, Palette } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useLegacyLegionTheme } from '@/components/theme-provider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { THEME_PALETTES, type ColorTheme } from '@/lib/themes'

const MODES = [
  { id: 'light' as const, label: 'Light', icon: Sun },
  { id: 'dark' as const, label: 'Dark', icon: Moon },
  { id: 'system' as const, label: 'System', icon: Monitor },
]

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { colorTheme, setColorTheme } = useLegacyLegionTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open theme menu">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Mode</DropdownMenuLabel>
        {MODES.map((mode) => {
          const Icon = mode.icon
          const active = theme === mode.id || (theme === 'system' && mode.id === 'system')
          return (
            <DropdownMenuItem
              key={mode.id}
              onClick={() => setTheme(mode.id)}
              className="flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {mode.label}
              </span>
              {active && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          )
        })}

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="flex items-center gap-2">
          <Palette className="h-3 w-3" />
          Color theme
        </DropdownMenuLabel>
        {THEME_PALETTES.map((palette) => {
          const active = colorTheme === palette.id
          return (
            <DropdownMenuItem
              key={palette.id}
              onClick={() => setColorTheme(palette.id)}
              className="flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-full border"
                  style={{
                    backgroundColor: `hsl(${palette.dark.primary})`,
                    borderColor: `hsl(${palette.dark.border})`,
                  }}
                />
                {palette.name}
              </span>
              {active && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function ThemeSwatch({ id }: { id: ColorTheme }) {
  const palette = THEME_PALETTES.find((t) => t.id === id)
  if (!palette) return null
  return (
    <span
      className="inline-block h-3 w-3 rounded-full border"
      style={{
        backgroundColor: `hsl(${palette.dark.primary})`,
        borderColor: `hsl(${palette.dark.border})`,
      }}
    />
  )
}
