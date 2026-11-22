import { BlobReader, TextWriter, Uint8ArrayWriter, ZipReader } from '@zip.js/zip.js';
import { describe, expect, it } from 'vitest';
import { buildDeck } from './cards';
import { computeWrapped } from './metrics';
import { PAREJA } from './modes';
import { parseChat } from './parser';
import { IOS_12H_ES } from './parser/__fixtures__';
import type { WrappedData } from './types';
import { allEntries, CARD_SLUGS, zipBlobs, zipEntryName } from './zipExport';

/** Lee un .zip en memoria: nombre de entrada → texto. */
async function readEntries(zip: Blob): Promise<Map<string, string>> {
  const reader = new ZipReader(new BlobReader(zip));
  try {
    const entries = await reader.getEntries();
    const out = new Map<string, string>();
    for (const entry of entries) {
      if (entry.directory) continue;
      out.set(entry.filename, await entry.getData(new TextWriter()));
    }
    return out;
  } finally {
    await reader.close();
  }
}

/** Fuerza (o quita) el reto: cada persona con todos sus conteos en `value(i)`. */
function withQuiz(data: WrappedData, value: (i: number) => number): WrappedData {
  return {
    ...data,
    people: data.people.map((p, i) => ({
      ...p,
      quiz: Object.fromEntries(Object.keys(p.quiz).map((k) => [k, value(i)])) as unknown as typeof p.quiz,
    })),
  };
}

describe('descargar todo en un .zip', () => {
  it('numera las tarjetas con ceros para conservar el orden', () => {
    expect(zipEntryName('chat-wrapped-2026', 1, 16, 'portada')).toBe('chat-wrapped-2026/01-portada.png');
    expect(zipEntryName('chat-wrapped-2026', 10, 16, 'premios')).toBe('chat-wrapped-2026/10-premios.png');
    expect(zipEntryName('chat-wrapped-2026', 9, 9, 'final')).toBe('chat-wrapped-2026/9-final.png');
  });

  it('da un nombre de archivo distinto a cada tarjeta', () => {
    const slugs = Object.values(CARD_SLUGS);
    expect(slugs).toHaveLength(19);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('arma la historia en orden, con la respuesta del reto tras la pregunta', () => {
    const data = withQuiz(computeWrapped(parseChat(IOS_12H_ES), PAREJA), (i) => (i === 0 ? 10 : 0));
    const deck = buildDeck(data, 'free');
    const q = deck.indexOf('quiz');
    expect(q).toBeGreaterThanOrEqual(0);
    const entries = allEntries(data, { includeFull: false });
    const base = `chat-wrapped-${data.year}`;
    const pad = String(deck.length).length;
    expect(entries).toHaveLength(deck.length + 1);
    expect(entries.every((e) => e.tier === 'free' && e.path.startsWith(`${base}/`))).toBe(true);
    expect(entries.filter((e) => !e.reveal).map((e) => e.n)).toEqual(deck.map((_, i) => i + 1));
    expect(entries[0].path).toBe(`${base}/${'1'.padStart(pad, '0')}-portada.png`);

    const nn = String(q + 1).padStart(pad, '0');
    const i = entries.findIndex((e) => e.path === `${base}/${nn}-reto.png`);
    expect(i).toBeGreaterThanOrEqual(0);
    expect(entries[i + 1]).toMatchObject({ path: `${base}/${nn}-reto-respuesta.png`, n: q + 1, reveal: true });
    expect(entries.filter((e) => e.reveal)).toHaveLength(1);
  });

  it('sin reto en el mazo no hay archivo de respuesta', () => {
    const data = withQuiz(computeWrapped(parseChat(IOS_12H_ES), PAREJA), () => 0);
    expect(buildDeck(data, 'free')).not.toContain('quiz');
    const entries = allEntries(data, { includeFull: false });
    expect(entries.some((e) => e.reveal || e.path.includes('reto'))).toBe(false);
    expect(entries).toHaveLength(buildDeck(data, 'free').length);
  });

  it('incluye la carpeta reporte-completo solo con includeFull', () => {
    const data = computeWrapped(parseChat(IOS_12H_ES), PAREJA);
    const without = allEntries(data, { includeFull: false });
    expect(without.some((e) => e.tier === 'full' || e.path.includes('reporte-completo'))).toBe(false);

    const withFull = allEntries(data, { includeFull: true });
    const fullDeck = buildDeck(data, 'full');
    const full = withFull.filter((e) => e.tier === 'full');
    expect(full).toHaveLength(fullDeck.length);
    expect(full.map((e) => e.n)).toEqual(fullDeck.map((_, i) => i + 1));
    expect(full.every((e) => e.path.startsWith(`chat-wrapped-${data.year}/reporte-completo/`) && !e.reveal)).toBe(true);
    expect(withFull.slice(0, without.length)).toEqual(without);
  });

  it('todos los nombres son únicos y terminan en .png', () => {
    const data = computeWrapped(parseChat(IOS_12H_ES), PAREJA);
    const paths = allEntries(data, { includeFull: true }).map((e) => e.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths.every((p) => p.endsWith('.png'))).toBe(true);
  });

  it('empaqueta los PNG en orden y reporta el progreso', async () => {
    const names = ['carpeta/01-portada.png', 'carpeta/02-hora.png', 'carpeta/03-final.png'];
    const progress: { done: number; total: number }[] = [];
    const zip = await zipBlobs(
      names,
      async (n) => new Blob([`png-${n}`], { type: 'image/png' }),
      (p) => progress.push(p),
    );

    const entries = await readEntries(zip);
    expect([...entries.keys()]).toEqual(names);
    expect([...entries.values()]).toEqual(['png-1', 'png-2', 'png-3']);
    expect(progress).toEqual([
      { done: 0, total: 3 },
      { done: 1, total: 3 },
      { done: 2, total: 3 },
      { done: 3, total: 3 },
    ]);
  });

  it('guarda los PNG tal cual (sin recomprimir) y conserva sus bytes', async () => {
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 1, 2, 3, 254, 255]);
    const zip = await zipBlobs(['carpeta/01-portada.png'], async () => new Blob([png], { type: 'image/png' }));

    const reader = new ZipReader(new BlobReader(zip));
    try {
      const [entry] = await reader.getEntries();
      if (entry.directory) throw new Error('la entrada debía ser un archivo');
      expect(entry.compressionMethod).toBe(0);
      expect(await entry.getData(new Uint8ArrayWriter())).toEqual(png);
    } finally {
      await reader.close();
    }
  });

  it('no genera un zip sin tarjetas', async () => {
    await expect(zipBlobs([], async () => new Blob(['x']))).rejects.toThrow('No hay tarjetas');
  });

  it('no entrega un zip a medias si una tarjeta falla', async () => {
    let lastRendered = 0;
    await expect(
      zipBlobs(['a.png', 'b.png', 'c.png'], async (n) => {
        lastRendered = n;
        if (n === 2) throw new Error('boom');
        return new Blob([`png-${n}`]);
      }),
    ).rejects.toThrow('boom');
    expect(lastRendered).toBe(2);
  });
});
