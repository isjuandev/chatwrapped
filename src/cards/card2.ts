import type { WrappedData } from '../types';
import { fmtInt, simpleFraction } from '../format';
import {
  CardOpts, CONTENT_W, fillRR, footer, frame, HEAD, MARGIN, pageLabel, rich, rr, splitColors, strokeRR, strongBox, text, THEMES, W,
} from './draw';

/** Tarjeta 2: ¿Quién escribe más? */
export function drawCard2(ctx: CanvasRenderingContext2D, data: WrappedData, opts: CardOpts = {}): void {
  const t = opts.theme ?? THEMES.lime;
  frame(ctx, t, data.year);

  text(ctx, '¿Quién escribe', MARGIN, 240, {
    weight: 800, size: 62, family: HEAD, color: t.fg, tracking: -0.04, maxWidth: CONTENT_W,
  });
  text(ctx, 'más?', MARGIN, 305, { weight: 800, size: 62, family: HEAD, color: t.fg, tracking: -0.04 });

  const top = data.people[0];
  if (!top) return;
  const pct = Math.round(top.share * 100);
  const isCouple = data.mode.size === 'duo' && data.people.length === 2;

  if (isCouple) {
    const other = data.people[1];
    text(ctx, `${pct}%`, MARGIN - 4, 578, {
      weight: 800, size: 250, family: HEAD, color: t.fg, tracking: -0.055, maxWidth: CONTENT_W + 8,
    });
    text(ctx, top.name, MARGIN, 647, { weight: 700, size: 30, color: t.fg, maxWidth: CONTENT_W });

    // Barra
    const by = 681;
    const bh = 78;
    ctx.save();
    rr(ctx, MARGIN, by, CONTENT_W, bh, 24);
    ctx.clip();
    // Mismos colores de reparto que el resto de tarjetas (en oscuro: acento vs. crema; antes la
    // segunda persona se pintaba como la pista vacía y casi no se distinguía del fondo).
    const sc = splitColors(t);
    ctx.fillStyle = t.dark ? sc.b : t.trackSolid;
    ctx.fillRect(MARGIN, by, CONTENT_W, bh);
    ctx.fillStyle = sc.a;
    ctx.fillRect(MARGIN, by, CONTENT_W * top.share, bh);
    // Separación entre los dos tramos.
    ctx.fillStyle = t.bg;
    ctx.fillRect(MARGIN + CONTENT_W * top.share - 2, by, 4, bh);
    ctx.restore();
    if (t.line) strokeRR(ctx, MARGIN, by, CONTENT_W, bh, 24, t.line, 3);

    text(ctx, `${top.name} · ${fmtInt(top.count)}`, MARGIN, 797, {
      weight: 600, size: 21, color: t.fg, baseline: 'middle', maxWidth: CONTENT_W / 2 - 10,
    });
    text(ctx, `${other.name} · ${fmtInt(other.count)}`, W - MARGIN, 797, {
      weight: 600, size: 21, color: t.fg, align: 'right', baseline: 'middle', maxWidth: CONTENT_W / 2 - 10,
    });

    // Caja de frase
    strongBox(ctx, t, MARGIN, 881, CONTENT_W, 168, 28);
    const [n, d] = simpleFraction(top.share);
    const segs = [
      { t: `${top.name} manda ` },
      { t: `${n} de cada ${d}`, color: t.strongAccent, weight: 700 },
      { t: ' mensajes.' },
    ];
    const audioTalker = other.audios > top.audios && other.audios > 0;
    if (audioTalker) segs.push({ t: ` ${other.name} responde con audios.` });
    rich(ctx, segs, MARGIN + 29, 937, CONTENT_W - 58, 38, 29, t.strongFg, 500);
  } else {
    text(ctx, `${pct}%`, MARGIN - 4, 500, {
      weight: 800, size: 170, family: HEAD, color: t.fg, tracking: -0.055, maxWidth: CONTENT_W + 8,
    });
    text(ctx, `${top.name} es quien más escribe`, MARGIN, 548, {
      weight: 700, size: 26, color: t.fg, maxWidth: CONTENT_W,
    });

    // Ranking top 5
    const rows = data.people.slice(0, 5);
    const max = rows[0].count || 1;
    const rowH = 84;
    rows.forEach((p, i) => {
      const y = 590 + i * rowH;
      text(ctx, `${i + 1}. ${p.name}`, MARGIN, y + 22, {
        weight: 700, size: 26, color: t.fg, maxWidth: CONTENT_W - 150,
      });
      text(ctx, `${fmtInt(p.count)} · ${Math.round(p.share * 100)}%`, W - MARGIN, y + 22, {
        weight: 600, size: 21, color: t.fg, align: 'right',
      });
      fillRR(ctx, MARGIN, y + 36, CONTENT_W, 22, 11, t.track);
      fillRR(ctx, MARGIN, y + 36, Math.max(22, (CONTENT_W * p.count) / max), 22, 11, t.barFill);
    });
    if (data.people.length > 5) {
      text(ctx, `y ${data.people.length - 5} más en el chat`, MARGIN, 1030, {
        weight: 500, size: 21, color: t.fg,
      });
    }
  }
  footer(ctx, t, pageLabel(opts, 2));
}
