import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { processChat } from './process';
import { GROUP_4, IOS_12H_ES } from './parser/__fixtures__';
import { FAMILIA_GRUPO, PAREJA, PARCHE } from './modes';

const enc = (s: string): Uint8Array => new TextEncoder().encode(s);

describe('processChat (flujo completo del worker)', () => {
  it('lee un .zip de iOS con _chat.txt y toma el nombre del zip', async () => {
    const zip = new JSZip();
    zip.file('_chat.txt', IOS_12H_ES);
    const bytes = await zip.generateAsync({ type: 'arraybuffer' });
    const r = await processChat({ fileName: 'WhatsApp Chat - Los del colegio.zip', bytes, mode: PARCHE });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.total).toBeGreaterThan(0);
      expect(r.data.groupName).toBe('Los del colegio');
    }
  });

  it('zip sin .txt da error amable', async () => {
    const zip = new JSZip();
    zip.file('foto.jpg', 'x');
    const bytes = await zip.generateAsync({ type: 'arraybuffer' });
    const r = await processChat({ fileName: 'chat.zip', bytes, mode: PAREJA });
    expect(r).toMatchObject({ ok: false, code: 'zip_no_txt' });
  });

  it('modo familia con grupo de 4 conserva a todos', async () => {
    const r = await processChat({ fileName: 'Chat de WhatsApp con Familia García.txt', bytes: enc(GROUP_4).buffer as ArrayBuffer, mode: FAMILIA_GRUPO });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.people.length).toBe(4);
      expect(r.data.groupName).toBe('Familia García');
    }
  });

  it('un archivo cualquiera no se reconoce como chat', async () => {
    const r = await processChat({ fileName: 'notas.txt', bytes: enc('lista del mercado\nleche\npan').buffer as ArrayBuffer, mode: PAREJA });
    expect(r).toMatchObject({ ok: false, code: 'unrecognized' });
  });
});
