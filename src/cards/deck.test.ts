import JSZip from 'jszip';
import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { parseChat } from '../parser';
import { GROUP_4 } from '../parser/__fixtures__';
import { computeWrapped, hideNames } from '../metrics';
import { pickQuiz } from '../metrics/quiz';
import { processChat } from '../process';
import type { Message, StickerIndex, WrappedData } from '../types';
import { buildDeck, deckThemes, drawerOf } from './deck';
import { monthPhrase } from './cardC';
import { silenceWhere, streakRange } from './cardE';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

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

function crc32(buf: Uint8Array): number {
  let c;
  let crc = 0xffffffff;
  for (const b of buf) {
    c = (crc ^ b) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** PNG de 1×1 con ese color (se guarda como .webp en los tests). */
export function tinyPng(r: number, g: number, b: number): Uint8Array {
  const chunk = (type: string, data: Uint8Array): Uint8Array => {
    const out = new Uint8Array(12 + data.length);
    const dv = new DataView(out.buffer);
    dv.setUint32(0, data.length);
    for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
    out.set(data, 8);
    dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
    return out;
  };
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, 1);
  dv.setUint32(4, 1);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const idat = new Uint8Array(deflateSync(Uint8Array.from([0, r, g, b])));
  const parts = [
    Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', new Uint8Array(0)),
  ];
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

const msg = (ts: number, author: string, text: string, type: Message['type'] = 'text', file?: string): Message => ({
  ts, author, text, type, edited: false, link: false, ...(file ? { file } : {}),
});

/** Un año de chat sintético y determinista. */
function genYear(people: string[], opts: { stickers?: boolean } = {}): Message[] {
  const out: Message[] = [];
  const words = ['amor', 'parce', 'listo', 'mañana', 'comida', 'trabajo'];
  const start = new Date(2025, 0, 1, 9, 0, 0).getTime();
  for (let d = 0; d < 365; d++) {
    if (d % 11 === 5) continue; // algunos días en silencio
    let ts = start + d * DAY + (d % 5) * HOUR;
    for (let i = 0; i < 10; i++) {
      const who = people[(d + i + (i % 3)) % people.length];
      ts += (1 + ((d + i) % 4)) * MIN;
      const w = words[(people.indexOf(who) + i) % words.length];
      if (i === 3) out.push(msg(ts, who, 'IMG-20250101-WA0001.jpg (archivo adjunto)', 'image', `IMG-${d}-${i}.jpg`));
      else if (i === 5 && opts.stickers) out.push(msg(ts, who, 'sticker', 'sticker', `${d}-STICKER-${i}.webp`));
      else if (i === 7) out.push({ ...msg(ts, who, `mira https://ejemplo.com ${w}`), link: true });
      else out.push(msg(ts, who, `${w} ${w} ${people.indexOf(who) === 0 ? 'amor' : 'dale'} jajaja`));
    }
  }
  return out.sort((a, b) => a.ts - b.ts);
}

function stickerIndexFor(msgs: Message[]): StickerIndex {
  const byFile = new Map<string, string>();
  const assets = new Map<string, { hash: string; bytes: Uint8Array; mime: string }>();
  const pngs = [tinyPng(255, 0, 0), tinyPng(0, 255, 0), tinyPng(0, 0, 255)];
  msgs.forEach((m, i) => {
    if (m.type !== 'sticker' || !m.file) return;
    const hash = `h${i % 3}`;
    byFile.set(m.file.toLowerCase(), hash);
    if (!assets.has(hash)) assets.set(hash, { hash, bytes: pngs[i % 3], mime: 'image/png' });
  });
  return { byFile, assets };
}

function noEqualNeighbors(data: WrappedData): void {
  const themes = deckThemes(buildDeck(data));
  for (let i = 1; i < themes.length; i++) expect(themes[i]).not.toBe(themes[i - 1]);
}

describe('buildDeck', () => {
  it('chat de 3 días en grupo: sin mes, día, rachas, respuestas, firma ni multimedia', () => {
    const data = computeWrapped(parseChat(GROUP_4), PARCHE);
    // El reto no entra aquí: con 3 días de chat ninguna pregunta tiene un ganador claro.
    expect(buildDeck(data)).toEqual(['cover', 'who', 'hour', 'talk', 'pairs', 'awards', 'summary', 'end']);
    noEqualNeighbors(data);
  });

  it('pareja de un año sin stickers', () => {
    const data = computeWrapped(genYear(['Juana', 'Camilo']), PAREJA);
    const deck = buildDeck(data);
    expect(deck).toEqual([
      'cover', 'who', 'month', 'weekday', 'hour', 'streaks', 'reply', 'talk', 'signature', 'media', 'awards', 'quiz', 'summary', 'end',
    ]);
    expect(deck).not.toContain('stickers');
    expect(deck).not.toContain('pairs');
    noEqualNeighbors(data);
  });

  it('grupo de un año con stickers: mazo completo (el reto solo si hay ganador claro)', () => {
    const msgs = genYear(['Ana', 'Beto', 'Carla', 'Dani', 'Eva'], { stickers: true });
    const data = computeWrapped(msgs, PARCHE, null, stickerIndexFor(msgs));
    const deck = buildDeck(data);
    // genYear reparte todo casi parejo: sin pregunta válida no hay "quiz" (14 + summary).
    expect(pickQuiz(data)).toBeNull();
    expect(deck).toHaveLength(15);
    expect(deck.slice(-3)).toEqual(['awards', 'summary', 'end']);
    expect(deck).toContain('stickers');
    expect(deck).toContain('pairs');
    expect(data.topStickers.length).toBe(3);
    noEqualNeighbors(data);
  });

  it('nunca hay dos fondos iguales seguidos, ni siquiera tras omitir tarjetas', () => {
    const a = computeWrapped(genYear(['Ana', 'Beto', 'Carla']), PARCHE);
    const b = computeWrapped(genYear(['Juana', 'Camilo']), PAREJA);
    const c = computeWrapped(parseChat(GROUP_4), PARCHE);
    for (const d of [a, b, c]) noEqualNeighbors(d);
    // Caso forzado: hour (coral) tras weekday (coral) pasa a lime.
    const themes = deckThemes(['weekday', 'hour', 'streaks']);
    expect(themes).toEqual(['coral', 'lime', 'coral']);
  });

  it('todas las tarjetas se dibujan con cualquiera de los 4 temas, también con nombres ocultos', () => {
    const msgs = genYear(['Ana', 'Beto', 'Carla', 'Dani'], { stickers: true });
    const data = computeWrapped(msgs, PARCHE, null, stickerIndexFor(msgs));
    for (const d of [data, hideNames(data)]) {
      const deck = buildDeck(d);
      for (const theme of ['dark', 'cream', 'lime', 'coral'] as const) {
        deck.forEach((id, i) => {
          const { ctx, texts } = fakeCtx();
          const t = themeOf(theme);
          expect(() => drawerOf(id)(ctx, d, { index: i + 1, total: deck.length, theme: t })).not.toThrow();
          expect(texts).toContain('chat wrapped');
          if (id !== 'cover') expect(texts).toContain(`${i + 1} / ${deck.length}`);
        });
      }
    }
  });

  it('con nombres ocultos las tarjetas nuevas no muestran nombres reales', () => {
    const data = computeWrapped(genYear(['Juana', 'Camilo']), PAREJA);
    const h = hideNames(data);
    for (const id of ['reply', 'signature', 'media'] as const) {
      const { ctx, texts } = fakeCtx();
      drawerOf(id)(ctx, h, { index: 1, total: 12 });
      expect(texts.some((t) => /Juana|Camilo/.test(t))).toBe(false);
    }
  });
});

import { THEMES } from './draw';
import { PAREJA, PARCHE } from '../modes';
function themeOf(id: keyof typeof THEMES) {
  return THEMES[id];
}

describe('textos de las tarjetas nuevas', () => {
  it('Su mes: frase con veces o "casi ni se hablaron"', () => {
    const data = computeWrapped(genYear(['Juana', 'Camilo']), PAREJA);
    const p = monthPhrase(data);
    expect(p.text).toMatch(/mensajes/);
    const zero = { ...data, monthly: data.monthly.map((m, i) => ({ ...m, count: i === 5 ? 0 : m.count })) };
    expect(monthPhrase(zero).text).toMatch(/casi ni se hablaron/);
  });
  it('Rachas: rangos y dónde cae el silencio', () => {
    expect(streakRange('2025-03-03', '2025-06-07')).toBe('del 3 de marzo al 7 de junio');
    expect(silenceWhere('2025-03-03', '2025-03-20')).toBe('en marzo');
    expect(silenceWhere('2025-03-28', '2025-04-05')).toBe('entre marzo y abril');
  });
});

describe('métricas nuevas', () => {
  const base = new Date(2025, 2, 3, 10, 0, 0).getTime();
  const ms: Message[] = [
    msg(base, 'Ana', 'hola'),
    msg(base + MIN, 'Beto', 'hola'),
    msg(base + 2 * MIN, 'Ana', 'ya'),
    msg(base + 2 * MIN + 30_000, 'Beto', 'ok'),
    msg(base + 3 * DAY, 'Ana', 'vuelvo'),
    msg(base + 3 * DAY + 20 * MIN, 'Beto', 'bien'),
    msg(base + 4 * DAY, 'Ana', 'x'),
  ];
  const w = computeWrapped(ms, PAREJA);
  it('racha con fechas, silencio con fechas y días de semana (lunes primero)', () => {
    expect(w.streak).toEqual({ days: 2, start: '2025-03-06', end: '2025-03-07' });
    expect(w.silence).toEqual({ days: 2, from: '2025-03-04', to: '2025-03-05' });
    expect(w.weekdays).toHaveLength(7);
    expect(w.weekdays[0]).toBe(4); // 3 de marzo de 2025 fue lunes (4 mensajes)
    expect(w.monthly).toHaveLength(12);
    expect(w.monthly[11].label).toBe('marzo');
  });
  it('mediana de respuesta, % < 1 min y matriz de respuestas', () => {
    const beto = w.people.find((p) => p.name === 'Beto')!;
    expect(beto.responses).toBe(3);
    expect(beto.fastShare).toBeCloseTo(1 / 3); // solo la de 30 s es < 1 min
    expect(beto.medianResponseMs).toBe(60_000);
    const i = w.people.findIndex((p) => p.name === 'Beto');
    const j = 1 - i;
    expect(w.replyMatrix[i][j]).toBeGreaterThan(0);
    expect(w.pairs[0].count).toBeGreaterThan(0);
  });
});

describe('premios nuevos y notoriedad', () => {
  it('stickerero, fotógrafo, arrepentido, testamento, rayo y linkero existen con dato > 0', () => {
    const t0 = new Date(2025, 4, 1, 10, 0, 0).getTime();
    const ms: Message[] = [];
    for (let i = 0; i < 12; i++) {
      ms.push(msg(t0 + i * 10 * MIN, 'Ana', 'mensaje bastante largo '.repeat(5) + i));
      ms.push(msg(t0 + i * 10 * MIN + 20_000, 'Beto', 'ok'));
      ms.push(msg(t0 + i * 10 * MIN + 30_000, 'Beto', 'x', 'sticker'));
    }
    // Los premios de conteo exigen al menos 3 (antes bastaba 1).
    for (let k = 0; k < 3; k++) {
      ms.push(msg(t0 + 5 * HOUR + k * MIN, 'Ana', 'foto', 'image'));
      ms.push(msg(t0 + 6 * HOUR + k * MIN, 'Ana', 'borrado', 'deleted'));
      ms.push({ ...msg(t0 + 7 * HOUR + k * MIN, 'Beto', 'mira https://a.co'), link: true });
    }
    const w = computeWrapped(ms, PAREJA);
    const byId = Object.fromEntries(w.awardCandidates.map((a) => [a.id, a]));
    expect(byId.stickerero).toMatchObject({ winner: 'Beto', detail: '12 stickers en el año' });
    expect(byId.fotografo).toMatchObject({ winner: 'Ana' });
    expect(byId.arrepentido).toMatchObject({ winner: 'Ana' });
    expect(byId.testamento.winner).toBe('Ana');
    expect(byId.testamento.detail).toMatch(/^Sus mensajes tienen \d+ letras en promedio$/);
    expect(byId.linkero).toMatchObject({ winner: 'Beto' });
    expect(byId.rayo).toMatchObject({ winner: 'Beto' });
    expect(byId.rayo.detail).toBe('Responde en 20 s');
    expect(w.awards).toHaveLength(6);
  });

  it('los 6 premios se ordenan por notoriedad y siguen yendo al ganador real', () => {
    const w = computeWrapped(genYear(['Juana', 'Camilo']), PAREJA);
    expect(w.awards).toHaveLength(6);
    const cand = new Map(w.awardCandidates.map((c) => [c.id, c]));
    for (const a of w.awards) expect(cand.get(a.id)?.winner).toBe(a.winner);
  });
});

describe('stickers desde un .zip', () => {
  const A = tinyPng(255, 0, 0);
  const B = tinyPng(0, 255, 0);
  const C = tinyPng(0, 0, 255);

  async function makeZip(): Promise<Blob> {
    const lines = [
      '[21/09/26, 9:00:00 p. m.] Ana: ‎<adjunto: 00000001-STICKER-2026-09-21-21-00-00.webp>',
      '[21/09/26, 9:01:00 p. m.] Beto: ‎<adjunto: 00000002-STICKER-2026-09-21-21-01-00.webp>',
      '[21/09/26, 9:02:00 p. m.] Beto: ‎<adjunto: 00000003-STICKER-2026-09-21-21-02-00.webp>',
      '[21/09/26, 9:03:00 p. m.] Ana: ‎<adjunto: 00000004-STICKER-2026-09-21-21-03-00.webp>',
      '[21/09/26, 9:04:00 p. m.] Beto: ‎<adjunto: 00000005-STICKER-2026-09-21-21-04-00.webp>',
      '[21/09/26, 9:05:00 p. m.] Ana: ‎<adjunto: 00000006-PHOTO-2026-09-21-21-05-00.jpg>',
      '[21/09/26, 9:06:00 p. m.] Ana: ‎<adjunto: 00000099-STICKER-2026-09-21-21-06-00.webp>',
      '[21/09/26, 9:07:00 p. m.] Beto: hola',
      '',
    ].join('\n');
    const zip = new JSZip();
    zip.file('_chat.txt', lines);
    // 1 y 2 y 4 son el mismo sticker (A); 3 es B; 5 es C. El 99 no está en el zip.
    zip.file('00000001-STICKER-2026-09-21-21-00-00.webp', A);
    zip.file('00000002-STICKER-2026-09-21-21-01-00.webp', A);
    zip.file('00000003-STICKER-2026-09-21-21-02-00.webp', B);
    zip.file('00000004-STICKER-2026-09-21-21-03-00.webp', A);
    zip.file('00000005-STICKER-2026-09-21-21-04-00.webp', C);
    zip.file('00000006-PHOTO-2026-09-21-21-05-00.jpg', 'no-debe-leerse');
    const bytes = await zip.generateAsync({ type: 'uint8array' });
    return new Blob([bytes as BlobPart]);
  }

  it('agrupa idénticos por hash, cuenta por referencias y ordena', async () => {
    const blob = await makeZip();
    const stages: string[] = [];
    const r = await processChat({ fileName: 'WhatsApp Chat - Los Panas.zip', file: blob, mode: PARCHE }, (p) =>
      stages.push(p.progress),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(stages).toEqual(['stickers']);
    const top = r.data.topStickers;
    expect(top).toHaveLength(3);
    expect(top[0].count).toBe(3); // A: archivos 1, 2 y 4
    expect(top[0].topSender).toBe('Ana'); // Ana 2 (1 y 4), Beto 1 (2)
    expect(top[0].mime).toBe('image/png');
    expect(Array.from(top[0].bytes)).toEqual(Array.from(A));
    expect(top[1].count).toBe(1);
    expect(top.map((s) => s.count)).toEqual([3, 1, 1]);
    // el archivo 99 no está en el zip y la foto no se descomprime: no aparecen
    expect(top.reduce((s, x) => s + x.count, 0)).toBe(5);
  });

  it('un zip sin stickers no pide la fase de stickers', async () => {
    const zip = new JSZip();
    zip.file('_chat.txt', '[21/09/26, 9:00:00 p. m.] Ana: hola\n[21/09/26, 9:01:00 p. m.] Beto: qué más\n');
    const bytes = await zip.generateAsync({ type: 'uint8array' });
    const stages: string[] = [];
    const r = await processChat({ fileName: 'a.zip', file: new Blob([bytes as BlobPart]), mode: PAREJA }, (p) => stages.push(p.progress));
    expect(r.ok).toBe(true);
    expect(stages).toEqual([]);
    if (r.ok) expect(r.data.topStickers).toEqual([]);
  });
});
