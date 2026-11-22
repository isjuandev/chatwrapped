import { describe, expect, it } from 'vitest';
import { buildDeck, drawerOf } from '../cards/deck';
import { THEMES } from '../cards/draw';
import { PAREJA, PARCHE } from '../modes';
import type { Message, Mode, PersonStats, QuizCounts, WrappedData } from '../types';
import { computeWrapped } from './index';
import { pickQuiz, quizValueLabel } from './quiz';

const MIN = 60_000;

const zeroQuiz = (): QuizCounts => ({
  night: 0, laughMsgs: 0, emojis: 0, teAmo: 0, teExtrano: 0, perdon: 0, parce: 0, planes: 0, buenosDias: 0, gracias: 0,
});

type PersonOver = Partial<Omit<PersonStats, 'quiz'>> & { quiz?: Partial<QuizCounts> };

function person(name: string, count: number, over: PersonOver = {}): PersonStats {
  const { quiz, ...rest } = over;
  return {
    name, count, share: 0, audios: 0, avgResponseMs: null, stickers: 0, images: 0, videos: 0, gifs: 0, documents: 0,
    generic: 0, links: 0, deleted: 0, edited: 0, avgLength: 10, medianResponseMs: null, responses: 0, fastShare: null,
    signature: null, ...rest, quiz: { ...zeroQuiz(), ...quiz },
  };
}

/** Datos mínimos reales; luego se reemplazan modo y personas. */
function base(): WrappedData {
  const t0 = new Date(2025, 4, 1, 10, 0, 0).getTime();
  const ms: Message[] = [];
  for (let i = 0; i < 20; i++) {
    ms.push({ ts: t0 + i * 5 * MIN, author: i % 2 ? 'Ana' : 'Beto', text: `hola ${i}`, type: 'text', edited: false, link: false });
  }
  return computeWrapped(ms, PAREJA);
}

function make(mode: Mode, people: PersonStats[], extra: Partial<WrappedData> = {}): WrappedData {
  return { ...base(), mode, people, participants: people.length, groupName: 'Los Panas', ...extra };
}

describe('pickQuiz', () => {
  it('es válida solo con ganador ≥ 3 y ≥ 25 % sobre el segundo', () => {
    const mk = (a: number, b: number): WrappedData =>
      make(PAREJA, [person('Ana', 50, { stickers: a }), person('Beto', 40, { stickers: b })]);
    expect(pickQuiz(mk(2, 0))).toBeNull(); // menos de 3
    expect(pickQuiz(mk(10, 9))).toBeNull(); // empate técnico
    expect(pickQuiz(mk(10, 8))?.id).toBe('stickers'); // exactamente +25 %
    const q = pickQuiz(mk(10, 4))!;
    expect(q.winner).toBe('Ana');
    expect(q.unit).toBe('stickers');
    expect(q.options).toEqual([{ name: 'Ana', value: 10 }, { name: 'Beto', value: 4 }]);
  });

  it('prefiere las preguntas propias del modo aunque otra general tenga más margen', () => {
    const people = [
      person('Ana', 50, { stickers: 100, quiz: { teAmo: 9 } }),
      person('Beto', 40, { stickers: 1, quiz: { teAmo: 6 } }),
    ];
    expect(pickQuiz(make(PAREJA, people))?.id).toBe('teamo');
    // En amigos "te amo" no existe: gana la general.
    expect(pickQuiz(make({ size: 'duo', rel: 'amigos' }, people))?.id).toBe('stickers');
    // Familia tampoco tiene las de pareja.
    expect(pickQuiz(make({ size: 'duo', rel: 'familia' }, people))?.id).toBe('stickers');
  });

  it('entre las propias del modo elige la de mayor margen', () => {
    const people = [
      person('Ana', 50, { quiz: { parce: 10, planes: 30 } }),
      person('Beto', 40, { quiz: { parce: 2, planes: 6 } }),
    ];
    expect(pickQuiz(make({ size: 'duo', rel: 'amigos' }, people))?.id).toBe('parce'); // 5× vs 5× → gana el primero del banco
    const people2 = [
      person('Ana', 50, { quiz: { parce: 10, planes: 40 } }),
      person('Beto', 40, { quiz: { parce: 5, planes: 4 } }),
    ];
    expect(pickQuiz(make({ size: 'duo', rel: 'amigos' }, people2))?.id).toBe('planes'); // 10× vs 2×
  });

  it('grupo: top 4 por mensajes y el ganador siempre entra (reemplaza al 4.º)', () => {
    const people = [
      person('Zoe', 100, { stickers: 5 }),
      person('Yago', 90, { stickers: 4 }),
      person('Xena', 80, { stickers: 3 }),
      person('Walt', 70, { stickers: 2 }),
      person('Vera', 60, { stickers: 1 }),
      person('Ana', 10, { stickers: 40 }),
    ];
    const q = pickQuiz(make(PARCHE, people))!;
    expect(q.winner).toBe('Ana');
    expect(q.options).toHaveLength(4);
    // Zoe, Yago y Xena (top 3) se mantienen; Walt (4.º) sale.
    expect(q.options.map((o) => o.name)).toEqual(['Ana', 'Xena', 'Yago', 'Zoe']);
  });

  it('las opciones van ordenadas por nombre y el resultado es determinista', () => {
    const people = [
      person('Camilo', 50, { audios: 3 }),
      person('Beto', 40, { audios: 30 }),
      person('Ana', 30, { audios: 1 }),
    ];
    const d = make(PARCHE, people);
    const a = pickQuiz(d);
    expect(a).toEqual(pickQuiz(d));
    expect(a!.options.map((o) => o.name)).toEqual(['Ana', 'Beto', 'Camilo']);
    expect(a!.winner).toBe('Beto');
  });

  it('responder más rápido: gana el menor tiempo (mediana) y se muestra en s o min', () => {
    const fast = make(PAREJA, [
      person('Ana', 50, { medianResponseMs: 20_000, responses: 30 }),
      person('Beto', 40, { medianResponseMs: 50_000, responses: 30 }),
    ]);
    const q = pickQuiz(fast)!;
    expect(q.id).toBe('rapido');
    expect(q.winner).toBe('Ana');
    expect(q.unit).toBe('s');
    expect(q.options).toEqual([{ name: 'Ana', value: 20 }, { name: 'Beto', value: 50 }]);

    const slow = make(PAREJA, [
      person('Ana', 50, { medianResponseMs: 10 * MIN, responses: 30 }),
      person('Beto', 40, { medianResponseMs: 3 * MIN, responses: 30 }),
    ]);
    const q2 = pickQuiz(slow)!;
    expect(q2.winner).toBe('Beto');
    expect(q2.unit).toBe('min');
    expect(q2.options.find((o) => o.name === 'Beto')!.value).toBe(3);
    // Margen insuficiente (el segundo no es 25 % más lento) o pocas respuestas: no hay pregunta.
    expect(pickQuiz(make(PAREJA, [
      person('Ana', 50, { medianResponseMs: 10 * MIN, responses: 30 }),
      person('Beto', 40, { medianResponseMs: 9 * MIN, responses: 30 }),
    ]))).toBeNull();
    expect(pickQuiz(make(PAREJA, [
      person('Ana', 50, { medianResponseMs: 1 * MIN, responses: 2 }),
      person('Beto', 40, { medianResponseMs: 9 * MIN, responses: 30 }),
    ]))).toBeNull();
  });

  it('etiquetas de valor con singular', () => {
    const f = (n: number): string => String(n);
    expect(quizValueLabel(214, 'veces', f)).toBe('214 veces');
    expect(quizValueLabel(1, 'veces', f)).toBe('1 vez');
    expect(quizValueLabel(3, 'min', f)).toBe('3 min');
  });
});

/** Contexto falso que registra todo lo que se dibuja (llamadas y estilos), para comparar estados. */
function recCtx(): { ctx: CanvasRenderingContext2D; texts: string[]; log: string[] } {
  const texts: string[] = [];
  const log: string[] = [];
  const target: Record<string, unknown> = { letterSpacing: '0px' };
  const ctx = new Proxy(target, {
    get(t, k: string) {
      if (k === 'measureText') return (s: string) => ({ width: s.length * 9 });
      if (k === 'fillText') {
        return (s: string, ...a: unknown[]) => {
          texts.push(s);
          log.push(`fillText:${s}:${JSON.stringify(a)}`);
        };
      }
      if (k in t) return t[k];
      return (...a: unknown[]) => {
        log.push(`${k}:${JSON.stringify(a)}`);
      };
    },
    set(t, k: string, v) {
      t[k] = v;
      log.push(`set ${k}=${String(v)}`);
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, texts, log };
}

describe('tarjeta El reto', () => {
  const mk = (a: number, b: number): WrappedData =>
    make(PAREJA, [
      person('Ana', 50, { stickers: a, deleted: 7, quiz: { night: 5, emojis: 11 } }),
      person('Beto', 40, { stickers: b, deleted: 7, quiz: { night: 5, emojis: 11 } }),
    ]);
  const draw = (d: WrappedData, reveal: boolean) => {
    const r = recCtx();
    drawerOf('quiz')(r.ctx, d, { index: 14, total: 16, theme: THEMES.coral, reveal });
    return r;
  };

  it('pregunta: no revela al ganador (ni datos, ni orden, ni resaltado)', () => {
    const a = draw(mk(210, 40), false);
    const b = draw(mk(40, 210), false); // el ganador es el otro
    expect(a.log).toEqual(b.log); // dibujo idéntico: nada depende de quién gana ni de los valores
    expect(a.texts).toContain('El reto');
    expect(a.texts).toContain('Ana');
    expect(a.texts).toContain('Beto');
    expect(a.texts.some((t) => /¡|veces|210|40 /.test(t))).toBe(false);
    expect(a.texts.some((t) => /\d{2,}/.test(t) && !/^\d{4}$|\/ /.test(t))).toBe(false);
  });

  it('respuesta: ganador con ¡nombre! y el dato de cada opción', () => {
    const r = draw(mk(210, 40), true);
    expect(r.texts).toContain('¡Ana!');
    expect(r.texts).toContain('210 stickers');
    expect(r.texts).toContain('40 stickers');
    const r2 = draw(mk(40, 210), true);
    expect(r2.texts).toContain('¡Beto!');
  });

  it('con nombres ocultos las opciones usan iniciales', async () => {
    const { hideNames } = await import('./index');
    const r = draw(hideNames(mk(210, 40)), true);
    expect(r.texts.some((t) => /Ana|Beto/.test(t))).toBe(false);
    expect(r.texts).toContain('¡A.!');
  });

  it('buildDeck incluye quiz y summary antes de end (y sin quiz si no hay pregunta)', () => {
    const d = mk(210, 40);
    const deck = buildDeck(d);
    expect(deck.slice(-3)).toEqual(['quiz', 'summary', 'end']);
    expect(deck.indexOf('awards')).toBeLessThan(deck.indexOf('quiz'));
    const none = buildDeck(mk(0, 0));
    expect(none).not.toContain('quiz');
    expect(none.slice(-2)).toEqual(['summary', 'end']);
  });
});

describe('tarjeta Tu año en una tarjeta', () => {
  const sticker = { bytes: new Uint8Array([1, 2, 3]), mime: 'image/png', count: 9, topSender: 'Ana' };
  const people = [person('Ana', 50), person('Beto', 40)];

  it('sin sticker muestra la palabra top; con sticker la reemplaza', () => {
    const d = make(PAREJA, people, {
      topWords: [{ word: 'comida', count: 77 }],
      topEmojis: [{ emoji: '😂', count: 300 }],
      total: 123456,
    });
    const a = recCtx();
    drawerOf('summary')(a.ctx, d, { index: 15, total: 16, theme: THEMES.dark });
    expect(a.texts).toContain('comida');
    expect(a.texts).toContain('123.456');
    expect(a.texts).toContain('Nuestro ' + d.year);
    expect(a.texts).toContain('Ana & Beto');
    expect(a.texts).toContain('15 / 16');

    const b = recCtx();
    drawerOf('summary')(b.ctx, { ...d, topStickers: [sticker] }, { index: 15, total: 16, theme: THEMES.dark, bitmaps: [null] });
    expect(b.texts).not.toContain('comida');
    expect(b.texts).toContain('sticker'); // marcador cuando no hay bitmap decodificado
  });

  it('grupo: nombre largo y "{n} personas"; no revienta con datos vacíos', () => {
    const d = make(PARCHE, [person('Ana', 50), person('Beto', 40), person('Cami', 30)], {
      groupName: 'ICBF (Instituto Colombiano de Bienestar Familiar) Regional Antioquia',
      topWords: [],
      topEmojis: [],
      awards: [],
    });
    const r = recCtx();
    expect(() => drawerOf('summary')(r.ctx, d, { index: 15, total: 16, theme: THEMES.cream })).not.toThrow();
    expect(r.texts).toContain('3 personas');
  });
});
