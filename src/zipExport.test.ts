import { BlobReader, TextWriter, Uint8ArrayWriter, ZipReader } from '@zip.js/zip.js';
import { describe, expect, it } from 'vitest';
import { buildDeck } from './cards';
import { computeWrapped } from './metrics';
import { PAREJA } from './modes';
import { parseChat } from './parser';
import { IOS_12H_ES } from './parser/__fixtures__';
import { CARD_SLUGS, deckBaseName, deckEntryNames, zipBlobs, zipEntryName } from './zipExport';

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

describe('descargar todo en un .zip', () => {
  it('nombra la carpeta y el archivo según el mazo', () => {
    expect(deckBaseName(2026, 'free')).toBe('chat-wrapped-2026');
    expect(deckBaseName(2026, 'full')).toBe('chat-wrapped-2026-completo');
  });

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

  it('arma un archivo por tarjeta del mazo, en orden', () => {
    const data = computeWrapped(parseChat(IOS_12H_ES), PAREJA);
    const names = deckEntryNames(data, 'free');
    const base = deckBaseName(data.year, 'free');
    expect(names).toHaveLength(buildDeck(data, 'free').length);
    expect(new Set(names).size).toBe(names.length);
    expect(names.every((n) => n.startsWith(`${base}/`) && n.endsWith('.png'))).toBe(true);
    expect([...names].sort()).toEqual(names);

    const fullBase = deckBaseName(data.year, 'full');
    expect(deckEntryNames(data, 'full').every((n) => n.startsWith(`${fullBase}/`))).toBe(true);
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
