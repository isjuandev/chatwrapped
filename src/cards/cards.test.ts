import { describe, expect, it } from 'vitest';
import { parseChat } from '../parser';
import { GROUP_4, IOS_12H_ES } from '../parser/__fixtures__';
import { computeWrapped, hideNames } from '../metrics';
import { drawCard1, drawCard2, drawCard3, drawCard4, drawCard5, drawCard6 } from './index';
import { PAREJA, PARCHE } from '../modes';

/** Contexto falso que registra el texto dibujado. */
function fakeCtx(): { ctx: CanvasRenderingContext2D; texts: string[] } {
  const texts: string[] = [];
  const target: Record<string, unknown> = { letterSpacing: '0px' };
  const ctx = new Proxy(target, {
    get(t, k: string) {
      if (k === 'measureText') return (s: string) => ({ width: s.length * 9 });
      if (k === 'fillText') return (s: string) => texts.push(s);
      if (k in t) return t[k];
      return () => undefined;
    },
    set(t, k: string, v) {
      t[k] = v;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, texts };
}

const draws = [drawCard1, drawCard2, drawCard3, drawCard4, drawCard5, drawCard6];

describe('tarjetas', () => {
  for (const [label, text, mode] of [
    ['pareja', IOS_12H_ES, PAREJA],
    ['grupo', GROUP_4, PARCHE],
  ] as const) {
    it(`dibujan las 6 sin lanzar errores (${label}), también con nombres ocultos`, () => {
      const data = computeWrapped(parseChat(text), mode);
      for (const d of [data, hideNames(data)]) {
        draws.forEach((draw, i) => {
          const { ctx, texts } = fakeCtx();
          expect(() => draw(ctx, d, { index: i + 1 })).not.toThrow();
          expect(texts).toContain('chat wrapped');
        });
      }
    });
  }

  it('la tarjeta 2 usa "N de cada M" y los nombres reales u ocultos', () => {
    const data = computeWrapped(parseChat(IOS_12H_ES), PAREJA);
    const a = fakeCtx();
    drawCard2(a.ctx, data, { index: 2 });
    expect(a.texts.some((t) => t.includes(data.people[0].name))).toBe(true);
    const b = fakeCtx();
    drawCard2(b.ctx, hideNames(data), { index: 2 });
    expect(b.texts.some((t) => t.includes(data.people[0].name))).toBe(false);
  });
});
