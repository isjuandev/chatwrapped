import { describe, expect, it } from 'vitest';
import { copyFor, hourPhraseFor, weekdayPhraseFor } from '../copy';
import { computeWrapped } from '../metrics';
import { AMIGO_DUO, FAMILIA_DUO, FAMILIA_GRUPO, PAREJA, PARCHE } from '../modes';
import { parseChat } from '../parser';
import { GROUP_4, IOS_12H_ES } from '../parser/__fixtures__';
import { drawCard1 } from './card1';
import { drawCard3 } from './card3';
import { drawCard5 } from './card5';
import { drawCard6 } from './card6';
import { drawCardWeekday, topWeekday } from './cardD';

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

describe('las tarjetas leen los textos de COPY por modo', () => {
  const cases = [
    [PAREJA, IOS_12H_ES],
    [AMIGO_DUO, IOS_12H_ES],
    [FAMILIA_DUO, IOS_12H_ES],
    [PARCHE, GROUP_4],
    [FAMILIA_GRUPO, GROUP_4],
  ] as const;

  for (const [mode, text] of cases) {
    it(`${mode.rel}/${mode.size}`, () => {
      const data = computeWrapped(parseChat(text), mode);
      const c = copyFor(mode);

      const a = fakeCtx();
      drawCard1(a.ctx, data, { index: 1 });
      expect(a.texts).toContain(c['cover.kicker']);
      expect(a.texts).toContain(c['cover.bubble1']);
      expect(a.texts.some((t) => /mensajes después/.test(t) && !t.includes('{n}'))).toBe(true);

      const h = fakeCtx();
      drawCard3(h.ctx, data, { index: 5 });
      expect(h.texts).toContain(c['hour.lead']);
      expect(h.texts.join(' ')).toContain(hourPhraseFor(mode, data.peakHour).split(' ')[0]);

      const d = fakeCtx();
      drawCardWeekday(d.ctx, data, { index: 4 });
      expect(d.texts).toContain(c['weekday.lead']);
      expect(d.texts.join(' ')).toContain(weekdayPhraseFor(mode, topWeekday(data.weekdays)).split(' ')[0]);

      const e = fakeCtx();
      drawCard6(e.ctx, data, { index: 14 });
      expect(e.texts).toContain(c['end.bubble1']);

      const p = fakeCtx();
      expect(() => drawCard5(p.ctx, data, { index: 13 })).not.toThrow();
    });
  }
});
