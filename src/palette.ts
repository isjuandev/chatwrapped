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

/** Paleta activa en producción. Cámbiala aquí. */
export const ACTIVE_PALETTE: PaletteId = 'atardecer';

/** En desarrollo se puede probar otra con `?palette=atardecer` (no afecta producción). */
function pick(): Palette {
  try {
    if (import.meta.env?.DEV && typeof location !== 'undefined') {
      const q = new URLSearchParams(location.search).get('palette');
      if (q && q in PALETTES) return PALETTES[q as PaletteId];
    }
  } catch {
    /* sin location (worker/tests) */
  }
  return PALETTES[ACTIVE_PALETTE];
}

export const P: Palette = pick();

/**
 * Estilo de las tarjetas:
 * - 'color': fondos de color a sangre (acento 1, acento 2, claro), como el diseño original.
 * - 'dark': todas las tarjetas sobre fondo oscuro (levemente teñido con el acento de cada una);
 *   los acentos pasan a títulos, números, barras y resaltados.
 */
export type CardMode = 'color' | 'dark';

/** Estilo activo en producción. Cámbialo aquí. */
export const ACTIVE_CARD_MODE: CardMode = 'dark';

function pickMode(): CardMode {
  try {
    if (import.meta.env?.DEV && typeof location !== 'undefined') {
      const q = new URLSearchParams(location.search).get('cards');
      if (q === 'dark' || q === 'color') return q;
    }
  } catch {
    /* sin location (worker/tests) */
  }
  return ACTIVE_CARD_MODE;
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

/** Vuelca la paleta activa como variables CSS en :root (la app web usa las mismas). */
export function applyPaletteToCss(p: Palette = P): void {
  const s = document.documentElement.style;
  s.setProperty('--bg', p.bg);
  s.setProperty('--surface', p.surface);
  s.setProperty('--lime', p.lime);
  s.setProperty('--coral', p.coral);
  s.setProperty('--cream', p.cream);
  s.setProperty('--ink', p.ink);
  s.setProperty('--muted', p.muted);
  s.setProperty('--line', p.line);
  s.setProperty('--lime-08', alpha(p.lime, 0.08));
  s.setProperty('--coral-14', alpha(p.coral, 0.14));
  s.setProperty('--ink-75', alpha(p.ink, 0.75));
  s.setProperty('--cream-10', alpha(p.cream, 0.1));
  s.setProperty('--scrim', alpha(p.bg, 0.7));
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', p.bg);
}
