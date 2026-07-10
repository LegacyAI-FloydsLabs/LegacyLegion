"use client";

import * as React from "react";
import {
  ThemeProvider as NextThemesProvider,
  useTheme as useNextTheme,
} from "next-themes";
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  type ColorTheme,
  isValidColorTheme,
  getThemePalette,
} from "@/lib/themes";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextValue {
  colorTheme: ColorTheme;
  setColorTheme: (theme: ColorTheme) => void;
  palette: ReturnType<typeof getThemePalette>;
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

export function useLegacyLegionTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useLegacyLegionTheme must be used within ThemeProvider");
  }
  return ctx;
}

type LegacyThemeProviderProps = React.ComponentPropsWithoutRef<typeof NextThemesProvider> & {
  defaultColorTheme?: ColorTheme;
};

function ThemeApplier({
  defaultColorTheme = DEFAULT_THEME,
  children,
}: {
  defaultColorTheme?: ColorTheme;
  children: React.ReactNode;
}) {
  const { resolvedTheme } = useNextTheme();
  const [colorTheme, setColorThemeState] = React.useState<ColorTheme>(defaultColorTheme);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved && isValidColorTheme(saved)) {
      setColorThemeState(saved);
    } else {
      document.documentElement.setAttribute("data-theme", defaultColorTheme);
    }
  }, [defaultColorTheme]);

  const setColorTheme = React.useCallback((next: ColorTheme) => {
    setColorThemeState(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
    document.documentElement.setAttribute("data-theme", next);
  }, []);

  React.useEffect(() => {
    if (mounted) {
      document.documentElement.setAttribute("data-theme", colorTheme);
    }
  }, [colorTheme, mounted]);

  const palette = React.useMemo(() => getThemePalette(colorTheme), [colorTheme]);

  const ctx = React.useMemo<ThemeContextValue>(
    () => ({
      colorTheme,
      setColorTheme,
      palette,
    }),
    [colorTheme, setColorTheme, palette]
  );

  return (
    <ThemeContext.Provider value={ctx}>
      {children}
    </ThemeContext.Provider>
  );
}

export function ThemeProvider({
  children,
  defaultColorTheme = DEFAULT_THEME,
  ...props
}: LegacyThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      <ThemeApplier defaultColorTheme={defaultColorTheme}>
        {children}
      </ThemeApplier>
    </NextThemesProvider>
  );
}
