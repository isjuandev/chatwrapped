import { describe, expect, it } from 'vitest';
import { chatNameFromFile, parseChat } from './index';
import {
  ANDROID_12H, ANDROID_12H_EN_MDY, ANDROID_24H, GROUP_4, IOS_12H_ES, IOS_24H,
} from './__fixtures__';

const d = (ts: number): Date => new Date(ts);

describe('parseChat · iOS 12 h es-CO', () => {
  const msgs = parseChat(IOS_12H_ES);

  it('descarta cifrado y mensajes de sistema', () => {
    expect(msgs.some((m) => /cifrados/.test(m.text))).toBe(false);
    expect(msgs.some((m) => /se unió/.test(m.text))).toBe(false);
    expect(msgs).toHaveLength(7);
  });

  it('lee fecha y hora con "p. m." y espacio fino', () => {
    const first = msgs[0];
    expect(first.author).toBe('Juana');
    expect(first.text).toBe('Hola amor ❤️ 😂');
    expect(d(first.ts).getFullYear()).toBe(2025);
    expect(d(first.ts).getMonth()).toBe(1);
    expect(d(first.ts).getDate()).toBe(14);
    expect(d(first.ts).getHours()).toBe(23);
    expect(d(first.ts).getMinutes()).toBe(3);
    expect(d(first.ts).getSeconds()).toBe(45);
  });

  it('une líneas sin prefijo al mensaje anterior', () => {
    expect(msgs[1].text).toBe('jajaja qué bobo\nte quiero mucho\ny más');
  });

  it('clasifica audio, multimedia y eliminados', () => {
    expect(msgs[2].type).toBe('audio');
    expect(msgs[3].type).toBe('image');
    expect(msgs[4].type).toBe('deleted');
    expect(msgs[1].type).toBe('text');
  });

  it('12 a. m. es medianoche y 12 p. m. es mediodía', () => {
    expect(d(msgs[4].ts).getHours()).toBe(0);
    expect(d(msgs[5].ts).getHours()).toBe(12);
  });
});

describe('parseChat · otros formatos', () => {
  it('iOS 24 h con año de 4 dígitos', () => {
    const m = parseChat(IOS_24H);
    expect(m).toHaveLength(2);
    expect(d(m[0].ts).getHours()).toBe(23);
    expect(d(m[1].ts).getHours()).toBe(7);
  });

  it('Android 24 h: sistema fuera, comillas con ":" no confunden, multimedia y audio', () => {
    const m = parseChat(ANDROID_24H);
    expect(m.map((x) => x.author)).toEqual(['Juana', 'Camilo', 'Camilo', 'Juana', 'Camilo']);
    expect(m[0].text).toBe('hola');
    expect(d(m[0].ts).getMonth()).toBe(1);
    expect(d(m[0].ts).getDate()).toBe(14);
    expect(m[1].type).toBe('media');
    expect(m[2].type).toBe('audio');
    expect(m[3].type).toBe('deleted');
    expect(m[4].text).toBe('buenos días\namor');
  });

  it('Android 12 h con "p. m." / "a. m."', () => {
    const m = parseChat(ANDROID_12H);
    expect(m.map((x) => d(x.ts).getHours())).toEqual([23, 0, 12, 13]);
  });

  it('AM/PM en inglés y orden mes/día cuando el segundo componente > 12', () => {
    const m = parseChat(ANDROID_12H_EN_MDY);
    expect(m).toHaveLength(3);
    expect(d(m[0].ts).getMonth()).toBe(1);
    expect(d(m[0].ts).getDate()).toBe(14);
    expect(d(m[0].ts).getHours()).toBe(23);
    expect(d(m[1].ts).getHours()).toBe(0);
    expect(d(m[2].ts).getMonth()).toBe(2); // 3/1 -> 1 de marzo (m/d)
    expect(d(m[2].ts).getDate()).toBe(1);
  });

  it('por defecto interpreta d/m cuando es ambiguo', () => {
    const m = parseChat('3/4/2025, 10:00 - Ana: hola\n');
    expect(d(m[0].ts).getMonth()).toBe(3);
    expect(d(m[0].ts).getDate()).toBe(3);
  });

  it('grupo de 4 personas', () => {
    const m = parseChat(GROUP_4);
    expect(new Set(m.map((x) => x.author)).size).toBe(4);
    expect(m).toHaveLength(11);
    expect(m.filter((x) => x.type === 'audio')).toHaveLength(1);
  });

  it('texto sin formato de WhatsApp da lista vacía', () => {
    expect(parseChat('esto no es un chat\nni de lejos')).toEqual([]);
  });
});

describe('chatNameFromFile', () => {
  it('extrae el nombre del archivo de Android', () => {
    expect(chatNameFromFile('Chat de WhatsApp con Los Parceros.txt')).toBe('Los Parceros');
    expect(chatNameFromFile('WhatsApp Chat - Familia García.zip')).toBe('Familia García');
  });
  it('devuelve null para _chat.txt', () => {
    expect(chatNameFromFile('_chat.txt')).toBeNull();
  });
});

describe('parseChat · avisos del sistema de iOS en grupos', () => {
  it('descarta los avisos con U+200E pero conserva multimedia y eliminados', async () => {
    const { IOS_GROUP_SYSTEM } = await import('./__fixtures__');
    const msgs = parseChat(IOS_GROUP_SYSTEM);
    expect(msgs.map((m) => [m.author, m.type])).toEqual([
      ['Larry', 'text'],
      ['Ana Ruiz', 'image'],
      ['Ana Ruiz', 'audio'],
      ['Larry', 'deleted'],
    ]);
  });
});
