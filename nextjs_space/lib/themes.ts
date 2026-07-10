export type ColorTheme =
  | 'ocean-depths'
  | 'sunset-boulevard'
  | 'forest-canopy'
  | 'modern-minimalist'
  | 'golden-hour'
  | 'arctic-frost'
  | 'desert-rose'
  | 'tech-innovation'
  | 'botanical-garden'
  | 'midnight-galaxy';

export interface ThemePalette {
  id: ColorTheme;
  name: string;
  description: string;
  light: ThemeTokens;
  dark: ThemeTokens;
}

export interface ThemeTokens {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
  heroGradient: string;
  textGradient: string;
}

function hexToHsl(hex: string): string {
  const sanitized = hex.replace('#', '');
  const r = parseInt(sanitized.substring(0, 2), 16) / 255;
  const g = parseInt(sanitized.substring(2, 4), 16) / 255;
  const b = parseInt(sanitized.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function alpha(hex: string, a: number): string {
  return `hsl(${hexToHsl(hex)} / ${a})`;
}

function tokens(opts: {
  background: string;
  foreground: string;
  primary: string;
  secondary: string;
  muted: string;
  accent: string;
  destructive?: string;
  card?: string;
  popover?: string;
  border?: string;
  input?: string;
  heroGradient: string;
  textGradient: string;
}): ThemeTokens {
  const bg = opts.background;
  const fg = opts.foreground;
  const primary = opts.primary;
  const secondary = opts.secondary;
  const muted = opts.muted;
  const accent = opts.accent;
  return {
    background: hexToHsl(bg),
    foreground: hexToHsl(fg),
    card: hexToHsl(opts.card ?? bg),
    cardForeground: hexToHsl(fg),
    popover: hexToHsl(opts.popover ?? opts.card ?? bg),
    popoverForeground: hexToHsl(fg),
    primary: hexToHsl(primary),
    primaryForeground: hexToHsl('#ffffff'),
    secondary: hexToHsl(secondary),
    secondaryForeground: hexToHsl(fg),
    muted: hexToHsl(muted),
    mutedForeground: hexToHsl(fg),
    accent: hexToHsl(accent),
    accentForeground: hexToHsl('#ffffff'),
    destructive: hexToHsl(opts.destructive ?? '#ef4444'),
    destructiveForeground: hexToHsl('#ffffff'),
    border: hexToHsl(opts.border ?? opts.muted),
    input: hexToHsl(opts.input ?? opts.muted),
    ring: hexToHsl(primary),
    chart1: hexToHsl(primary),
    chart2: hexToHsl(accent),
    chart3: hexToHsl(secondary),
    chart4: hexToHsl(muted),
    chart5: hexToHsl(opts.destructive ?? '#ef4444'),
    heroGradient: opts.heroGradient,
    textGradient: opts.textGradient,
  };
}

export const THEME_PALETTES: ThemePalette[] = [
  {
    id: 'ocean-depths',
    name: 'Ocean Depths',
    description: 'Professional and calming maritime theme.',
    light: tokens({
      background: '#f1faee',
      foreground: '#1a2332',
      primary: '#2d8b8b',
      secondary: '#a8dadc',
      muted: '#c9e5e6',
      accent: '#1a2332',
      border: '#a8dadc',
      input: '#d9efef',
      heroGradient:
        'radial-gradient(ellipse 80% 60% at 50% -20%, hsl(180 52% 37% / 0.25), transparent), radial-gradient(ellipse 50% 40% at 85% 0%, hsl(197 30% 24% / 0.15), transparent), radial-gradient(ellipse 50% 30% at 15% 10%, hsl(170 47% 73% / 0.30), transparent)',
      textGradient: 'linear-gradient(135deg, hsl(180 52% 37%), hsl(197 30% 24%))',
    }),
    dark: tokens({
      background: '#1a2332',
      foreground: '#f1faee',
      primary: '#2d8b8b',
      secondary: '#254a4a',
      muted: '#253447',
      accent: '#a8dadc',
      border: '#2d3e52',
      input: '#223044',
      heroGradient:
        'radial-gradient(ellipse 80% 60% at 50% -20%, hsl(180 52% 37% / 0.25), transparent), radial-gradient(ellipse 50% 40% at 85% 0%, hsl(197 30% 24% / 0.30), transparent), radial-gradient(ellipse 50% 30% at 15% 10%, hsl(170 47% 73% / 0.10), transparent)',
      textGradient: 'linear-gradient(135deg, hsl(170 47% 73%), hsl(180 52% 37%))',
    }),
  },
  {
    id: 'sunset-boulevard',
    name: 'Sunset Boulevard',
    description: 'Warm and vibrant sunset colors.',
    light: tokens({
      background: '#fff8f0',
      foreground: '#264653',
      primary: '#e76f51',
      secondary: '#f4a261',
      muted: '#fae5d3',
      accent: '#264653',
      border: '#f4a261',
      input: '#fff0e0',
      heroGradient:
        'radial-gradient(ellipse 80% 60% at 50% -20%, hsl(17 78% 61% / 0.25), transparent), radial-gradient(ellipse 50% 40% at 85% 0%, hsl(28 87% 67% / 0.20), transparent), radial-gradient(ellipse 50% 30% at 15% 10%, hsl(192 39% 30% / 0.12), transparent)',
      textGradient: 'linear-gradient(135deg, hsl(17 78% 61%), hsl(28 87% 67%))',
    }),
    dark: tokens({
      background: '#264653',
      foreground: '#fff8f0',
      primary: '#e76f51',
      secondary: '#8f5636',
      muted: '#365865',
      accent: '#f4a261',
      border: '#3e6575',
      input: '#2f4f5d',
      heroGradient:
        'radial-gradient(ellipse 80% 60% at 50% -20%, hsl(17 78% 61% / 0.25), transparent), radial-gradient(ellipse 50% 40% at 85% 0%, hsl(28 87% 67% / 0.15), transparent), radial-gradient(ellipse 50% 30% at 15% 10%, hsl(192 39% 30% / 0.30), transparent)',
      textGradient: 'linear-gradient(135deg, hsl(28 87% 67%), hsl(17 78% 61%))',
    }),
  },
  {
    id: 'forest-canopy',
    name: 'Forest Canopy',
    description: 'Natural and grounded earth tones.',
    light: tokens({
      background: '#faf9f6',
      foreground: '#2d4a2b',
      primary: '#2d4a2b',
      secondary: '#a4ac86',
      muted: '#e3e6d7',
      accent: '#7d8471',
      border: '#a4ac86',
      input: '#eef0e7',
      heroGradient:
        'radial-gradient(ellipse 80% 60% at 50% -20%, hsl(116 26% 23% / 0.18), transparent), radial-gradient(ellipse 50% 40% at 85% 0%, hsl(73 11% 48% / 0.15), transparent), radial-gradient(ellipse 50% 30% at 15% 10%, hsl(80 15% 60% / 0.22), transparent)',
      textGradient: 'linear-gradient(135deg, hsl(116 26% 23%), hsl(73 11% 48%))',
    }),
    dark: tokens({
      background: '#2d4a2b',
      foreground: '#faf9f6',
      primary: '#a4ac86',
      secondary: '#4a5c33',
      muted: '#3b5739',
      accent: '#7d8471',
      border: '#4b6b42',
      input: '#355230',
      heroGradient:
        'radial-gradient(ellipse 80% 60% at 50% -20%, hsl(116 26% 23% / 0.30), transparent), radial-gradient(ellipse 50% 40% at 85% 0%, hsl(73 11% 48% / 0.12), transparent), radial-gradient(ellipse 50% 30% at 15% 10%, hsl(80 15% 60% / 0.10), transparent)',
      textGradient: 'linear-gradient(135deg, hsl(80 15% 60%), hsl(116 26% 23%))',
    }),
  },
  {
    id: 'modern-minimalist',
    name: 'Modern Minimalist',
    description: 'Clean and contemporary grayscale.',
    light: tokens({
      background: '#ffffff',
      foreground: '#36454f',
      primary: '#36454f',
      secondary: '#d3d3d3',
      muted: '#f0f0f0',
      accent: '#708090',
      border: '#d3d3d3',
      input: '#f7f7f7',
      heroGradient:
        'radial-gradient(ellipse 80% 60% at 50% -20%, hsl(200 18% 27% / 0.10), transparent), radial-gradient(ellipse 50% 40% at 85% 0%, hsl(210 11% 50% / 0.08), transparent), radial-gradient(ellipse 50% 30% at 15% 10%, hsl(0 0% 83% / 0.25), transparent)',
      textGradient: 'linear-gradient(135deg, hsl(200 18% 27%), hsl(210 11% 50%))',
    }),
    dark: tokens({
      background: '#36454f',
      foreground: '#ffffff',
      primary: '#708090',
      secondary: '#4a5a63',
      muted: '#4a5a63',
      accent: '#d3d3d3',
      border: '#4f6069',
      input: '#3f4f58',
      heroGradient:
        'radial-gradient(ellipse 80% 60% at 50% -20%, hsl(200 18% 27% / 0.30), transparent), radial-gradient(ellipse 50% 40% at 85% 0%, hsl(210 11% 50% / 0.12), transparent), radial-gradient(ellipse 50% 30% at 15% 10%, hsl(0 0% 83% / 0.10), transparent)',
      textGradient: 'linear-gradient(135deg, hsl(0 0% 83%), hsl(210 11% 50%))',
    }),
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    description: 'Rich and warm autumnal palette.',
    light: tokens({
      background: '#fffaf2',
      foreground: '#4a403a',
      primary: '#f4a900',
      secondary: '#d4b896',
      muted: '#f5e6d3',
      accent: '#c1666b',
      border: '#d4b896',
      input: '#fff3e6',
      heroGradient:
        'radial-gradient(ellipse 80% 60% at 50% -20%, hsl(42 100% 48% / 0.22), transparent), radial-gradient(ellipse 50% 40% at 85% 0%, hsl(4 42% 59% / 0.15), transparent), radial-gradient(ellipse 50% 30% at 15% 10%, hsl(30 36% 71% / 0.25), transparent)',
      textGradient: 'linear-gradient(135deg, hsl(42 100% 48%), hsl(4 42% 59%))',
    }),
    dark: tokens({
      background: '#4a403a',
      foreground: '#fffaf2',
      primary: '#f4a900',
      secondary: '#6b5a4a',
      muted: '#5c4f46',
      accent: '#c1666b',
      border: '#6b5a4a',
      input: '#52453d',
      heroGradient:
        'radial-gradient(ellipse 80% 60% at 50% -20%, hsl(42 100% 48% / 0.25), transparent), radial-gradient(ellipse 50% 40% at 85% 0%, hsl(4 42% 59% / 0.12), transparent), radial-gradient(ellipse 50% 30% at 15% 10%, hsl(30 36% 71% / 0.10), transparent)',
      textGradient: 'linear-gradient(135deg, hsl(42 100% 48%), hsl(30 36% 71%))',
    }),
  },
  {
    id: 'arctic-frost',
    name: 'Arctic Frost',
    description: 'Cool and crisp winter-inspired theme.',
    light: tokens({
      background: '#fafafa',
      foreground: '#4a6fa5',
      primary: '#4a6fa5',
      secondary: '#d4e4f7',
      muted: '#e8f0fa',
      accent: '#c0c0c0',
      border: '#d4e4f7',
      input: '#f0f6fc',
      heroGradient:
        'radial-gradient(ellipse 80% 60% at 50% -20%, hsl(216 38% 47% / 0.16), transparent), radial-gradient(ellipse 50% 40% at 85% 0%, hsl(213 59% 90% / 0.25), transparent), radial-gradient(ellipse 50% 30% at 15% 10%, hsl(0 0% 75% / 0.15), transparent)',
      textGradient: 'linear-gradient(135deg, hsl(216 38% 47%), hsl(213 59% 90%))',
    }),
    dark: tokens({
      background: '#1a2332',
      foreground: '#fafafa',
      primary: '#4a6fa5',
      secondary: '#2a3f5e',
      muted: '#243552',
      accent: '#c0c0c0',
      border: '#2e476b',
      input: '#23344d',
      heroGradient:
        'radial-gradient(ellipse 80% 60% at 50% -20%, hsl(216 38% 47% / 0.25), transparent), radial-gradient(ellipse 50% 40% at 85% 0%, hsl(213 59% 90% / 0.12), transparent), radial-gradient(ellipse 50% 30% at 15% 10%, hsl(0 0% 75% / 0.10), transparent)',
      textGradient: 'linear-gradient(135deg, hsl(213 59% 90%), hsl(216 38% 47%))',
    }),
  },
  {
    id: 'desert-rose',
    name: 'Desert Rose',
    description: 'Soft and sophisticated dusty tones.',
    light: tokens({
      background: '#e8d5c4',
      foreground: '#5d2e46',
      primary: '#5d2e46',
      secondary: '#d4a5a5',
      muted: '#dcc0b0',
      accent: '#b87d6d',
      border: '#d4a5a5',
      input: '#f2e6dc',
      heroGradient:
        'radial-gradient(ellipse 80% 60% at 50% -20%, hsl(330 34% 27% / 0.12), transparent), radial-gradient(ellipse 50% 40% at 85% 0%, hsl(14 32% 57% / 0.15), transparent), radial-gradient(ellipse 50% 30% at 15% 10%, hsl(0 34% 74% / 0.25), transparent)',
      textGradient: 'linear-gradient(135deg, hsl(330 34% 27%), hsl(14 32% 57%))',
    }),
    dark: tokens({
      background: '#5d2e46',
      foreground: '#e8d5c4',
      primary: '#d4a5a5',
      secondary: '#7a3d51',
      muted: '#6d354d',
      accent: '#b87d6d',
      border: '#7a4a5e',
      input: '#69354e',
      heroGradient:
        'radial-gradient(ellipse 80% 60% at 50% -20%, hsl(330 34% 27% / 0.30), transparent), radial-gradient(ellipse 50% 40% at 85% 0%, hsl(14 32% 57% / 0.12), transparent), radial-gradient(ellipse 50% 30% at 15% 10%, hsl(0 34% 74% / 0.10), transparent)',
      textGradient: 'linear-gradient(135deg, hsl(0 34% 74%), hsl(14 32% 57%))',
    }),
  },
  {
    id: 'tech-innovation',
    name: 'Tech Innovation',
    description: 'Bold and modern tech aesthetic.',
    light: tokens({
      background: '#f8f9fa',
      foreground: '#1e1e1e',
      primary: '#0066ff',
      secondary: '#00ffff',
      muted: '#e0f0ff',
      accent: '#1e1e1e',
      border: '#cbe4ff',
      input: '#eef6ff',
      heroGradient:
        'radial-gradient(ellipse 80% 60% at 50% -20%, hsl(217 100% 50% / 0.18), transparent), radial-gradient(ellipse 50% 40% at 85% 0%, hsl(180 100% 50% / 0.15), transparent), radial-gradient(ellipse 50% 30% at 15% 10%, hsl(0 0% 12% / 0.08), transparent)',
      textGradient: 'linear-gradient(135deg, hsl(217 100% 50%), hsl(180 100% 50%))',
    }),
    dark: tokens({
      background: '#1e1e1e',
      foreground: '#ffffff',
      primary: '#0066ff',
      secondary: '#006060',
      muted: '#2a2a2a',
      accent: '#00ffff',
      border: '#333333',
      input: '#2c2c2c',
      heroGradient:
        'radial-gradient(ellipse 80% 60% at 50% -20%, hsl(217 100% 50% / 0.25), transparent), radial-gradient(ellipse 50% 40% at 85% 0%, hsl(180 100% 50% / 0.12), transparent), radial-gradient(ellipse 50% 30% at 15% 10%, hsl(0 0% 12% / 0.30), transparent)',
      textGradient: 'linear-gradient(135deg, hsl(180 100% 50%), hsl(217 100% 50%))',
    }),
  },
  {
    id: 'botanical-garden',
    name: 'Botanical Garden',
    description: 'Fresh and organic garden colors.',
    light: tokens({
      background: '#f5f3ed',
      foreground: '#4a7c59',
      primary: '#4a7c59',
      secondary: '#f9a620',
      muted: '#e8e4d9',
      accent: '#b7472a',
      border: '#ddd8ca',
      input: '#f9f7f1',
      heroGradient:
        'radial-gradient(ellipse 80% 60% at 50% -20%, hsl(138 25% 39% / 0.15), transparent), radial-gradient(ellipse 50% 40% at 85% 0%, hsl(38 94% 55% / 0.12), transparent), radial-gradient(ellipse 50% 30% at 15% 10%, hsl(10 63% 44% / 0.10), transparent)',
      textGradient: 'linear-gradient(135deg, hsl(138 25% 39%), hsl(38 94% 55%))',
    }),
    dark: tokens({
      background: '#3a3028',
      foreground: '#f5f3ed',
      primary: '#4a7c59',
      secondary: '#5e4a1f',
      muted: '#4e443a',
      accent: '#f9a620',
      border: '#5b5046',
      input: '#4a4037',
      heroGradient:
        'radial-gradient(ellipse 80% 60% at 50% -20%, hsl(138 25% 39% / 0.25), transparent), radial-gradient(ellipse 50% 40% at 85% 0%, hsl(38 94% 55% / 0.10), transparent), radial-gradient(ellipse 50% 30% at 15% 10%, hsl(10 63% 44% / 0.12), transparent)',
      textGradient: 'linear-gradient(135deg, hsl(138 25% 39%), hsl(10 63% 44%))',
    }),
  },
  {
    id: 'midnight-galaxy',
    name: 'Midnight Galaxy',
    description: 'Dramatic and cosmic deep tones.',
    light: tokens({
      background: '#f3f0fa',
      foreground: '#2b1e3e',
      primary: '#2b1e3e',
      secondary: '#a490c2',
      muted: '#e6e0f2',
      accent: '#4a4e8f',
      border: '#d6cfe7',
      input: '#f5f2fb',
      heroGradient:
        'radial-gradient(ellipse 80% 60% at 50% -20%, hsl(267 34% 18% / 0.12), transparent), radial-gradient(ellipse 50% 40% at 85% 0%, hsl(236 31% 42% / 0.15), transparent), radial-gradient(ellipse 50% 30% at 15% 10%, hsl(266 28% 66% / 0.22), transparent)',
      textGradient: 'linear-gradient(135deg, hsl(267 34% 18%), hsl(236 31% 42%))',
    }),
    dark: tokens({
      background: '#2b1e3e',
      foreground: '#e6e6fa',
      primary: '#a490c2',
      secondary: '#4a4e8f',
      muted: '#3b2e54',
      accent: '#e6e6fa',
      border: '#4b3d68',
      input: '#392b52',
      heroGradient:
        'radial-gradient(ellipse 80% 60% at 50% -20%, hsl(267 34% 18% / 0.35), transparent), radial-gradient(ellipse 50% 40% at 85% 0%, hsl(236 31% 42% / 0.25), transparent), radial-gradient(ellipse 50% 30% at 15% 10%, hsl(266 28% 66% / 0.12), transparent)',
      textGradient: 'linear-gradient(135deg, hsl(266 28% 66%), hsl(236 31% 42%))',
    }),
  },
];

export const DEFAULT_THEME: ColorTheme = 'midnight-galaxy';
export const THEME_STORAGE_KEY = 'legacy-legion-theme';

export function getThemePalette(id: ColorTheme): ThemePalette {
  return THEME_PALETTES.find((t) => t.id === id) ?? THEME_PALETTES[0];
}

export function isValidColorTheme(value: unknown): value is ColorTheme {
  return typeof value === 'string' && THEME_PALETTES.some((t) => t.id === value);
}
