import { describe, expect, it } from 'vitest';
import { parseChat } from './index';
import { ANDROID_CON_ARCHIVOS, ANDROID_SIN_ARCHIVOS, IOS_CON_ARCHIVOS, IOS_SIN_ARCHIVOS } from './__fixtures__/media';

describe('multimedia · iOS «Sin archivos»', () => {
  const msgs = parseChat(IOS_SIN_ARCHIVOS);
  it('reconoce cada tipo por su marca «… omitido»', () => {
    expect(msgs.map((m) => m.type)).toEqual([
      'sticker', 'image', 'video', 'gif', 'audio', 'document', 'document', 'contact', 'text',
    ]);
  });
  it('marca los links sin cambiar el tipo', () => {
    expect(msgs[8].link).toBe(true);
    expect(msgs[0].link).toBe(false);
  });
});

describe('multimedia · Android «Sin archivos»', () => {
  const msgs = parseChat(ANDROID_SIN_ARCHIVOS);
  it('todo sale como multimedia genérica', () => {
    expect(msgs.map((m) => m.type)).toEqual(['media', 'media', 'text', 'media']);
    expect(msgs[2].link).toBe(true);
  });
});

describe('multimedia · iOS con archivos', () => {
  const msgs = parseChat(IOS_CON_ARCHIVOS);
  it('clasifica adjuntos, ubicación, encuesta y visualización única', () => {
    expect(msgs.map((m) => m.type)).toEqual([
      'sticker', 'image', 'video', 'gif', 'audio', 'text', 'location', 'poll', 'viewonce', 'sticker',
    ]);
  });
  it('guarda el nombre del archivo adjunto', () => {
    expect(msgs[0].file).toBe('00000034-STICKER-2026-09-21-21-03-12.webp');
    expect(msgs[1].file).toBe('00000035-PHOTO-2026-09-21-21-04-00.jpg');
  });
  it('un pie de foto no cambia el tipo', () => {
    expect(msgs[1].type).toBe('image');
    expect(msgs[1].text).toContain('mira qué foto');
  });
  it('quita «Se editó este mensaje» y marca edited', () => {
    expect(msgs[5].text).toBe('hola');
    expect(msgs[5].edited).toBe(true);
    expect(msgs[0].edited).toBe(false);
  });
});

describe('multimedia · Android con archivos (es y en)', () => {
  const msgs = parseChat(ANDROID_CON_ARCHIVOS);
  it('clasifica por nombre de archivo', () => {
    expect(msgs.map((m) => m.type)).toEqual([
      'sticker', 'image', 'video', 'audio', 'document', 'sticker', 'image', 'location', 'poll', 'text',
    ]);
    expect(msgs[0].file).toBe('STK-20260921-WA0003.webp');
    expect(msgs[4].file).toBe('Informe final.pdf');
  });
  it('editado en inglés', () => {
    expect(msgs[9]).toMatchObject({ text: 'ayer', edited: true, type: 'text' });
  });
});
