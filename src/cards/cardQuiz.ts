import type { WrappedData } from '../types';
import { fmtRatio } from '../format';
import { pickQuiz, quizValueLabel } from '../metrics/quiz';
import {
  box, BODY, CardOpts, CONTENT_W, EMOJI, fillRR, footer, frame, HEAD, MARGIN, measure, pageLabel, strongBox, text, THEMES,
  W, wrap, INK_72,
} from './draw';
import { alpha, P } from '../palette';

export const quizAvailable = (data: WrappedData): boolean => pickQuiz(data) !== null;

const LETTERS = ['A', 'B', 'C', 'D'];

/** Tarjeta "El reto". Por defecto es la pregunta (sin ningún dato); con `opts.reveal` muestra la respuesta. */
export function drawCardQuiz(ctx: CanvasRenderingContext2D, data: WrappedData, opts: CardOpts = {}): void {
  const t = opts.theme ?? THEMES.coral;
  frame(ctx, t, data.year);
  const quiz = pickQuiz(data);
  if (!quiz) {
    footer(ctx, t, pageLabel(opts, 14));
    return;
  }
  const reveal = opts.reveal === true;

  text(ctx, 'El reto', MARGIN, 213, { weight: 500, size: 32, color: t.fg });

  // Pregunta: el tamaño más grande que quepa en un bloque de ~260 px de alto.
  let size = 84;
  let lines = wrap(ctx, quiz.question, CONTENT_W, 800, size, HEAD, -0.05);
  while (size > 46 && lines.length * size > 260) {
    size -= 2;
    lines = wrap(ctx, quiz.question, CONTENT_W, 800, size, HEAD, -0.05);
  }
  const qTop = 250 + size;
  lines.forEach((l, i) => {
    text(ctx, l, MARGIN, qTop + i * size, {
      weight: 800, size, family: HEAD, color: t.fg, tracking: -0.05, maxWidth: CONTENT_W,
    });
  });
  const qBottom = qTop + (lines.length - 1) * size;

  const n = quiz.options.length;
  const gap = 16;
  const top = qBottom + 52;
  const bottom = 985;
  const h = Math.min(reveal ? 150 : 130, (bottom - top - gap * (n - 1)) / n);
  const maxV = Math.max(...quiz.options.map((o) => o.value), 1);
  const soft = t.dark ? t.sub : INK_72;

  quiz.options.forEach((o, i) => {
    const y = top + i * (h + gap);
    if (!reveal) {
      // Pregunta: solo letra y nombre, todas las opciones con el mismo aspecto.
      box(ctx, t, MARGIN, y, CONTENT_W, h, 26);
      const d = Math.min(56, h - 28);
      fillRR(ctx, MARGIN + 22, y + (h - d) / 2, d, d, d / 2, t.strongBg);
      text(ctx, LETTERS[i], MARGIN + 22 + d / 2, y + h / 2 + 1, {
        weight: 800, size: 26, family: HEAD, color: t.strongAccent, align: 'center', baseline: 'middle',
      });
      text(ctx, o.name, MARGIN + 22 + d + 20, y + h / 2 + 1, {
        weight: 800, size: 38, family: HEAD, color: t.fg, tracking: -0.03, baseline: 'middle',
        maxWidth: CONTENT_W - d - 22 - 20 - 28,
      });
      return;
    }
    // Respuesta: el ganador en caja fuerte, cada opción con su dato y barra proporcional.
    const win = o.name === quiz.winner;
    const label = quizValueLabel(o.value, quiz.unit, fmtRatio);
    const labW = measure(ctx, label, 700, 24);
    const pad = 26;
    const nameMax = CONTENT_W - pad * 2 - labW - 16;
    if (win) {
      strongBox(ctx, t, MARGIN, y, CONTENT_W, h, 28);
      text(ctx, `¡${o.name}!`, MARGIN + pad, y + h * 0.38, {
        weight: 800, size: 40, family: HEAD, color: t.strongAccent, tracking: -0.03, baseline: 'middle',
        maxWidth: nameMax,
      });
    } else {
      box(ctx, t, MARGIN, y, CONTENT_W, h, 26);
      text(ctx, o.name, MARGIN + pad, y + h * 0.38, {
        weight: 800, size: 34, family: HEAD, color: t.fg, tracking: -0.03, baseline: 'middle', maxWidth: nameMax,
      });
    }
    text(ctx, label, MARGIN + CONTENT_W - pad, y + h * 0.38, {
      weight: 700, size: 24, color: win ? t.strongFg : soft, align: 'right', baseline: 'middle',
    });
    const bx = MARGIN + pad;
    const bw = CONTENT_W - pad * 2;
    const by = y + h - 34;
    fillRR(ctx, bx, by, bw, 14, 7, win ? alpha(P.cream, 0.18) : t.track);
    fillRR(ctx, bx, by, Math.max(14, (bw * o.value) / maxV), 14, 7, win ? t.strongAccent : t.bar);
  });

  // Pie de la tarjeta
  const msg = reveal ? 'Y tú, ¿acertaste?' : 'Mándasela y que adivine';
  const cy = 1034;
  ctx.font = `600 26px ${BODY}`;
  const w1 = ctx.measureText(msg).width;
  const emoji = reveal ? '' : ' 👀';
  const total = w1 + (emoji ? 40 : 0);
  const x0 = W / 2 - total / 2;
  text(ctx, msg, x0, cy, { weight: 600, size: 26, color: t.fg, baseline: 'middle' });
  if (emoji) {
    ctx.font = `26px ${EMOJI}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = t.fg;
    ctx.fillText('👀', x0 + w1 + 12, cy);
  }

  footer(ctx, t, pageLabel(opts, 14));
}
