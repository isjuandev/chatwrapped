import { describe, expect, it } from 'vitest';
import { COPY, COPY_KEYS, copyFor } from '../copy';
import { FEATURES } from '../config';
import { fullReportButton } from '../fullReport';
import { computeWrapped, hideNames } from '../metrics';
import { PHRASE_SETS } from '../metrics/keywords';
import { AMIGO_DUO, FAMILIA_DUO, FAMILIA_GRUPO, PAREJA, PARCHE } from '../modes';
import type { Message, Mode, WrappedData } from '../types';
import { CARDS, buildDeck, deckThemes, drawerOf } from './deck';
import type { CardId } from './deck';
import { evolutionChange, evolutionSummary, halfRange, topWriter } from './cardEvolution';
import { phrasesOutro, phrasesTitle } from './cardPhrases';
import { timeHero } from './cardTime';
import { THEMES } from './draw';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

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

const msg = (ts: number, author: string, text: string): Message => ({
  ts, author, text, type: 'text', edited: false, link: false,
});

/** Fecha local: día `d` desde el 1 de enero de 2025, a la hora h:m. */
const at = (d: number, h: number, m = 0): number => new Date(2025, 0, 1 + d, h, m, 0).getTime();

describe('conversaciones (tiempo hablado)', () => {
  const base = new Date(2025, 2, 3, 10, 0, 0).getTime();
  const ms: Message[] = [
    msg(base, 'Ana', 'hola'),
    msg(base + 10 * MIN, 'Beto', 'hola'),
    // hueco de 40 min: otra conversación, de un solo mensaje (dura 1 min como mínimo)
    msg(base + 50 * MIN, 'Ana', 'ya'),
  ];
  // Un día después: 13 mensajes cada 25 min = 5 h seguidas
  for (let i = 0; i < 13; i++) ms.push(msg(base + DAY + i * 25 * MIN, i % 2 ? 'Beto' : 'Ana', 'x'));
  const w = computeWrapped(ms, PAREJA);

  it('cuenta, suma, promedia y encuentra la más larga', () => {
    expect(w.time.conversations).toBe(3);
    expect(w.time.totalMs).toBe((10 + 1 + 300) * MIN);
    expect(w.time.avgMs).toBeCloseTo((311 * MIN) / 3);
    expect(w.time.longest).toEqual({ ms: 300 * MIN, iso: '2025-03-04', messages: 13 });
  });

  it('un hueco de exactamente 30 min parte la conversación; de 29 min 59 s no', () => {
    const a = computeWrapped([msg(base, 'Ana', 'a'), msg(base + 30 * MIN, 'Beto', 'b')], PAREJA);
    expect(a.time.conversations).toBe(2);
    const b = computeWrapped([msg(base, 'Ana', 'a'), msg(base + 30 * MIN - 1000, 'Beto', 'b')], PAREJA);
    expect(b.time.conversations).toBe(1);
    expect(b.time.longest?.messages).toBe(2);
  });

  it('el héroe: horas, días enteros o películas', () => {
    const mk = (totalMs: number): WrappedData => ({ ...w, time: { ...w.time, totalMs } });
    expect(timeHero(mk(412 * HOUR))).toEqual({ word: '412 horas', phrase: '= 17,2 días enteros' });
    expect(timeHero(mk(24 * HOUR))).toEqual({ word: '24 horas', phrase: '= 1 día entero' });
    expect(timeHero(mk(6 * HOUR))).toEqual({ word: '6 horas', phrase: '= 3 películas' });
    expect(timeHero(mk(40 * MIN))).toEqual({ word: '40 minutos', phrase: '= menos de una película' });
  });
});

/** 200 días: la 2.ª mitad con el doble de mensajes y respuestas más rápidas. */
function twoHalves(): Message[] {
  const out: Message[] = [];
  for (let d = 0; d < 200; d++) {
    const second = d >= 100;
    const ana = ['hola', 'dale'];
    if (second && d < 106) ana.push('omaiga');
    if (second && d < 105) ana.push('sisas');
    if (d === 10) ana.push('sisas');
    if ((second && d < 105) || d === 10 || d === 11) ana.push('tarea');
    out.push(msg(at(d, 10, 0), 'Ana', ana.join(' ')));
    if (!second) {
      out.push(msg(at(d, 10, 5), 'Beto', 'listo'));
    } else {
      out.push(msg(at(d, 10, 1), 'Beto', 'listo'));
      out.push(msg(at(d, 10, 2), 'Ana', 'dale'));
      out.push(msg(at(d, 10, 3), 'Beto', 'listo'));
    }
  }
  return out;
}

describe('antes vs. ahora', () => {
  const w = computeWrapped(twoHalves(), PAREJA);
  const { first, second } = w.evolution;

  it('parte la ventana en dos mitades por tiempo', () => {
    expect(w.spanDays).toBe(200);
    expect(first.messages).toBe(200);
    expect(second.messages).toBe(400);
    expect(first.messages + second.messages).toBe(w.total);
    expect(first.perDay).toBeCloseTo(2);
    expect(second.perDay).toBeCloseTo(4);
    expect(first.startIso).toBe('2025-01-01');
    expect(second.endIso).toBe('2025-07-19');
    expect(evolutionChange(w)).toBe(100);
  });

  it('mediana de respuesta y % de cada persona por mitad', () => {
    expect(first.medianResponseMs).toBe(5 * MIN);
    expect(second.medianResponseMs).toBe(1 * MIN);
    const ana = w.people.findIndex((p) => p.name === 'Ana');
    expect(first.shares[ana]).toBeCloseTo(0.5);
    expect(second.shares[ana]).toBeCloseTo(0.5);
    expect(topWriter(w, first)?.pct).toBe(50);
  });

  it('palabras nuevas: ≥ 5 usos en la 2.ª mitad y ≤ 1 en la 1.ª, top por uso', () => {
    // omaiga: 6 y 0 · sisas: 5 y 1 · tarea: 5 y 2 (no es nueva)
    expect(w.evolution.newWords).toEqual([
      { word: 'omaiga', count: 6 },
      { word: 'sisas', count: 5 },
    ]);
  });

  it('frase resumen según el cambio de mensajes por día (y por modo)', () => {
    expect(evolutionSummary(w)).toBe('Cada vez hablan más.');
    const withPerDay = (a: number, b: number): WrappedData => ({
      ...w, evolution: { ...w.evolution, first: { ...first, perDay: a }, second: { ...second, perDay: b } },
    });
    expect(evolutionSummary(withPerDay(10, 12))).toBe('Cada vez hablan más.'); // +20 % exacto
    expect(evolutionSummary(withPerDay(10, 8))).toBe('Se calmaron un poco… pero siguen aquí.'); // −20 %
    expect(evolutionSummary(withPerDay(10, 11))).toBe('Mismo ritmo de siempre.');
    expect(evolutionSummary({ ...withPerDay(10, 20), mode: FAMILIA_GRUPO })).toBe('La familia cada vez habla más.');
  });

  it('etiquetas de fechas: "ene–jun" y, si cruza de año, con el año', () => {
    const h = { ...first, startIso: '2025-01-03', endIso: '2025-06-20' };
    expect(halfRange(h, false)).toBe('ene–jun');
    expect(halfRange({ ...h, startIso: '2025-10-03', endIso: '2026-03-20' }, true)).toBe('oct ’25–mar ’26');
    expect(halfRange({ ...h, startIso: '2025-03-03', endIso: '2025-03-20' }, false)).toBe('mar');
  });

  it('en grupo solo se muestra el top 1 de cada mitad', () => {
    const msgs: Message[] = [];
    for (let d = 0; d < 150; d++) {
      msgs.push(msg(at(d, 9, 0), 'Ana', 'hola'));
      msgs.push(msg(at(d, 9, 1), d < 75 ? 'Beto' : 'Carla', 'hola'));
      if (d >= 75) msgs.push(msg(at(d, 9, 2), 'Carla', 'hola'));
      else msgs.push(msg(at(d, 9, 2), 'Beto', 'hola'));
    }
    const g = computeWrapped(msgs, PARCHE);
    expect(topWriter(g, g.evolution.first)?.name).toBe('Beto');
    expect(topWriter(g, g.evolution.second)?.name).toBe('Carla');
  });
});

const W20 = ['casa', 'viaje', 'clase', 'plaza', 'banco', 'cine', 'mesa', 'libro', 'carta', 'noche', 'tarde', 'hotel', 'playa', 'fiesta', 'dinero', 'comida', 'tiempo', 'musica', 'trabajo', 'familia'];

describe('lo que se dicen (expresiones descubiertas)', () => {
  const phrase = (text: string, count: number, seeded = false): WrappedData['phrases'][number] => ({
    text, key: text, count, byPerson: [{ name: 'Ana', count }, { name: 'Beto', count: 0 }], seeded,
  });

  it('computeWrapped las descubre del propio chat y excluye lo que ya sale en "Así hablan"', () => {
    const msgs: Message[] = [];
    for (let d = 0; d < 40; d++) {
      msgs.push(msg(at(d, 9, 0), 'Ana', `qué chimba ${W20[d % 20]}`));
      msgs.push(msg(at(d, 9, 5), 'Beto', `ome ${W20[(d + 7) % 20]} nojoda`));
    }
    const w = computeWrapped(msgs, AMIGO_DUO);
    const t = w.phrases.map((p) => p.text);
    expect(t).toContain('qué chimba');
    expect(t).toContain('nojoda');
    expect(w.phrases.every((p) => p.byPerson.length === 2)).toBe(true);
    // Ocultar nombres también llega a los conteos por persona
    const h = hideNames(w);
    expect(h.phrases[0].byPerson.map((b) => b.name)).toEqual(h.people.map((p) => p.name));
    expect(h.phrases[0].byPerson.some((b) => /Ana|Beto/.test(b.name))).toBe(false);
  });

  it('pie: cariñoso (solo si es semilla) con la frecuencia, o el cierre del modo', () => {
    const w = computeWrapped(twoHalves(), PAREJA);
    const base: WrappedData = { ...w, spanDays: 180 };
    const withTop = (p: ReturnType<typeof phrase>): WrappedData => ({ ...base, phrases: [p] });
    expect(phrasesOutro(withTop(phrase('te amo', 90, true)))).toBe('Se lo dijeron 90 veces. Una cada 2 días.');
    expect(phrasesOutro(withTop(phrase('te amo', 1000, true)))).toBe('Se lo dijeron 1.000 veces. Más de una por día.');
    expect(phrasesOutro(withTop(phrase('te amo', 180, true)))).toBe('Se lo dijeron 180 veces. Una por día.');
    expect(phrasesOutro(withTop(phrase('qué chimba', 90)))).toBe('Así suenan ustedes.');
    expect(phrasesOutro({ ...withTop(phrase('qué chimba', 90)), mode: FAMILIA_GRUPO })).toBe('Así habla la familia.');
  });

  it('título: familia añade "en familia"', () => {
    const w = computeWrapped(twoHalves(), PAREJA);
    expect(phrasesTitle(w)).toEqual(['Lo que se', 'dicen']);
    expect(phrasesTitle({ ...w, mode: FAMILIA_DUO })).toEqual(['Lo que se dicen', 'en familia']);
  });

  it('las semillas por modo siguen existiendo (6 por relación, ids únicos)', () => {
    for (const rel of ['pareja', 'amigos', 'familia'] as const) {
      const ids = PHRASE_SETS[rel].map((p) => p.id);
      expect(ids).toHaveLength(6);
      expect(new Set(ids).size).toBe(6);
    }
  });
});

describe('textos del reporte completo por modo', () => {
  const modes: Mode[] = [PAREJA, AMIGO_DUO, FAMILIA_DUO, PARCHE, FAMILIA_GRUPO];
  it('las 5 combinaciones tienen todas las claves, sin marcadores sin resolver', () => {
    for (const m of modes) {
      const c = copyFor(m);
      for (const k of COPY_KEYS) expect(c[k], `${m.rel}/${m.size} ${k}`).toBeTruthy();
    }
    expect(Object.keys(COPY.pareja)).toEqual(['duo']);
  });
});

/** Un año con todo lo necesario para las 3 tarjetas completas. */
function fullYear(people: string[], extra: string[]): Message[] {
  const out: Message[] = [];
  for (let d = 0; d < 220; d++) {
    people.forEach((p, i) => {
      out.push(msg(at(d, 10, i * 2), p, `${extra[(d + i) % extra.length]} ${['casa', 'viaje', 'clase', 'plaza', 'banco'][(d + 2 * i) % 5]}`));
      out.push(msg(at(d, 15 + i, 0), p, d >= 110 ? `omaiga sisas ${d}` : `hola ${d}`));
    });
    out.push(msg(at(d, 22, 0), people[d % people.length], 'buenas noches'));
  }
  return out.sort((a, b) => a.ts - b.ts);
}

describe('mazo full vs. free', () => {
  const full = computeWrapped(fullYear(['Juana', 'Camilo'], ['te amo', 'te quiero', 'te extraño']), PAREJA);

  it('el reporte completo tiene su propio mazo, sin mezclar con la historia gratis', () => {
    const free = buildDeck(full);
    const fullDeck = buildDeck(full, 'full');
    expect(fullDeck).toEqual(['time', 'evolution', 'phrases']);
    for (const id of fullDeck) expect(free).not.toContain(id);
    for (const id of free) expect(fullDeck).not.toContain(id);
    expect(buildDeck(full, 'free')).toEqual(free);
    expect(CARDS.filter((c) => c.tier === 'full').map((c) => c.id)).toEqual(['time', 'evolution', 'phrases']);
    expect(CARDS.filter((c) => c.tier === 'free')).toHaveLength(16);
  });

  it('disponibilidad de cada tarjeta', () => {
    const base = full;
    expect(buildDeck(base, 'full')).toContain('time');
    // time: ≥ 10 conversaciones
    expect(buildDeck({ ...base, time: { ...base.time, conversations: 9 } }, 'full')).not.toContain('time');
    expect(buildDeck({ ...base, time: { ...base.time, conversations: 10 } }, 'full')).toContain('time');
    // evolution: ≥ 120 días entre el primero y el último
    expect(buildDeck({ ...base, spanDays: 119 }, 'full')).not.toContain('evolution');
    expect(buildDeck({ ...base, spanDays: 120 }, 'full')).toContain('evolution');
    // phrases: ≥ 3 frases con conteo ≥ 3
    expect(buildDeck({ ...base, phrases: base.phrases.slice(0, 2) }, 'full')).not.toContain('phrases');
    expect(buildDeck({ ...base, phrases: base.phrases.slice(0, 3) }, 'full')).toContain('phrases');
  });

  it('un chat corto no tiene reporte completo', () => {
    const short = computeWrapped([msg(at(0, 10), 'Ana', 'hola'), msg(at(0, 11), 'Beto', 'hola')], PAREJA);
    expect(buildDeck(short, 'full')).toEqual([]);
  });

  it('fondos distintos entre vecinas dentro del mazo full', () => {
    const themes = deckThemes(buildDeck(full, 'full'));
    for (let i = 1; i < themes.length; i++) expect(themes[i]).not.toBe(themes[i - 1]);
    // Si faltara una del medio, la regla de alternos se aplica solo dentro del mazo
    expect(deckThemes(['time', 'phrases'])).toEqual(['dark', 'coral']);
  });
});

describe('botón del reporte completo según los flags', () => {
  it('flags reales: gratis y abre directo', () => {
    expect(FEATURES.payments).toBe(false);
    expect(FEATURES.fullReportFree).toBe(true);
    expect(fullReportButton(FEATURES, 3)).toEqual({ label: 'Ver reporte completo', enabled: true, action: 'open' });
  });
  it('payments true: (futuro) flujo de pago', () => {
    expect(fullReportButton({ payments: true, fullReportFree: true }, 3)).toMatchObject({ enabled: true, action: 'pay' });
    expect(fullReportButton({ payments: true, fullReportFree: false }, 3)).toMatchObject({ action: 'pay' });
  });
  it('ambos false: deshabilitado, próximamente', () => {
    expect(fullReportButton({ payments: false, fullReportFree: false }, 3)).toEqual({
      label: 'Reporte completo · Próximamente', enabled: false, action: 'none',
    });
  });
  it('sin tarjetas disponibles: "muy corto", deshabilitado', () => {
    expect(fullReportButton({ payments: false, fullReportFree: true }, 0)).toEqual({
      label: 'Tu chat es muy corto para el reporte completo', enabled: false, action: 'none',
    });
  });
});

describe('dibujo de las tarjetas del reporte completo', () => {
  const cases: [Mode, string[], string[]][] = [
    [PAREJA, ['Juana', 'Camilo'], ['te amo', 'te quiero', 'te extraño']],
    [AMIGO_DUO, ['Juana', 'Camilo'], ['parce', 'qué más', 'de una']],
    [FAMILIA_DUO, ['Juana', 'Camilo'], ['gracias', 'bendiciones', 'ya llegaste']],
    [PARCHE, ['Juana', 'Camilo', 'Lucía', 'Pedro'], ['parce', 'qué más', 'qué hacemos']],
    [FAMILIA_GRUPO, ['Juana', 'Camilo', 'Lucía'], ['gracias', 'bendiciones', 'ya comiste']],
  ];
  for (const [mode, people, extra] of cases) {
    it(`${mode.rel}/${mode.size}: se dibujan con los 4 temas, rotulan "Reporte completo · N / M" y respetan Ocultar nombres`, () => {
      const data = computeWrapped(fullYear(people, extra), mode);
      const deck: CardId[] = buildDeck(data, 'full');
      expect(deck).toEqual(['time', 'evolution', 'phrases']);
      for (const d of [data, hideNames(data)]) {
        for (const theme of ['dark', 'cream', 'lime', 'coral'] as const) {
          deck.forEach((id, i) => {
            const { ctx, texts } = fakeCtx();
            expect(() => drawerOf(id)(ctx, d, {
              index: i + 1, total: deck.length, theme: THEMES[theme], tier: 'full',
            })).not.toThrow();
            expect(texts).toContain('chat wrapped');
            expect(texts).toContain(`Reporte completo · ${i + 1} / ${deck.length}`);
            if (d !== data) expect(texts.some((t) => /Juana|Camilo|Luc[ií]a|Pedro/.test(t))).toBe(false);
          });
        }
      }
    });
  }

  it('la historia gratis conserva su pie "N / M" sin el rótulo del reporte', () => {
    const data = computeWrapped(fullYear(['Juana', 'Camilo'], ['te amo']), PAREJA);
    const free = buildDeck(data);
    const { ctx, texts } = fakeCtx();
    drawerOf(free[1])(ctx, data, { index: 2, total: free.length });
    expect(texts).toContain(`2 / ${free.length}`);
    expect(texts.some((t) => t.startsWith('Reporte completo'))).toBe(false);
  });

  it('textos clave: tiempo, antes/ahora y frases', () => {
    const data = computeWrapped(fullYear(['Juana', 'Camilo'], ['te amo', 'te quiero', 'te extraño']), PAREJA);
    const t = fakeCtx();
    drawerOf('time')(t.ctx, data, { index: 1, total: 3, tier: 'full' });
    expect(t.texts).toContain('Cuánto tiempo hablaron');
    expect(t.texts).toContain('Su charla más larga');
    const e = fakeCtx();
    drawerOf('evolution')(e.ctx, data, { index: 2, total: 3, tier: 'full' });
    expect(e.texts).toContain('Antes vs.');
    expect(e.texts).toContain('Mensajes por día');
    expect(e.texts).toContain('Este año empezaron a decir:');
    const p = fakeCtx();
    drawerOf('phrases')(p.ctx, data, { index: 3, total: 3, tier: 'full' });
    expect(p.texts.some((x) => x.startsWith('«'))).toBe(true);
    expect(p.texts).toContain('Sus expresiones, sacadas de su chat');
    expect(p.texts.some((x) => x.startsWith('Juana ·'))).toBe(true);
  });
});
