import { describe, expect, it } from 'vitest';
import { AMIGO_DUO, FAMILIA_DUO, FAMILIA_GRUPO, PAREJA, PARCHE } from '../modes';
import { readChat, buildWrapped } from '../process';
import type { Message, Mode } from '../types';
import { computeWrapped, hideNames } from './index';
import { hasPhrase, KEYWORDS, matchesKeywords, normalizeForMatch } from './keywords';

const MIN = 60_000;
const DAY = 24 * 60 * MIN;
const base = new Date(2025, 2, 1, 0, 0, 0).getTime();

type Item = [day: number, hour: number, author: string, text: string, type?: Message['type']];

/** Mensajes sintéticos ordenados por tiempo. */
function chat(items: Item[]): Message[] {
  return items
    .map(([day, hour, author, text, type], i): Message => ({
      ts: base + day * DAY + hour * 60 * MIN + (i % 50) * MIN,
      author,
      text,
      type: type ?? 'text',
      edited: false,
      link: false,
    }))
    .sort((a, b) => a.ts - b.ts);
}

/** Relleno de charla neutra a las 15 h. */
function filler(n: number, author: string, from = 0): Item[] {
  return Array.from({ length: n }, (_, i): Item => [from + i, 15, author, 'ok listo']);
}

const cand = (m: Mode, msgs: Message[], id: string) =>
  computeWrapped(msgs, m).awardCandidates.find((a) => a.id === id);
const ids = (m: Mode, msgs: Message[]) => computeWrapped(msgs, m).awardCandidates.map((a) => a.id);

describe('keywords', () => {
  it('normaliza tildes, mayúsculas y puntuación', () => {
    expect(normalizeForMatch('¡Buenos DÍAS, familia! 🌻')).toBe('buenos dias familia');
  });
  it('compara por palabra completa', () => {
    expect(hasPhrase(normalizeForMatch('hoy hay un planeta nuevo'), KEYWORDS.planes.phrases)).toBe(false);
    expect(hasPhrase(normalizeForMatch('Hagamos un PLAN'), KEYWORDS.planes.phrases)).toBe(true);
    expect(hasPhrase(normalizeForMatch('mi amorcito'), KEYWORDS.cursi.phrases)).toBe(false);
    expect(hasPhrase(normalizeForMatch('Quién se apunta?'), KEYWORDS.planes.phrases)).toBe(true);
  });
  it('emojis, con y sin selector de variante', () => {
    expect(matchesKeywords('te mando ❤ un abrazo', KEYWORDS.cursi)).toBe(true);
    expect(matchesKeywords('qué día 🌻', KEYWORDS.buenosDias)).toBe(true);
    expect(matchesKeywords('hola', KEYWORDS.cursi)).toBe(false);
  });
});

describe('premios propios de Familia', () => {
  const msgs = chat([
    ...filler(60, 'Mamá', 0),
    ...filler(36, 'Papá', 0),
    [100, 7, 'Mamá', 'Buenos días familia 🌻'],
    [101, 7, 'Mamá', 'Bendiciones'],
    [102, 9, 'Mamá', 'buen dia'],
    [103, 8, 'Papá', 'buenos dias'],
    [104, 15, 'Mamá', 'buenos días'], // fuera de las 5–10 a. m.
    [105, 6, 'Papá', 'cadena', 'image'],
    [106, 7, 'Papá', 'x'.repeat(320)],
    [107, 7, 'Papá', 'x'.repeat(100)], // corto: no es cadena
    [108, 14, 'Papá', 'foto', 'image'], // fuera de las 5–9 a. m.
    [109, 6, 'Papá', 'otra cadena', 'image'],
    // Buenos días exige ≥ 5 en el año: tres saludos más de Mamá.
    [110, 7, 'Mamá', 'Buenos días'],
    [111, 6, 'Mamá', '🌻'],
    [112, 8, 'Mamá', 'bendiciones familia'],
    [200, 12, 'Tío', 'hola a todos'],
  ]);

  it('buenos días: cuenta saludos y emojis entre 5 y 10 a. m. (sin tildes, sin mayúsculas)', () => {
    const c = cand(FAMILIA_GRUPO, msgs, 'buenosdias')!;
    expect(c.winner).toBe('Mamá');
    expect(c.detail).toBe('6 saludos de buenos días');
  });

  it('cadenas: textos largos e imágenes de madrugada', () => {
    const c = cand(FAMILIA_GRUPO, msgs, 'cadenas')!;
    expect(c.winner).toBe('Papá');
    expect(c.detail).toBe('3 cadenas y reenvíos en el año');
  });

  it('el que no lee el grupo: < 3 % pero ≥ 1, con tono cariñoso', () => {
    const c = cand(FAMILIA_GRUPO, msgs, 'nolee')!;
    expect(c.winner).toBe('Tío');
    expect(c.title).toBe('El que no lee el grupo');
    expect(c.detail).toBe('Escribió 1 vez en todo el año. Igual lo queremos.');
  });

  it('nolee no aparece en familia de 2 ni en otros modos; los demás de familia sí en ambos tamaños', () => {
    expect(ids(PARCHE, msgs)).not.toContain('nolee');
    const greet = Array.from({ length: 5 }, (_, i): Item => [100 + i, 7, 'Mamá', 'buenos días']);
    const duo = chat([...filler(60, 'Mamá', 0), ...filler(40, 'Hijo', 0), ...greet]);
    const duoIds = ids(FAMILIA_DUO, duo);
    expect(duoIds).not.toContain('nolee');
    expect(duoIds).toContain('buenosdias');
  });

  it('nolee exige que nadie esté por encima del 3 % para aparecer', () => {
    const even = chat([...filler(50, 'A', 0), ...filler(50, 'B', 0), ...filler(50, 'C', 0)]);
    expect(ids(FAMILIA_GRUPO, even)).not.toContain('nolee');
  });

  it('los premios de familia no compiten en parche ni pareja', () => {
    for (const m of [PARCHE, PAREJA, AMIGO_DUO]) {
      const got = ids(m, msgs);
      expect(got).not.toContain('buenosdias');
      expect(got).not.toContain('cadenas');
    }
  });
});

describe('premios propios de Parche / Mejor amigo/a', () => {
  const msgs = chat([
    ...filler(40, 'Ana', 0),
    ...filler(40, 'Beto', 0),
    [100, 20, 'Ana', 'Vamos al cine?'],
    [101, 20, 'Ana', 'quién se apunta'],
    [102, 20, 'Ana', 'caigan a mi casa'],
    [103, 20, 'Beto', 'hay un plan para hoy'],
    [104, 20, 'Beto', 'el planeta tierra'], // no cuenta
    [105, 21, 'Beto', 'ya supiste lo de Carlos'],
    [106, 21, 'Beto', 'no le digas a nadie, es chisme'],
    [107, 21, 'Ana', 'viste lo de Juan?'],
    [108, 21, 'Beto', 'qué chisme tan bueno'],
  ]);

  it('el que propone y nunca va', () => {
    for (const m of [PARCHE, AMIGO_DUO]) {
      const c = cand(m, msgs, 'propone')!;
      expect(c.winner).toBe('Ana');
      expect(c.detail).toBe('Lanzó 3 planes en el año');
    }
  });

  it('el chismoso', () => {
    for (const m of [PARCHE, AMIGO_DUO]) {
      const c = cand(m, msgs, 'chismoso')!;
      expect(c.winner).toBe('Beto');
      expect(c.detail).toBe('3 mensajes de chisme');
    }
  });

  it('no existen en pareja ni familia', () => {
    for (const m of [PAREJA, FAMILIA_DUO, FAMILIA_GRUPO]) {
      const got = ids(m, msgs);
      expect(got).not.toContain('propone');
      expect(got).not.toContain('chismoso');
    }
  });

  it('el empujón de +25 % sobre la notoriedad suavizada: Beto 3 vs Ana 1 → (3+5)/(1+5) × 1,25', () => {
    expect(cand(PARCHE, msgs, 'chismoso')!.notoriety).toBeCloseTo((8 / 6) * 1.25, 5);
  });

  it('sin dato no hay premio', () => {
    expect(ids(PARCHE, chat([...filler(30, 'Ana'), ...filler(30, 'Beto')]))).not.toContain('chismoso');
  });
});

describe('premios propios de Pareja', () => {
  const msgs = chat([
    ...filler(40, 'Juana', 0),
    ...filler(40, 'Camilo', 0),
    [100, 12, 'Juana', 'te amo mi vida'],
    [101, 12, 'Juana', 'te quiero 😘'],
    [102, 12, 'Juana', '❤️'],
    [103, 12, 'Camilo', 'amor'],
    // El cursi exige ≥ 5 mensajes cursis: dos más de Juana.
    [111, 12, 'Juana', 'te amo'],
    [112, 12, 'Juana', 'mi vida 🥰'],
    [104, 22, 'Juana', 'buenas noches'],
    [105, 23, 'Juana', 'Descansa'],
    [106, 1, 'Juana', 'que sueñes bonito'],
    [107, 15, 'Camilo', 'buenas noches'], // fuera de las 9 p. m.–2 a. m.
    [108, 23, 'Camilo', 'buenas noches amor'],
    // Buenas noches exige ≥ 5: dos más de Juana.
    [109, 22, 'Juana', 'buenas noches'],
    [110, 23, 'Juana', 'descansa'],
  ]);

  it('el cursi: mayor proporción de mensajes cursis', () => {
    const c = cand(PAREJA, msgs, 'cursi')!;
    expect(c.winner).toBe('Juana');
    expect(c.detail).toMatch(/^Se pone cursi en 1 de cada \d+ mensajes$/);
  });

  it('el de las buenas noches: solo entre 9 p. m. y 2 a. m.', () => {
    const c = cand(PAREJA, msgs, 'buenasnoches')!;
    expect(c.winner).toBe('Juana');
    expect(c.detail).toBe('5 buenas noches en el año');
  });

  it('no existen en amigos ni familia', () => {
    for (const m of [AMIGO_DUO, FAMILIA_DUO, PARCHE, FAMILIA_GRUPO]) {
      const got = ids(m, msgs);
      expect(got).not.toContain('cursi');
      expect(got).not.toContain('buenasnoches');
    }
  });

  it('ocultar nombres respeta los premios propios', () => {
    const w = computeWrapped(msgs, PAREJA);
    const h = hideNames(w);
    expect(h.awards.every((a) => /^[A-Z]\.$/.test(a.winner))).toBe(true);
  });
});

describe('recalcular sin releer el archivo', () => {
  it('readChat una vez y buildWrapped con distintos modos', async () => {
    const text = [
      '14/02/2025, 23:03 - Ana: hola',
      '14/02/2025, 23:04 - Beto: buenas',
      '14/02/2025, 23:05 - Caro: ¿vamos?',
    ].join('\n');
    const read = await readChat({ fileName: 'chat.txt', text, mode: PAREJA });
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    const a = buildWrapped(read.ctx, PARCHE);
    const b = buildWrapped(read.ctx, FAMILIA_GRUPO);
    expect(a.ok && a.data.participants).toBe(3);
    expect(a.ok && a.data.groupName).toBe('El parche');
    expect(b.ok && b.data.groupName).toBe('La familia');
    const d = buildWrapped(read.ctx, PAREJA);
    expect(d.ok && d.data.people).toHaveLength(2);
    expect(d.ok && d.data.participants).toBe(3);
  });
});

describe('premios de conteo con pocos datos', () => {
  it('2 saludos en un año no alcanzan para El de los buenos días', () => {
    const msgs = chat([...filler(60, 'Mamá', 0), ...filler(40, 'Papá', 0), [100, 7, 'Mamá', 'buenos días'], [101, 7, 'Mamá', 'buen día']]);
    expect(ids(FAMILIA_GRUPO, msgs)).not.toContain('buenosdias');
  });
});

describe('premios de proporcion con pocos datos', () => {
  it('2 mensajes cursis no alcanzan para El cursi', () => {
    const msgs = chat([...filler(40, 'Juana', 0), ...filler(40, 'Camilo', 0), [100, 12, 'Juana', 'te amo'], [101, 12, 'Juana', 'mi vida']]);
    expect(ids(PAREJA, msgs)).not.toContain('cursi');
  });
});
