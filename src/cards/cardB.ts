import type { StickerStat, WrappedData } from '../types';
import { fmtInt, plural } from '../format';
import {
  box, CardOpts, CONTENT_W, fillRR, footer, frame, MARGIN, pageLabel, rich, text, THEMES, title2,
} from './draw';
import { alpha, P } from '../palette';

export const STICKER_BG = alpha(P.cream, 0.72);

/** Dibuja el sticker centrado y contenido en (x, y, size). Si no hay bitmap, un marcador. */
export function drawSticker(
  ctx: CanvasRenderingContext2D, bmp: ImageBitmap | null | undefined, cx: number, cy: number, size: number,
  fg: string,
): void {
  if (!bmp) {
    fillRR(ctx, cx - size / 2, cy - size / 2, size, size, 24, 'rgba(128,128,128,0.18)');
    text(ctx, 'sticker', cx, cy, { weight: 600, size: 20, color: fg, align: 'center', baseline: 'middle' });
    return;
  }
  const k = Math.min(size / bmp.width, size / bmp.height);
  const w = bmp.width * k;
  const h = bmp.height * k;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, cx - w / 2, cy - h / 2, w, h);
  ctx.restore();
}

/** Tarjeta B: Su sticker del año. */
export function drawCardStickers(ctx: CanvasRenderingContext2D, data: WrappedData, opts: CardOpts = {}): void {
  const t = opts.theme ?? THEMES.lime;
  frame(ctx, t, data.year);
  title2(ctx, t, 'Su sticker', 'del año');

  const list: StickerStat[] = data.topStickers.slice(0, 3);
  const first = list[0];
  if (!first) {
    footer(ctx, t, pageLabel(opts, 11));
    return;
  }
  const bm = opts.bitmaps ?? [];
  const only = list.length === 1;

  // Sticker #1
  const bh = only ? 470 : 360;
  const by = 345;
  // Fondo claro bajo los stickers: muchos son transparentes o del mismo color del tema.
  fillRR(ctx, MARGIN, by, CONTENT_W, bh, 28, STICKER_BG);
  box(ctx, t, MARGIN, by, CONTENT_W, bh, 28);
  drawSticker(ctx, bm[0], MARGIN + CONTENT_W / 2, by + bh / 2, only ? 380 : 300, t.fg);

  const ty = by + bh + 44;
  rich(
    ctx,
    [
      { t: `enviado ${fmtInt(first.count)} ${plural(first.count, 'vez', 'veces')} · más que nadie: ` },
      { t: first.topSender, weight: 800 },
    ],
    MARGIN, ty, CONTENT_W, 32, 24, t.fg, 500,
  );

  // #2 y #3, pequeños
  const small = list.slice(1);
  const gx = 18;
  const sw = (CONTENT_W - gx) / 2;
  small.forEach((s, i) => {
    const x = MARGIN + i * (sw + gx);
    const y = 820;
    const h = 225;
    fillRR(ctx, x, y, sw, h, 24, STICKER_BG);
    box(ctx, t, x, y, sw, h, 24);
    drawSticker(ctx, bm[i + 1], x + sw / 2, y + 98, 150, t.fg);
    text(ctx, `${fmtInt(s.count)} ${plural(s.count, 'vez', 'veces')}`, x + sw / 2, y + h - 28, {
      weight: 700, size: 21, color: t.fg, align: 'center', baseline: 'middle',
    });
  });

  footer(ctx, t, pageLabel(opts, 11));
}
