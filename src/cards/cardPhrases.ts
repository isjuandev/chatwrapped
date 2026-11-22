import type { Phrase, WrappedData } from '../types';
import { copyFor } from '../copy';
import { fmtInt } from '../format';
import { isTender } from '../metrics/phrases';
import {
  CardOpts, CONTENT_W, fillRR, footer, frame, HEAD, legendDot, MARGIN, measure, pageLabel, rich, splitColors, strokeRR, strongBox, text, THEMES, title2, W, INK_72,
} from './draw';

/** Disponible con ≥ 3 expresiones descubiertas del chat. */
export function phrasesAvailable(data: WrappedData): boolean {
  return data.phrases.length >= 3;
}

/** Título en dos líneas según el texto de COPY ("Lo que se dicen" / "Lo que se dicen en familia"). */
export function phrasesTitle(data: WrappedData): [string, string] {
  const full = copyFor(data.mode)['phrases.title'];
  return full === 'Lo que se dicen' ? ['Lo que se', 'dicen'] : ['Lo que se dicen', full.slice('Lo que se dicen '.length)];
}

/** Persona que más dijo la expresión. */
export function topSayer(p: Phrase): { name: string; count: number } {
  return p.byPerson.reduce((best, b) => (b.count > best.count ? b : best), p.byPerson[0]);
}

/** Pie: "Se lo dijeron {n} veces. Una cada {x} días." si la top es cariñosa y viene de las semillas; si no, el cierre del modo. */
export function phrasesOutro(data: WrappedData): string {
  const top = data.phrases[0];
  if (top && top.seeded && isTender(top.key) && top.count > 0) {
    const x = data.spanDays / top.count;
    const every = x < 1 ? 'Más de una por día.' : Math.round(x) <= 1 ? 'Una por día.' : `Una cada ${Math.round(x)} días.`;
    return `Se lo dijeron ${fmtInt(top.count)} ${top.count === 1 ? 'vez' : 'veces'}. ${every}`;
  }
  return copyFor(data.mode)['phrases.outro'];
}

/** Tarjeta del reporte completo: Lo que se dicen (expresiones descubiertas del chat). */
export function drawCardPhrases(ctx: CanvasRenderingContext2D, data: WrappedData, opts: CardOpts = {}): void {
  const t = opts.theme ?? THEMES.coral;
  frame(ctx, t, data.year);
  const [l1, l2] = phrasesTitle(data);
  title2(ctx, t, l1, l2);
  const soft = t.dark ? t.sub : INK_72;
  text(ctx, 'Sus expresiones, sacadas de su chat', MARGIN, 326, {
    weight: 500, size: 19, color: soft, baseline: 'middle', maxWidth: CONTENT_W,
  });

  const rows = data.phrases.slice(0, 5);
  const top = 365;
  const rowH = Math.min(116, 580 / Math.max(rows.length, 1));
  const maxCount = Math.max(...rows.map((r) => r.count), 1);

  rows.forEach((r, i) => {
    const y = top + i * rowH;
    text(ctx, `«${r.text}»`, MARGIN, y + 28, {
      weight: 800, size: 38, family: HEAD, color: t.fg, tracking: -0.04, baseline: 'middle', maxWidth: CONTENT_W - 120,
    });
    text(ctx, fmtInt(r.count), W - MARGIN, y + 28, {
      weight: 800, size: 34, family: HEAD, color: t.fg, tracking: -0.03, align: 'right', baseline: 'middle',
    });
    const by = y + 50;
    const bh = 24;
    fillRR(ctx, MARGIN, by, CONTENT_W, bh, bh / 2, t.track);
    if (data.mode.size === 'duo' && r.byPerson.length === 2) {
      const [a, b] = r.byPerson;
      const sc = splitColors(t);
      const GAP = 4; // separación visible entre los dos tramos
      const total = Math.max(1, a.count + b.count);
      const wa = Math.round((CONTENT_W * a.count) / total);
      if (a.count > 0) {
        const w = b.count > 0 ? Math.max(bh, wa - GAP / 2) : CONTENT_W;
        fillRR(ctx, MARGIN, by, w, bh, bh / 2, sc.a);
      }
      if (b.count > 0) {
        const wb = a.count > 0 ? Math.max(bh, CONTENT_W - wa - GAP / 2) : CONTENT_W;
        fillRR(ctx, MARGIN + CONTENT_W - wb, by, wb, bh, bh / 2, sc.b);
        if (sc.bLine) strokeRR(ctx, MARGIN + CONTENT_W - wb, by, wb, bh, bh / 2, sc.bLine, 3);
      }
      // Leyenda con el color de cada persona.
      const ly = by + bh + 19;
      legendDot(ctx, MARGIN + 7, ly, sc.a, null);
      text(ctx, `${a.name} · ${fmtInt(a.count)}`, MARGIN + 20, ly, {
        weight: 600, size: 17, color: soft, baseline: 'middle', maxWidth: CONTENT_W / 2 - 30,
      });
      const right = `${b.name} · ${fmtInt(b.count)}`;
      const rw = Math.min(measure(ctx, right, 600, 17), CONTENT_W / 2 - 30);
      legendDot(ctx, W - MARGIN - rw - 13, ly, sc.b, sc.bLine);
      text(ctx, right, W - MARGIN, ly, {
        weight: 600, size: 17, color: soft, align: 'right', baseline: 'middle', maxWidth: CONTENT_W / 2 - 30,
      });
    } else {
      fillRR(ctx, MARGIN, by, Math.max(bh, (CONTENT_W * r.count) / maxCount), bh, bh / 2, t.barFill);
      const who = topSayer(r);
      if (who) {
        text(ctx, `más: ${who.name}`, MARGIN, by + bh + 19, {
          weight: 600, size: 17, color: soft, baseline: 'middle', maxWidth: CONTENT_W,
        });
      }
    }
  });

  // Pie
  strongBox(ctx, t, MARGIN, 960, CONTENT_W, 90, 28);
  const outro = phrasesOutro(data);
  const m = /^(Se lo dijeron )(\S+ \S+)(\. .*)$/.exec(outro);
  const segs = m
    ? [{ t: m[1] }, { t: m[2], color: t.strongAccent, weight: 700 }, { t: m[3] }]
    : [{ t: outro, weight: 700 }];
  rich(ctx, segs, MARGIN + 28, 1000, CONTENT_W - 56, 30, 24, t.strongFg, 600);

  footer(ctx, t, pageLabel(opts, 3));
}
