/**
 * Helpers de dibujo. Todas las tarjetas se dibujan en un espacio lógico de
 * 648 × 1152 (el mismo de los renders de referencia) y se escalan a 1080 × 1920.
 */
import { SITE_DOMAIN } from '../config';
import { alpha, CARD_MODE, mix, P } from '../palette';

export const W = 648;
export const H = 1152;
export const OUT_W = 1080;
export const OUT_H = 1920;
export const MARGIN = 58;
export const CONTENT_W = W - MARGIN * 2; // 532

export const C = {
  bg: P.bg,
  surface: P.surface,
  lime: P.lime,
  coral: P.coral,
  cream: P.cream,
  ink: P.ink,
  muted: P.muted,
} as const;

/** Texto secundario sobre fondos claros (ink al 72 %). */
export const INK_72 = alpha(P.ink, 0.72);

export const HEAD = '"Inter Tight", Inter, system-ui, sans-serif';
export const BODY = 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif';
export const EMOJI = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif';

export interface CardOpts {
  /** Posición 1..total dentro del mazo, para el pie "N / total". */
  index?: number;
  /** Largo del mazo (por defecto 6). */
  total?: number;
  /** Tema (fondo) asignado por buildDeck; por defecto el de la tarjeta. */
  theme?: Theme;
  /** Stickers ya decodificados, alineados con data.topStickers (null = no se pudo decodificar). */
  bitmaps?: (ImageBitmap | null)[];
  /** Solo "El reto": true dibuja el estado respuesta; por defecto (pregunta) no revela al ganador. */
  reveal?: boolean;
  /** Mazo al que pertenece la tarjeta; el reporte completo rotula el pie "Reporte completo · N / M". */
  tier?: 'free' | 'full';
}

/** "N / total" para el pie ("Reporte completo · N / M" en el mazo full). */
export function pageLabel(opts: CardOpts, fallbackIndex: number): string {
  const base = `${opts.index ?? fallbackIndex} / ${opts.total ?? 6}`;
  return opts.tier === 'full' ? `Reporte completo · ${base}` : base;
}

export function font(weight: number, size: number, family: string = BODY): string {
  return `${weight} ${size}px ${family}`;
}

type Ctx = CanvasRenderingContext2D;

export function setSpacing(ctx: Ctx, px: number): void {
  const c = ctx as unknown as { letterSpacing?: string; wordSpacing?: string };
  if ('letterSpacing' in ctx) c.letterSpacing = `${px}px`;
  // El tracking negativo también encoge los espacios y las palabras se pegan
  // ("Lospremios"); se compensa abriendo el espacio entre palabras.
  if ('wordSpacing' in ctx) c.wordSpacing = `${px < 0 ? -px * 2.5 : 0}px`;
}

interface TextOpts {
  weight?: number;
  size: number;
  family?: string;
  color: string;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  /** Tracking en em (p. ej. -0.04). */
  tracking?: number;
  maxWidth?: number;
}

/** Dibuja texto; si pasa `maxWidth` y no cabe, reduce el tamaño. Devuelve el tamaño usado. */
export function text(ctx: Ctx, str: string, x: number, y: number, o: TextOpts): number {
  let size = o.size;
  const weight = o.weight ?? 400;
  const family = o.family ?? BODY;
  const apply = (s: number): void => {
    ctx.font = font(weight, s, family);
    setSpacing(ctx, (o.tracking ?? 0) * s);
  };
  apply(size);
  if (o.maxWidth) {
    let guard = 0;
    while (ctx.measureText(str).width > o.maxWidth && size > 10 && guard++ < 80) {
      size -= 1;
      apply(size);
    }
  }
  ctx.fillStyle = o.color;
  ctx.textAlign = o.align ?? 'left';
  ctx.textBaseline = o.baseline ?? 'alphabetic';
  ctx.fillText(str, x, y);
  setSpacing(ctx, 0);
  return size;
}

export function measure(ctx: Ctx, str: string, weight: number, size: number, family: string = BODY, tracking = 0): number {
  ctx.font = font(weight, size, family);
  setSpacing(ctx, tracking * size);
  const w = ctx.measureText(str).width;
  setSpacing(ctx, 0);
  return w;
}

/** Rectángulo redondeado; r puede ser número o [tl, tr, br, bl]. */
export function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number | number[]): void {
  const [tl, tr, br, bl] = Array.isArray(r) ? r : [r, r, r, r];
  const m = (v: number): number => Math.min(v, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + m(tl), y);
  ctx.lineTo(x + w - m(tr), y);
  ctx.arcTo(x + w, y, x + w, y + m(tr), m(tr));
  ctx.lineTo(x + w, y + h - m(br));
  ctx.arcTo(x + w, y + h, x + w - m(br), y + h, m(br));
  ctx.lineTo(x + m(bl), y + h);
  ctx.arcTo(x, y + h, x, y + h - m(bl), m(bl));
  ctx.lineTo(x, y + m(tl));
  ctx.arcTo(x, y, x + m(tl), y, m(tl));
  ctx.closePath();
}

export function fillRR(ctx: Ctx, x: number, y: number, w: number, h: number, r: number | number[], color: string): void {
  rr(ctx, x, y, w, h, r);
  ctx.fillStyle = color;
  ctx.fill();
}

export function strokeRR(
  ctx: Ctx, x: number, y: number, w: number, h: number, r: number | number[], color: string, lw: number,
): void {
  // El trazo se dibuja hacia adentro para que el borde externo quede en (x, y, w, h).
  rr(ctx, x + lw / 2, y + lw / 2, w - lw, h - lw, Array.isArray(r) ? r.map((v) => v - lw / 2) : r - lw / 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.stroke();
}

export interface Theme {
  bg: string;
  fg: string;
  /** Color de acento para la pill y énfasis inline (lima en oscuro, ink en claro). */
  accent: string;
  /** Texto secundario (pie, etc.). */
  sub: string;
  dark: boolean;
  /** Color de las líneas grandes de énfasis (p. ej. la última línea del nombre en la portada). */
  emph: string;
  /** Borde de cajas y barras (3px); null en fondos oscuros, donde las cajas van rellenas. */
  line: string | null;
  /** Fondo de pistas de barras. */
  track: string;
  /** Pista sólida de la barra grande (con borde en fondos claros). */
  trackSolid: string;
  /** Color de barras normales. */
  bar: string;
  /** Color de barras con relleno de énfasis (lima en oscuro). */
  barFill: string;
  /** Barra resaltada. */
  hi: string;
  /** Borde de la barra resaltada (null en oscuro). */
  hiLine: string | null;
  /** Caja "fuerte" (ink en claros, surface en oscuros) con su texto, acento y secundario. */
  strongBg: string;
  strongFg: string;
  strongAccent: string;
  strongSub: string;
  bubbleA: { fill: string; text: string };
  bubbleB: { fill: string; text: string };
  /** Botón grande (pill). */
  cta: { bg: string; fg: string; arrow: string };
}

const INK_SOFT = alpha(P.ink, 0.6);
const INK_TRACK = alpha(P.ink, 0.14);

const COLOR_THEMES = {
  dark: {
    bg: C.bg, fg: C.cream, accent: C.lime, sub: C.muted, dark: true,
    emph: C.lime, line: null, track: C.surface, trackSolid: C.surface,
    bar: alpha(P.cream, 0.3), barFill: C.lime, hi: C.lime, hiLine: null,
    strongBg: C.surface, strongFg: C.cream, strongAccent: C.lime, strongSub: C.muted,
    bubbleA: { fill: C.cream, text: C.ink }, bubbleB: { fill: C.lime, text: C.ink },
    cta: { bg: C.lime, fg: C.ink, arrow: C.ink },
  },
  lime: {
    bg: C.lime, fg: C.ink, accent: C.ink, sub: C.ink, dark: false,
    emph: INK_SOFT, line: C.ink, track: INK_TRACK, trackSolid: C.cream,
    bar: C.ink, barFill: C.ink, hi: C.cream, hiLine: C.ink,
    strongBg: C.ink, strongFg: C.cream, strongAccent: C.lime, strongSub: C.muted,
    bubbleA: { fill: C.ink, text: C.cream }, bubbleB: { fill: C.cream, text: C.ink },
    cta: { bg: C.ink, fg: C.cream, arrow: C.lime },
  },
  coral: {
    bg: C.coral, fg: C.ink, accent: C.ink, sub: C.ink, dark: false,
    emph: INK_SOFT, line: C.ink, track: INK_TRACK, trackSolid: C.cream,
    bar: C.ink, barFill: C.ink, hi: C.cream, hiLine: C.ink,
    strongBg: C.ink, strongFg: C.cream, strongAccent: C.coral, strongSub: C.muted,
    bubbleA: { fill: C.ink, text: C.cream }, bubbleB: { fill: C.cream, text: C.ink },
    cta: { bg: C.ink, fg: C.cream, arrow: C.coral },
  },
  cream: {
    bg: C.cream, fg: C.ink, accent: C.ink, sub: C.ink, dark: false,
    emph: INK_SOFT, line: C.ink, track: INK_TRACK, trackSolid: '#FFFFFF',
    bar: C.ink, barFill: C.ink, hi: C.lime, hiLine: C.ink,
    strongBg: C.ink, strongFg: C.cream, strongAccent: C.lime, strongSub: C.muted,
    bubbleA: { fill: C.ink, text: C.cream }, bubbleB: { fill: C.lime, text: C.ink },
    cta: { bg: C.ink, fg: C.cream, arrow: C.lime },
  },
} satisfies Record<string, Theme>;

/**
 * Versión oscura de un tema: fondo oscuro teñido con `tint`, texto claro y el acento en lo que
 * antes era fondo (títulos de énfasis, barras, resaltados, caja fuerte, botón).
 */
function darkTheme(tint: string, amount: number, accent: string): Theme {
  const bg = mix(C.bg, tint, amount);
  return {
    bg, fg: C.cream, accent, sub: C.muted, dark: true,
    emph: accent, line: null, track: mix(bg, C.cream, 0.1), trackSolid: mix(bg, C.cream, 0.12),
    bar: alpha(C.cream, 0.3), barFill: accent, hi: accent, hiLine: null,
    strongBg: mix(bg, accent, 0.16), strongFg: C.cream, strongAccent: accent, strongSub: C.muted,
    bubbleA: { fill: C.cream, text: C.ink }, bubbleB: { fill: accent, text: C.ink },
    cta: { bg: accent, fg: C.ink, arrow: C.ink },
  };
}

/** En modo oscuro, cada fondo de color se vuelve un oscuro teñido; así la regla de fondos alternos sigue diferenciando tarjetas. */
const DARK_THEMES = {
  dark: COLOR_THEMES.dark,
  lime: darkTheme(C.lime, 0.1, C.lime),
  coral: darkTheme(C.coral, 0.12, C.coral),
  cream: darkTheme(C.cream, 0.05, C.coral),
} satisfies Record<keyof typeof COLOR_THEMES, Theme>;

export const THEMES: typeof COLOR_THEMES = CARD_MODE === 'dark' ? (DARK_THEMES as unknown as typeof COLOR_THEMES) : COLOR_THEMES;

export type ThemeId = keyof typeof THEMES;

/** Caja de contenido: rellena `surface` en fondos oscuros; con borde ink de 3px en claros. */
export function box(ctx: Ctx, t: Theme, x: number, y: number, w: number, h: number, r: number | number[] = 26): void {
  if (t.line) strokeRR(ctx, x, y, w, h, r, t.line, 3);
  else fillRR(ctx, x, y, w, h, r, C.surface);
}

/**
 * Colores de un reparto entre dos personas (barra partida). Deben distinguirse en TODOS los temas:
 * - fondo oscuro: acento vs. crema (antes ambos eran el acento y no se veía el reparto);
 * - fondo claro: ink vs. el resaltado del tema, con borde ink para que no se pierda sobre el fondo.
 */
export function splitColors(t: Theme): { a: string; b: string; bLine: string | null } {
  if (t.dark) return { a: t.barFill, b: t.fg, bLine: null };
  return { a: t.barFill, b: t.hi, bLine: t.hiLine };
}

/** Punto de color para la leyenda de un reparto. */
export function legendDot(ctx: Ctx, cx: number, cy: number, color: string, line: string | null): void {
  ctx.beginPath();
  ctx.arc(cx, cy, 7, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  if (line) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = line;
    ctx.stroke();
  }
}

/** Caja "fuerte": rellena (ink en fondos claros, surface en oscuros). */
export function strongBox(ctx: Ctx, t: Theme, x: number, y: number, w: number, h: number, r: number | number[] = 28): void {
  fillRR(ctx, x, y, w, h, r, t.strongBg);
}

/** Barra vertical/horizontal rellena; `highlight` usa el estilo resaltado del tema. */
export function barRR(
  ctx: Ctx, t: Theme, x: number, y: number, w: number, h: number, r: number, highlight: boolean,
): void {
  if (highlight) {
    fillRR(ctx, x, y, w, h, r, t.hi);
    if (t.hiLine) strokeRR(ctx, x, y, w, h, r, t.hiLine, 3);
  } else {
    fillRR(ctx, x, y, w, h, r, t.bar);
  }
}

/** Fondo + cabecera ("chat wrapped" + pill del año). */
export function frame(ctx: Ctx, t: Theme, year: number): void {
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, W, H);
  text(ctx, 'chat wrapped', MARGIN, 77, {
    weight: 800, size: 29, family: HEAD, color: t.fg, tracking: -0.04, baseline: 'middle',
  });
  const pw = 87;
  const ph = 38;
  strokeRR(ctx, W - MARGIN - pw, 58, pw, ph, ph / 2, t.accent, 2);
  text(ctx, String(year), W - MARGIN - pw / 2, 77, {
    weight: 700, size: 19, color: t.accent, align: 'center', baseline: 'middle',
  });
}

/** Pie: izquierda ("N / 6" o texto) y dominio a la derecha. */
export function footer(ctx: Ctx, t: Theme, left: string): void {
  const isMuted = t.sub === C.muted;
  text(ctx, left, MARGIN, 1084, {
    weight: isMuted ? 500 : 600, size: 17, color: t.sub, baseline: 'middle',
  });
  text(ctx, SITE_DOMAIN, W - MARGIN, 1084, {
    weight: 600, size: 17, color: t.sub, align: 'right', baseline: 'middle',
  });
}

/** Burbuja de chat; `tail` indica la esquina "cola" con radio pequeño. */
export function bubble(
  ctx: Ctx, str: string, x: number, y: number, w: number, h: number,
  fill: string, color: string, tail: 'left' | 'right', size = 24,
): void {
  const r = h / 2;
  fillRR(ctx, x, y, w, h, tail === 'left' ? [r, r, r, 6] : [r, r, 6, r], fill);
  text(ctx, str, x + w / 2, y + h / 2 + 1, {
    weight: 500, size, color, align: 'center', baseline: 'middle', maxWidth: w - 28,
  });
}

/** Ancho de burbuja según el texto. */
export function bubbleWidth(ctx: Ctx, str: string, size = 24, pad = 24): number {
  return Math.ceil(measure(ctx, str, 500, size)) + pad * 2;
}

export interface Seg {
  t: string;
  color?: string;
  weight?: number;
}

/** Texto con segmentos de distinto color/peso y salto de línea automático. */
export function rich(
  ctx: Ctx, segs: Seg[], x: number, y: number, maxW: number, lineH: number,
  size: number, baseColor: string, baseWeight = 500,
): number {
  const words: { w: string; color: string; weight: number }[] = [];
  for (const s of segs) {
    for (const part of s.t.split(/(\s+)/)) {
      if (part === '') continue;
      words.push({ w: part, color: s.color ?? baseColor, weight: s.weight ?? baseWeight });
    }
  }
  let cx = x;
  let cy = y;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  let lines = 1;
  for (const wd of words) {
    ctx.font = font(wd.weight, size);
    const isSpace = /^\s+$/.test(wd.w);
    const width = ctx.measureText(wd.w).width;
    if (isSpace) {
      if (cx > x) cx += width;
      continue;
    }
    if (cx + width > x + maxW && cx > x) {
      cx = x;
      cy += lineH;
      lines++;
    }
    ctx.fillStyle = wd.color;
    ctx.fillText(wd.w, cx, cy);
    cx += width;
  }
  return lines;
}

/** Parte un texto en líneas que caben en maxW. */
export function wrap(ctx: Ctx, str: string, maxW: number, weight: number, size: number, family: string = BODY, tracking = 0): string[] {
  const words = str.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (line && measure(ctx, test, weight, size, family, tracking) > maxW) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

export function lockIcon(ctx: Ctx, x: number, y: number, size: number, color: string, lw = 2): void {
  const bw = size;
  const bh = size * 0.62;
  const by = y + size * 0.38;
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  rr(ctx, x + lw / 2, by, bw - lw, bh - lw / 2, 4);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + bw / 2, by, bw * 0.28, Math.PI, 0);
  ctx.stroke();
}

/** Título de dos líneas (Inter Tight 800). La segunda va en el énfasis del tema (lima en oscuro). */
export function title2(ctx: Ctx, t: Theme, a: string, b: string, size = 68): void {
  text(ctx, a, MARGIN, 226, {
    weight: 800, size, family: HEAD, color: t.fg, tracking: -0.05, maxWidth: CONTENT_W,
  });
  text(ctx, b, MARGIN, 226 + Math.round(size * 1.03), {
    weight: 800, size, family: HEAD, color: t.dark ? t.emph : t.fg, tracking: -0.05, maxWidth: CONTENT_W,
  });
}

/** "Su mes fue" + palabra enorme + frase. Devuelve la y inferior de la frase. */
export function heroWord(ctx: Ctx, t: Theme, kicker: string, word: string, phrase: string): number {
  text(ctx, kicker, MARGIN, 213, { weight: 500, size: 32, color: t.fg });
  text(ctx, word, MARGIN - 2, 385, {
    weight: 800, size: 168, family: HEAD, color: t.fg, tracking: -0.06, maxWidth: CONTENT_W + 4,
  });
  const lines = wrap(ctx, phrase, 500, 500, 28);
  lines.forEach((l, i) => text(ctx, l, MARGIN, 448 + i * 36, { weight: 500, size: 28, color: t.fg }));
  return 448 + lines.length * 36;
}
