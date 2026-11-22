import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseChat } from '../parser';
import { computeWrapped } from './index';
import { PAREJA, PARCHE } from '../modes';

const file = resolve(__dirname, '../../public/sample-chat.txt');

// Se ejecuta solo si ya corriste `node scripts/gen-sample.mjs`.
describe.skipIf(!existsSync(file))('chat de ejemplo generado', () => {
  const msgs = parseChat(readFileSync(file, 'utf8'));
  const w = computeWrapped(msgs, PAREJA);

  it('tiene ~5.000 mensajes de 2 personas, sesgados a la noche', () => {
    expect(w.total).toBeGreaterThan(3500);
    expect(w.total).toBeLessThan(6500);
    expect(w.people.map((p) => p.name).sort()).toEqual(['Camilo', 'Juana']);
    expect(w.people[0].name).toBe('Juana');
    expect(w.peakHour).toBeGreaterThanOrEqual(21);
    expect(w.busiestDay.iso.endsWith('-02-14')).toBe(true);
    expect(w.jajaCount).toBeGreaterThan(100);
    expect(w.topEmojis.length).toBe(5);
    expect(w.topWords.length).toBe(5);
    expect(w.awards.length).toBe(6);
    expect(w.maxStreak).toBeGreaterThan(30);
  });
});

const groupFile = resolve(__dirname, '../../public/sample-group.txt');
const zipFile = resolve(__dirname, '../../public/sample-with-stickers.zip');

describe.skipIf(!existsSync(groupFile))('grupo de ejemplo generado', () => {
  const w = computeWrapped(parseChat(readFileSync(groupFile, 'utf8')), PARCHE);
  it('grupo de 5 de un año con premios nuevos y mazo casi completo', async () => {
    const { buildDeck } = await import('../cards');
    expect(w.people).toHaveLength(5);
    expect(w.awards).toHaveLength(6);
    expect(w.mediaTotals.stickers).toBeGreaterThan(100);
    expect(w.mediaTotals.links).toBeGreaterThan(50);
    expect(w.silence?.days).toBeGreaterThanOrEqual(9);
    expect(w.people.filter((p) => p.signature).length).toBeGreaterThanOrEqual(3);
    const deck = buildDeck(w);
    expect(deck).toHaveLength(15); // sin stickers reales (solo .txt); incluye el reto y el resumen
    expect(deck).toContain('pairs');
  });
});

describe.skipIf(!existsSync(zipFile))('zip de ejemplo con stickers', () => {
  it('extrae los stickers y arma el mazo completo de 14', async () => {
    const { processChat } = await import('../process');
    const { buildDeck } = await import('../cards');
    const bytes = readFileSync(zipFile);
    const r = await processChat({
      fileName: 'sample-with-stickers.zip',
      file: new Blob([new Uint8Array(bytes)]),
      mode: PARCHE,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.topStickers).toHaveLength(3);
    expect(r.data.topStickers[0].count).toBeGreaterThan(r.data.topStickers[2].count);
    expect(buildDeck(r.data)).toContain('stickers');
  });
});
