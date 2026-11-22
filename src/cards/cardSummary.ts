import type { WrappedData } from '../types';
import { fmtDay, fmtHour, fmtInt, plural } from '../format';
import { drawSticker, STICKER_BG } from './cardB';
import {
  box, CardOpts, CONTENT_W, EMOJI, fillRR, footer, frame, HEAD, MARGIN, pageLabel, strongBox, text, Theme, THEMES, wrap, INK_72,
} from './draw';

type Ctx = CanvasRenderingContext2D;

/** Título: "Nuestro {año} en el chat" (dúo) o el nombre del grupo en 1–2 líneas. Devuelve la y inferior. */
function drawTitle(ctx: Ctx, t: Theme, data: WrappedData): number {
  let lines: string[];
  let size = 64;
  if (data.mode.size === 'duo') {
    lines = [`Nuestro ${data.year}`, 'en el chat'];
  } else {
    const name = data.groupName.trim();
    lines = [name];
    for (size = 64; size >= 36; size -= 4) {
      lines = wrap(ctx, name, CONTENT_W, 800, size, HEAD, -0.05);
      if (lines.length <= 2) break;
    }
    size = Math.max(size, 36);
    lines = lines.slice(0, 2);
  }
  const lh = Math.round(size * 1.03);
  lines.forEach((l, i) => {
    const last = i === lines.length - 1 && lines.length > 1;
    text(ctx, l, MARGIN, 226 + i * lh, {
      weight: 800, size, family: HEAD, color: last && t.dark ? t.emph : t.fg, tracking: -0.05, maxWidth: CONTENT_W,
    });
  });
  return 226 + (lines.length - 1) * lh;
}

/** Tarjeta "Tu año en una tarjeta": collage con lo mejor del Wrapped. */
export function drawCardSummary(ctx: Ctx, data: WrappedData, opts: CardOpts = {}): void {
  const t = opts.theme ?? THEMES.dark;
  frame(ctx, t, data.year);
  const titleBottom = drawTitle(ctx, t, data);

  const soft = t.dark ? t.sub : INK_72;
  const gap = 16;
  const half = (CONTENT_W - gap) / 2;
  const x2 = MARGIN + half + gap;
  const pad = 22;

  /** Número/frase grande + etiqueta, anclados abajo en la caja. */
  const stat = (
    x: number, y: number, w: number, h: number, big: string, label: string, bigSize: number,
    strong = false,
  ): void => {
    const fg = strong ? t.strongFg : t.fg;
    const lab = strong ? t.strongSub : soft;
    text(ctx, big, x + pad, y + h - 54, {
      weight: 800, size: bigSize, family: HEAD, color: fg, tracking: -0.04, maxWidth: w - pad * 2,
    });
    text(ctx, label, x + pad, y + h - 26, { weight: 500, size: 20, color: lab, maxWidth: w - pad * 2 });
  };

  let y = Math.max(titleBottom + 38, 330);

  // Fila A: total (caja grande) + racha
  const hA = 190;
  const wBig = 330;
  const wSide = CONTENT_W - wBig - gap;
  strongBox(ctx, t, MARGIN, y, wBig, hA, 28);
  const names =
    data.mode.size === 'duo'
      ? data.people.slice(0, 2).map((p) => p.name).join(' & ')
      : `${fmtInt(data.participants)} personas`;
  text(ctx, names, MARGIN + pad, y + 40, {
    weight: 700, size: 22, color: t.strongAccent, maxWidth: wBig - pad * 2, baseline: 'middle',
  });
  stat(MARGIN, y, wBig, hA, fmtInt(data.total), 'mensajes', 76, true);
  box(ctx, t, MARGIN + wBig + gap, y, wSide, hA, 28);
  stat(MARGIN + wBig + gap, y, wSide, hA, fmtInt(data.maxStreak), 'días de racha', 56);
  y += hA + gap;

  // Fila B: hora pico + día más intenso
  const hB = 140;
  box(ctx, t, MARGIN, y, half, hB, 28);
  stat(MARGIN, y, half, hB, fmtHour(data.peakHour), 'su hora', 46);
  box(ctx, t, x2, y, half, hB, 28);
  const day = data.busiestDay;
  stat(x2, y, half, hB, day.iso ? fmtDay(day.iso) : '—', `día más intenso · ${fmtInt(day.count)}`, 34);
  y += hB + gap;

  // Fila C: emoji top + (sticker #1 | palabra top)
  const hC = 190;
  box(ctx, t, MARGIN, y, half, hC, 28);
  const emoji = data.topEmojis[0];
  if (emoji) {
    ctx.font = `84px ${EMOJI}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = t.fg;
    ctx.fillText(emoji.emoji, MARGIN + pad, y + 70);
    text(ctx, `${fmtInt(emoji.count)} ${plural(emoji.count, 'vez', 'veces')}`, MARGIN + pad, y + hC - 26, {
      weight: 500, size: 20, color: soft, maxWidth: half - pad * 2,
    });
  } else {
    stat(MARGIN, y, half, hC, fmtInt(data.jajaCount), 'jajajas', 56);
  }
  if (data.topStickers[0]) {
    fillRR(ctx, x2, y, half, hC, 28, STICKER_BG);
    box(ctx, t, x2, y, half, hC, 28);
    drawSticker(ctx, opts.bitmaps?.[0], x2 + half / 2, y + hC / 2, hC - 36, t.fg);
  } else {
    box(ctx, t, x2, y, half, hC, 28);
    const word = data.topWords[0];
    if (word) {
      text(ctx, 'la palabra', x2 + pad, y + 44, { weight: 500, size: 20, color: soft });
      stat(x2, y, half, hC, word.word, `${fmtInt(word.count)} ${plural(word.count, 'vez', 'veces')}`, 44);
    } else {
      stat(x2, y, half, hC, fmtInt(data.daysTalking), 'días hablando', 56);
    }
  }
  y += hC + gap;

  // Fila D: el premio más notorio (los premios ya vienen ordenados por notoriedad)
  const hD = Math.max(120, Math.min(170, 1040 - y));
  strongBox(ctx, t, MARGIN, y, CONTENT_W, hD, 28);
  const award = data.awards[0];
  if (award) {
    text(ctx, 'premio más notorio', MARGIN + pad, y + 34, {
      weight: 600, size: 19, color: t.strongSub, baseline: 'middle',
    });
    text(ctx, award.title, MARGIN + pad, y + hD * 0.52, {
      weight: 800, size: 44, family: HEAD, color: t.strongAccent, tracking: -0.04, baseline: 'middle',
      maxWidth: CONTENT_W - pad * 2,
    });
    text(ctx, award.winner, MARGIN + pad, y + hD - 30, {
      weight: 700, size: 24, color: t.strongFg, baseline: 'middle', maxWidth: CONTENT_W - pad * 2,
    });
  } else {
    text(ctx, `${fmtInt(data.daysTalking)} días hablando`, MARGIN + pad, y + hD / 2, {
      weight: 800, size: 40, family: HEAD, color: t.strongAccent, tracking: -0.04, baseline: 'middle',
      maxWidth: CONTENT_W - pad * 2,
    });
  }

  footer(ctx, t, pageLabel(opts, 15));
}
