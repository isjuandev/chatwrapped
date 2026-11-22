import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { parseChat } from '../parser';
import { GROUP_4, IOS_12H_ES } from '../parser/__fixtures__';
import { anonymizeNames, computeWrapped, hideNames, maxStreak, selectAwards } from './index';
import { extractEmojis, isLaughWord } from './text';
import { fmtDay, fmtHour, fmtInt, ofEach, simpleFraction } from '../format';
import { processChat } from '../process';
import type { Message } from '../types';
import { FAMILIA_GRUPO, PAREJA, PARCHE } from '../modes';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const t0 = new Date(2025, 1, 14, 23, 0, 0).getTime();

function msg(ts: number, author: string, text = 'hola', type: Message['type'] = 'text'): Message {
  return { ts, author, text, type, edited: false, link: false };
}

describe('métricas básicas', () => {
  const msgs: Message[] = [
    msg(t0, 'Juana', 'Hola amor ❤️ 😂'),
    msg(t0 + 5 * MIN, 'Camilo', 'jajaja qué bobo parce'),
    msg(t0 + 6 * MIN, 'Camilo', 'parce dale', 'text'),
    msg(t0 + 7 * MIN, 'Camilo', 'audio', 'audio'),
    msg(t0 + 1 * DAY, 'Juana', 'buenas ❤ 😂 😂'),
    msg(t0 + 2 * DAY, 'Camilo', 'Café café cafe'),
    msg(t0 + 4 * DAY, 'Juana', 'jejeje'),
    msg(t0 + 4 * DAY + HOUR, 'Camilo', 'Se eliminó este mensaje', 'deleted'),
  ];
  const w = computeWrapped(msgs, PAREJA);

  it('total, personas y porcentajes (sin mensajes eliminados)', () => {
    expect(w.total).toBe(7);
    expect(w.people.map((p) => [p.name, p.count])).toEqual([
      ['Camilo', 4],
      ['Juana', 3],
    ]);
    expect(w.people[0].share).toBeCloseTo(4 / 7);
    expect(w.year).toBe(2025);
  });

  it('días hablando y racha', () => {
    expect(w.daysTalking).toBe(4); // día 0, 1, 2, 4
    expect(w.maxStreak).toBe(3);
  });

  it('histograma, hora pico y día más intenso', () => {
    expect(w.hourHist).toHaveLength(24);
    expect(w.hourHist[23]).toBe(7);
    expect(w.peakHour).toBe(23);
    expect(w.busiestDay.iso).toBe('2025-02-14');
    expect(w.busiestDay.count).toBe(4);
    expect(fmtDay(w.busiestDay.iso)).toBe('14 de febrero');
  });

  it('emojis: normaliza ❤ vs ❤️ y ordena', () => {
    expect(w.topEmojis[0]).toEqual({ emoji: '😂', count: 3 });
    expect(w.topEmojis[1]).toEqual({ emoji: '❤️', count: 2 });
  });

  it('palabras: sin stopwords, sin risas, sin nombres, sin tildes al comparar', () => {
    const words = w.topWords.map((x) => x.word);
    expect(words[0]).toBe('café');
    expect(w.topWords[0].count).toBe(3);
    expect(words[1]).toBe('parce');
    expect(w.topWords[1].count).toBe(2);
    expect(words).not.toContain('jajaja');
    expect(words).not.toContain('jejeje');
    expect(words).not.toContain('que');
    expect(words).not.toContain('camilo');
    // "Café café cafe" se agrupan; se muestra la forma más común ("café")
    const cafe = w.topWords.find((x) => x.word.startsWith('caf'));
    expect(cafe?.count).toBe(3);
    expect(cafe?.word).toBe('café');
  });

  it('conteo de jajajas', () => {
    expect(w.jajaCount).toBe(2); // jajaja + jejeje
  });

  it('audios y tiempo de respuesta', () => {
    expect(w.people.find((p) => p.name === 'Camilo')?.audios).toBe(1);
    const cam = w.people.find((p) => p.name === 'Camilo')!;
    expect(cam.avgResponseMs).toBeGreaterThan(0);
  });

  it('ventana de 365 días terminando en el último mensaje', () => {
    const old = [msg(t0 - 400 * DAY, 'Juana', 'viejo'), ...msgs];
    const r = computeWrapped(old, PAREJA);
    expect(r.total).toBe(7);
  });
});

describe('maxStreak', () => {
  it('cuenta días consecutivos distintos', () => {
    expect(maxStreak([1, 2, 3, 3, 7, 8])).toBe(3);
    expect(maxStreak([])).toBe(0);
  });
});

describe('premios', () => {
  it('reparte premios en pareja y calcula los datos', () => {
    const msgs: Message[] = [];
    let ts = new Date(2025, 5, 1, 9, 0, 0).getTime();
    // Juana: 6 mensajes seguidos sin respuesta, audio de Camilo, charlas a las 2 a. m. de Camilo
    for (let i = 0; i < 6; i++) msgs.push(msg((ts += MIN), 'Juana', `mensaje ${i}`));
    ts += 3 * HOUR;
    for (let i = 0; i < 5; i++) {
      msgs.push(msg((ts += 40 * MIN), 'Camilo', 'respuesta lenta jaja'));
      msgs.push(msg((ts += 2 * MIN), 'Juana', 'ok'));
    }
    ts = new Date(2025, 5, 3, 2, 0, 0).getTime();
    for (let i = 0; i < 12; i++) msgs.push(msg((ts += MIN), 'Camilo', 'trasnocho'));
    for (let i = 0; i < 4; i++) msgs.push(msg((ts += MIN), 'Camilo', 'nota', 'audio'));
    for (let i = 0; i < 12; i++) msgs.push(msg((ts += MIN), 'Juana', 'sigo despierta'));

    const w = computeWrapped(msgs, PAREJA);
    expect(w.awardCandidates.length).toBeGreaterThanOrEqual(4);
    const byId = Object.fromEntries(w.awardCandidates.map((a) => [a.id, a]));
    expect(byId.intenso.detail).toMatch(/mensajes seguidos sin respuesta/);
    expect(byId.podcastero.winner).toBe('Camilo');
    expect(byId.podcastero.detail).toBe('4 audios en el año');
    expect(byId.trasnochador.winner).toBe('Camilo');
    expect(byId.trasnochador.detail).toMatch(/mensajes después de las 12/);
    expect(w.awards.length).toBeLessThanOrEqual(6);
  });

  it('selectAwards reparte entre la pareja (mín. 2 cada uno si se puede)', () => {
    const c = (id: string, winner: string) => ({ id, title: id, winner, detail: 'd' });
    const cands = [
      c('a', 'X'), c('b', 'X'), c('c', 'X'), c('d', 'X'), c('e', 'X'), c('f', 'X'),
      c('g', 'Y'), c('h', 'Y'),
    ];
    const picked = selectAwards(cands, PAREJA, ['X', 'Y']);
    expect(picked).toHaveLength(6);
    expect(picked.filter((a) => a.winner === 'Y')).toHaveLength(2);
  });

  it('selectAwards en grupo prefiere ganadores distintos', () => {
    const c = (id: string, winner: string) => ({ id, title: id, winner, detail: 'd' });
    const cands = [c('a', 'X'), c('b', 'X'), c('c', 'Y'), c('d', 'Z'), c('e', 'X'), c('f', 'X'), c('g', 'W')];
    const picked = selectAwards(cands, PARCHE, ['X', 'Y', 'Z', 'W']);
    expect(new Set(picked.map((a) => a.winner)).size).toBe(4);
    expect(picked).toHaveLength(6);
  });

  it('omite premios con dato 0', () => {
    const w = computeWrapped(
      [msg(t0, 'Juana', 'hola'), msg(t0 + MIN, 'Camilo', 'hola')],
      PAREJA,
    );
    expect(w.awards.find((a) => a.id === 'podcastero')).toBeUndefined();
    expect(w.awards.find((a) => a.id === 'trasnochador')).toBeUndefined();
  });
});

describe('modos y avisos', () => {
  const group = parseChat(GROUP_4);

  it('pareja con >2 personas usa las 2 que más escriben y avisa', () => {
    const w = computeWrapped(group, PAREJA);
    expect(w.people).toHaveLength(2);
    expect(w.warnings).toHaveLength(1);
    expect(w.people.map((p) => p.name)).toEqual(['Dani', 'Ana']);
  });

  it('parche con 4 personas: ranking completo, nombre por defecto', () => {
    const w = computeWrapped(group, PARCHE);
    expect(w.people).toHaveLength(4);
    expect(w.groupName).toBe('El parche');
    expect(w.warnings).toHaveLength(0);
    const winners = w.awards.map((a) => a.winner);
    expect(new Set(winners).size).toBeGreaterThanOrEqual(3); // ganadores distintos
    expect(computeWrapped(group, FAMILIA_GRUPO, 'Los Pérez').groupName).toBe('Los Pérez');
  });

  it('grupo con 2 personas continúa sin aviso (la app pregunta con la hoja de sugerencia)', () => {
    const w = computeWrapped(parseChat(IOS_12H_ES), PARCHE);
    expect(w.people).toHaveLength(2);
    expect(w.participants).toBe(2);
    expect(w.warnings).toHaveLength(0);
  });
});

describe('ocultar nombres', () => {
  it('usa iniciales con punto', () => {
    expect([...anonymizeNames(['Juana', 'Camilo']).values()]).toEqual(['J.', 'C.']);
  });
  it('si chocan, "Persona N"', () => {
    expect([...anonymizeNames(['Juana', 'Julián', 'Camilo']).values()]).toEqual([
      'Persona 1',
      'Persona 2',
      'Persona 3',
    ]);
  });
  it('reemplaza nombres en personas y premios', () => {
    const w = computeWrapped(parseChat(IOS_12H_ES), PAREJA);
    const h = hideNames(w);
    expect(h.people.every((p) => /^[A-Z]\.$/.test(p.name))).toBe(true);
    expect(h.awards.every((a) => /^[A-Z]\.$/.test(a.winner))).toBe(true);
  });
});

describe('texto y formato', () => {
  it('extractEmojis', () => {
    expect(extractEmojis('hola ❤️ y ❤ 👍🏽 👍 😂😂')).toEqual(['❤️', '❤️', '👍', '👍', '😂', '😂']);
    expect(extractEmojis('sin emojis 123')).toEqual([]);
  });
  it('isLaughWord', () => {
    for (const w of ['jaja', 'jajaja', 'jajajaja', 'jsjs', 'jsjsjs', 'jeje', 'jejeje']) {
      expect(isLaughWord(w)).toBe(true);
    }
    expect(isLaughWord('jamon')).toBe(false);
  });
  it('fmtInt usa punto de miles también con 4 dígitos', () => {
    expect(fmtInt(18432)).toBe('18.432');
    expect(fmtInt(2104)).toBe('2.104');
    expect(fmtInt(318)).toBe('318');
  });
  it('fmtHour', () => {
    expect(fmtHour(0)).toBe('12 a. m.');
    expect(fmtHour(6)).toBe('6 a. m.');
    expect(fmtHour(12)).toBe('12 m.');
    expect(fmtHour(18)).toBe('6 p. m.');
    expect(fmtHour(23)).toBe('11 p. m.');
  });
  it('simpleFraction y ofEach', () => {
    expect(simpleFraction(0.62)).toEqual([3, 5]);
    expect(simpleFraction(0.5)).toEqual([1, 2]);
    expect(simpleFraction(0.67)).toEqual([2, 3]);
    expect(simpleFraction(0.75)).toEqual([3, 4]);
    expect(simpleFraction(0.8)).toEqual([4, 5]);
    expect(ofEach(0.6)).toBe('6 de cada 10');
    expect(ofEach(0.25)).toBe('1 de cada 4');
  });
});

describe('processChat (lógica del worker)', () => {
  it('procesa texto y devuelve ok', async () => {
    const r = await processChat({ fileName: 'Chat de WhatsApp con Parche.txt', text: GROUP_4, mode: PARCHE });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.groupName).toBe('Parche');
  });
  it('archivo no reconocido', async () => {
    const r = await processChat({ fileName: 'x.txt', text: 'hola, esto no es un chat', mode: PAREJA });
    expect(r).toMatchObject({ ok: false, code: 'unrecognized' });
  });
  it('zip con .txt', async () => {
    const zip = new JSZip();
    zip.file('_chat.txt', IOS_12H_ES);
    const bytes = await zip.generateAsync({ type: 'arraybuffer' });
    const r = await processChat({ fileName: 'WhatsApp Chat - Pareja.zip', bytes, mode: PAREJA });
    expect(r.ok).toBe(true);
  });
  it('zip sin .txt', async () => {
    const zip = new JSZip();
    zip.file('foto.jpg', 'x');
    const bytes = await zip.generateAsync({ type: 'arraybuffer' });
    const r = await processChat({ fileName: 'a.zip', bytes, mode: PAREJA });
    expect(r).toMatchObject({ ok: false, code: 'zip_no_txt' });
  });
});
