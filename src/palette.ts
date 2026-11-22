/**
 * Paleta de colores: ÚNICA fuente para el canvas de las tarjetas y el CSS de la app.
 * Los nombres son roles (por compatibilidad se llaman `lime`/`coral`, pero son "acento 1"/"acento 2"):
 * - bg / ink: oscuro de fondo y de texto sobre fondos claros.
 * - surface: cajas sobre el fondo oscuro. muted: texto secundario sobre oscuro. line: bordes sutiles.
 * - lime (acento 1) y coral (acento 2): fondos de tarjeta con texto ink encima → deben ser claros.
 * - cream: fondo claro y texto sobre oscuro.
 */
export interface Palette {
  name: string;
  bg: string;
  surface: string;
  lime: string;
  coral: string;
  cream: string;
  ink: string;
  muted: string;
  line: string;
}

export const PALETTES = {
  /** La del diseño original. */
  original: {
    name: 'Original (lima y coral)',
    bg: '#16131C', surface: '#221E2C', lime: '#CBF23F', coral: '#FF7350',
    cream: '#F4F1EA', ink: '#16131C', muted: '#A9A4B5', line: '#4A4657',
  },
  /** Atardecer en la costa: noche morada, mango y rosado. */
  atardecer: {
    name: 'Atardecer (mango y rosado)',
    bg: '#1A1029', surface: '#2A1D3F', lime: '#FFB830', coral: '#FF6B9A',
    cream: '#FFF4E8', ink: '#1A1029', muted: '#B9A9D0', line: '#4D3D66',
  },
  /** Trópico: verde selva casi negro, menta eléctrica y mandarina. */
  tropico: {
    name: 'Trópico (menta y mandarina)',
    bg: '#0D1B1E', surface: '#16292D', lime: '#5CF2B5', coral: '#FF8A3D',
    cream: '#F1F6EE', ink: '#0D1B1E', muted: '#93B0AE', line: '#2F4B4F',
  },
  /** Café de origen: tostado oscuro, amarillo y rosa. */
  cafe: {
    name: 'Café (amarillo y rosa)',
    bg: '#22150F', surface: '#33231A', lime: '#F7D046', coral: '#F28B9B',
    cream: '#FBF3E6', ink: '#22150F', muted: '#C2AB9C', line: '#55402F',
  },
} satisfies Record<string, Palette>;

export type PaletteId = keyof typeof PALETTES;

/**
 * Estilo de las tarjetas:
 * - 'color': fondos de color a sangre (acento 1, acento 2, claro), como el diseño original.
 * - 'dark': todas las tarjetas sobre fondo oscuro (levemente teñido con el acento de cada una);
 *   los acentos pasan a títulos, números, barras y resaltados.
 */
export type CardMode = 'color' | 'dark';

/**
 * Temas = paleta + estilo de tarjetas. Se eligen con la variable de entorno `VITE_THEME`
 * (en tiempo de build; ver .env.example). Sin sufijo = tarjetas de color; `-oscuro` = tarjetas oscuras.
 */
export const THEMES_AVAILABLE = [
  'original', 'original-oscuro',
  'atardecer', 'atardecer-oscuro',
  'tropico', 'tropico-oscuro',
  'cafe', 'cafe-oscuro',
] as const;
export type ThemeName = (typeof THEMES_AVAILABLE)[number];

/** Tema por defecto si `VITE_THEME` no está definida. */
export const DEFAULT_THEME: ThemeName = 'atardecer-oscuro';

/** "tropico-oscuro" → { palette: 'tropico', cards: 'dark' }. null si no existe. */
export function parseTheme(raw: string | undefined | null): { palette: PaletteId; cards: CardMode } | null {
  const v = (raw ?? '').trim().toLowerCase();
  if (!(THEMES_AVAILABLE as readonly string[]).includes(v)) return null;
  const dark = v.endsWith('-oscuro');
  const palette = (dark ? v.slice(0, -'-oscuro'.length) : v) as PaletteId;
  return { palette, cards: dark ? 'dark' : 'color' };
}

/** Lee `VITE_THEME` (vacío → tema por defecto; inválido → por defecto con aviso). */
function envTheme(): { palette: PaletteId; cards: CardMode } {
  let raw: string | undefined;
  try {
    raw = (import.meta.env?.VITE_THEME as string | undefined) || undefined;
  } catch {
    raw = undefined;
  }
  const parsed = parseTheme(raw ?? DEFAULT_THEME);
  if (!parsed) {
    // El build ya falla con un tema inválido (vite.config.ts); esto es solo por si acaso.
    console.warn(`VITE_THEME="${raw}" no existe. Usando "${DEFAULT_THEME}".`);
    return parseTheme(DEFAULT_THEME)!;
  }
  return parsed;
}

const ENV_THEME = envTheme();

/** En desarrollo se puede probar otro con `?palette=tropico&cards=color` (no afecta producción). */
function devQuery(key: string): string | null {
  try {
    if (import.meta.env?.DEV && typeof location !== 'undefined') {
      return new URLSearchParams(location.search).get(key);
    }
  } catch {
    /* sin location (worker/tests) */
  }
  return null;
}

function pick(): Palette {
  const q = devQuery('palette');
  if (q && q in PALETTES) return PALETTES[q as PaletteId];
  return PALETTES[ENV_THEME.palette];
}

export const P: Palette = pick();

function pickMode(): CardMode {
  const q = devQuery('cards');
  if (q === 'dark' || q === 'color') return q;
  return ENV_THEME.cards;
}

export const CARD_MODE: CardMode = pickMode();

/** Mezcla dos "#RRGGBB" (t = 0 → a, t = 1 → b). */
export function mix(a: string, b: string, t: number): string {
  const x = parseInt(a.slice(1), 16);
  const y = parseInt(b.slice(1), 16);
  const ch = (sh: number): number => Math.round(((x >> sh) & 255) * (1 - t) + ((y >> sh) & 255) * t);
  return '#' + [16, 8, 0].map((sh) => ch(sh).toString(16).padStart(2, '0')).join('');
}

/** "#RRGGBB" + alfa → "rgba(r,g,b,a)". */
export function alpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Variables CSS de la app para una paleta (las usa `applyPaletteToCss` y el build para el HTML inicial). */
export function cssVars(p: Palette): Record<string, string> {
  return {
    '--bg': p.bg,
    '--surface': p.surface,
    '--lime': p.lime,
    '--coral': p.coral,
    '--cream': p.cream,
    '--ink': p.ink,
    '--muted': p.muted,
    '--line': p.line,
    '--lime-08': alpha(p.lime, 0.08),
    '--coral-14': alpha(p.coral, 0.14),
    '--ink-75': alpha(p.ink, 0.75),
    '--cream-10': alpha(p.cream, 0.1),
    '--scrim': alpha(p.bg, 0.7),
  };
}

/** Vuelca la paleta activa como variables CSS en :root (la app web usa las mismas). */
export function applyPaletteToCss(p: Palette = P): void {
  const s = document.documentElement.style;
  for (const [k, v] of Object.entries(cssVars(p))) s.setProperty(k, v);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', p.bg);
}
