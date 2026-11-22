import { describe, expect, it } from 'vitest';
import type { Message } from '../types';
import { BASELINE_ES } from './baseline-es';
import { discoverPhrases } from './phrases';

const mk = (d: number, h: number, author: string, text: string): Message => ({
  ts: new Date(2025, 0, 1 + d, h, 0, 0).getTime(), author, text, type: 'text', edited: false, link: false,
});

const FILLER = [
  'casa', 'trabajo', 'tiempo', 'comida', 'familia', 'dinero', 'fiesta', 'libro', 'carta', 'noche', 'viaje', 'clase',
  'tarde', 'mesa', 'cine', 'playa', 'banco', 'hotel', 'plaza', 'musica',
];
const f = (i: number): string => FILLER[i % FILLER.length];

/** 60 días de un chat paisa-costeño sintético con regionalismos y mucho español genérico. */
function regional(): Message[] {
  const out: Message[] = [];
  for (let d = 0; d < 60; d++) {
    out.push(mk(d, 9, 'Ana', `qué chimba ${f(d)}`));
    out.push(mk(d, 10, 'Ana', `voy a ir a la casa de la ${f(d + 1)}`));
    out.push(mk(d, 11, 'Ana', `${f(d + 2)} de una`));
    out.push(mk(d, 12, 'Beto', `ome ${f(d)} nojoda`));
    out.push(mk(d, 13, 'Beto', `nojoda ${f(d + 3)} voy a ${f(d + 4)}`));
  }
  return out;
}

const texts = (r: ReturnType<typeof discoverPhrases>): string[] => r.map((p) => p.text);

describe('discoverPhrases', () => {
  const found = discoverPhrases(regional(), ['Ana', 'Beto'], { rel: 'amigos', limit: 12 });

  it('descubre regionalismos que no están en ninguna lista', () => {
    const t = texts(found);
    expect(t).toContain('qué chimba');
    expect(t).toContain('ome');
    expect(t).toContain('nojoda');
    expect(t).toContain('de una');
  });

  it('"voy a" y "de la" no salen (terminan en palabra de función)', () => {
    const t = texts(found);
    for (const bad of ['voy a', 'de la', 'ir a', 'a la', 'a la casa', 'la casa']) expect(t).not.toContain(bad);
  });

  it('la distintividad baja las palabras genéricas y sube las regionales', () => {
    expect(BASELINE_ES.has('casa')).toBe(true);
    expect(BASELINE_ES.has('tiempo')).toBe(true);
    for (const r of ['chimba', 'ome', 'parce', 'pues', 'eche', 'mijo', 'veci', 'nojoda']) expect(BASELINE_ES.has(r)).toBe(false);
    const t = texts(found);
    expect(t.indexOf('ome')).toBeLessThan(t.indexOf('casa') === -1 ? 99 : t.indexOf('casa'));
  });

  it('cuenta por persona y por mensaje', () => {
    const ome = found.find((p) => p.text === 'ome')!;
    expect(ome.count).toBe(60);
    expect(ome.byPerson).toEqual([{ name: 'Ana', count: 0 }, { name: 'Beto', count: 60 }]);
    expect(found.find((p) => p.text === 'nojoda')!.count).toBe(120); // una vez por mensaje, en 2 mensajes por día
  });

  it('agrupa alargamientos y muestra la forma más frecuente', () => {
    const msgs: Message[] = [];
    const forms = ['amoooor', 'amor', 'amooor', 'amoooooor', 'amor', 'amor'];
    for (let d = 0; d < 6; d++) msgs.push(mk(d, 9, d % 2 ? 'Ana' : 'Beto', `${forms[d]} ${f(d)}`));
    const r = discoverPhrases(msgs, ['Ana', 'Beto'], { rel: 'pareja' });
    const amor = r.find((p) => p.key === 'amor')!;
    expect(amor.count).toBe(6);
    expect(amor.text).toBe('amor');
  });

  it('las risas no compiten', () => {
    const msgs: Message[] = [];
    for (let d = 0; d < 10; d++) msgs.push(mk(d, 9, 'Ana', 'jajajaja jsjsjs jejeje'));
    expect(discoverPhrases(msgs, ['Ana'], { rel: 'amigos' })).toEqual([]);
  });

  it('dedupe por inclusión: "qué más pues" absorbe a "qué más" y a "pues"', () => {
    const msgs: Message[] = [];
    for (let d = 0; d < 12; d++) msgs.push(mk(d, 9, d % 2 ? 'Ana' : 'Beto', `qué más pues ${f(d)}`));
    const r = discoverPhrases(msgs, ['Ana', 'Beto'], { rel: 'amigos', limit: 10 });
    const t = texts(r);
    expect(t).toContain('qué más pues');
    for (const sub of ['qué más', 'más pues', 'pues', 'que mas']) expect(t).not.toContain(sub);
  });

  it('mínimo de días distintos: una sola conversación que repite algo no cuenta', () => {
    const msgs: Message[] = [];
    for (let i = 0; i < 20; i++) msgs.push(mk(3, 9 + (i % 10), 'Ana', 'tremendo hueso'));
    for (let d = 0; d < 6; d++) msgs.push(mk(d, 9, 'Beto', `tremendo ${f(d)} rumbear`));
    const t = texts(discoverPhrases(msgs, ['Ana', 'Beto'], { rel: 'amigos', limit: 20 }));
    expect(t).not.toContain('tremendo hueso');
    expect(t).not.toContain('hueso');
    // En cambio 'rumbear' (6 días) sí sale
    expect(t).toContain('rumbear');
  });

  it('semillas: solo empujan; no aparecen si el chat no las usa', () => {
    const base: Message[] = [];
    for (let d = 0; d < 8; d++) base.push(mk(d, 9, d % 2 ? 'Ana' : 'Beto', `hoy ${f(d)} mañana`));
    const sin = discoverPhrases(base, ['Ana', 'Beto'], { rel: 'pareja', limit: 20 });
    expect(sin.some((p) => p.seeded)).toBe(false);
    expect(texts(sin)).not.toContain('te amo');

    const con = [...base];
    for (let d = 0; d < 8; d++) con.push(mk(d, 20, d % 2 ? 'Ana' : 'Beto', 'te amo'));
    const r = discoverPhrases(con, ['Ana', 'Beto'], { rel: 'pareja', limit: 20 });
    const amo = r.find((p) => p.key === 'te amo')!;
    expect(amo.seeded).toBe(true);
    expect(amo.count).toBe(8);
    // la misma expresión en un chat de amigos no es semilla
    const amigos = discoverPhrases(con, ['Ana', 'Beto'], { rel: 'amigos', limit: 20 });
    expect(amigos.find((p) => p.key === 'te amo')?.seeded ?? false).toBe(false);
  });

  it('excluye los nombres de los participantes', () => {
    const msgs: Message[] = [];
    for (let d = 0; d < 10; d++) msgs.push(mk(d, 9, 'Ana', `juanita juanita ${f(d)} Beto`));
    const t = texts(discoverPhrases(msgs, ['Ana', 'Beto'], { rel: 'amigos', limit: 20 })).join(' ');
    expect(t).not.toMatch(/beto|ana\b/);
  });

  it('los n-gramas no cruzan mensajes ni signos', () => {
    const msgs: Message[] = [];
    for (let d = 0; d < 8; d++) {
      msgs.push(mk(d, 9, 'Ana', 'zorro'));
      msgs.push(mk(d, 10, 'Ana', 'plomo'));
      msgs.push(mk(d, 11, 'Beto', 'cobre, estaño'));
    }
    const t = texts(discoverPhrases(msgs, ['Ana', 'Beto'], { rel: 'amigos', limit: 20 }));
    expect(t).not.toContain('zorro plomo');
    expect(t).not.toContain('cobre estaño');
    expect(t).toContain('zorro');
  });

  it('excluye el top de "Así hablan ustedes" salvo que deje menos de 3', () => {
    const r = discoverPhrases(regional(), ['Ana', 'Beto'], { rel: 'amigos', limit: 12, excludeKeys: new Set(['ome']) });
    expect(texts(r)).not.toContain('ome');
    const tiny: Message[] = [];
    for (let d = 0; d < 8; d++) tiny.push(mk(d, 9, 'Ana', 'ome nojoda'));
    const keep = discoverPhrases(tiny, ['Ana'], { rel: 'amigos', excludeKeys: new Set(['ome', 'nojoda']) });
    expect(texts(keep).length).toBeGreaterThan(0);
  });

  it('rendimiento: 60 000 mensajes sintéticos en < 1,5 s', () => {
    const vocab = Array.from({ length: 4000 }, (_, i) => `pal${String.fromCharCode(97 + (i % 26))}${String.fromCharCode(97 + ((i / 26) | 0) % 26)}${String.fromCharCode(97 + ((i / 676) | 0) % 26)}`);
    const people = ['Ana', 'Beto', 'Carla', 'Dani'];
    const msgs: Message[] = [];
    let seed = 12345;
    const rnd = (): number => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    for (let i = 0; i < 60_000; i++) {
      const n = 4 + ((rnd() * 8) | 0);
      const w: string[] = [];
      for (let k = 0; k < n; k++) w.push(vocab[(rnd() * rnd() * vocab.length) | 0]);
      if (i % 50 === 0) w.push('nojoda');
      msgs.push(mk(i % 300, 8 + (i % 12), people[i % 4], w.join(' ')));
    }
    const t0 = performance.now();
    const r = discoverPhrases(msgs, people, { rel: 'amigos' });
    const ms = performance.now() - t0;
    expect(ms).toBeLessThan(1500);
    expect(Array.isArray(r)).toBe(true);
  });
});

describe('nombres propios de terceros', () => {
  it('una palabra casi siempre en mayúscula a mitad de frase se trata como nombre y no sale', async () => {
    const { properNouns } = await import('./phrases');
    const mk = (text: string, i: number) => ({ ts: i * 3_600_000, author: i % 2 ? 'Ana' : 'Beto', text, type: 'text' as const, edited: false, link: false });
    const msgs = Array.from({ length: 12 }, (_, i) => mk(i % 3 ? 'hoy vi a Sofía en la u' : 'Pues sí, todo bien', i));
    const set = properNouns(msgs, new Map([['Ana', 0], ['Beto', 1]]));
    expect(set.has('sofia')).toBe(true);
    // "Pues" va en mayúscula solo al inicio del mensaje: no es nombre propio.
    expect(set.has('pues')).toBe(false);
  });
});
