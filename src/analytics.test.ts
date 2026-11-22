import { describe, expect, it } from 'vitest';
import { analyticsData, modeKey, participantsRange } from './analytics';
import { AMIGO_DUO, FAMILIA_DUO, FAMILIA_GRUPO, PAREJA, PARCHE } from './modes';

describe('analítica segura', () => {
  it('convierte el modo en un identificador estable', () => {
    expect(modeKey(PAREJA)).toBe('pareja');
    expect(modeKey(AMIGO_DUO)).toBe('amigos-duo');
    expect(modeKey(FAMILIA_DUO)).toBe('familia-duo');
    expect(modeKey(PARCHE)).toBe('amigos-grupo');
    expect(modeKey(FAMILIA_GRUPO)).toBe('familia-grupo');
    // Pareja en grupo no existe: se normaliza a parche.
    expect(modeKey({ size: 'group', rel: 'pareja' })).toBe('amigos-grupo');
  });

  it('solo manda props seguras y descarta las ausentes', () => {
    expect(analyticsData()).toEqual({});
    expect(analyticsData({ mode: PAREJA, participants: '2', card: 3, ok: true })).toEqual({
      mode: 'pareja',
      participants: '2',
      card: 3,
      ok: true,
    });
    expect(analyticsData({ error: 'empty', ok: false })).toEqual({ error: 'empty', ok: false });
    // La tarjeta 0 (o cualquier número) sí se envía.
    expect(analyticsData({ card: 0 })).toEqual({ card: 0 });
    // Nunca viajan datos del chat: no hay campos para nombres, textos ni conteos.
    expect(Object.keys(analyticsData({ mode: FAMILIA_GRUPO }))).toEqual(['mode']);
  });

  it('agrupa los participantes en rangos', () => {
    expect(participantsRange(1)).toBe('2');
    expect(participantsRange(2)).toBe('2');
    expect(participantsRange(3)).toBe('3-5');
    expect(participantsRange(5)).toBe('3-5');
    expect(participantsRange(6)).toBe('6-10');
    expect(participantsRange(10)).toBe('6-10');
    expect(participantsRange(11)).toBe('11+');
  });
});
