import { describe, expect, it } from 'vitest';
import { COPY, COPY_KEYS, copyFor, fill, hourPhraseFor, weekdayPhraseFor } from './copy';
import {
  AMIGO_DUO, DUO_MODES, FAMILIA_DUO, FAMILIA_GRUPO, GROUP_MODES, modeLabel, normalizeMode, PAREJA, PARCHE,
  suggestMode, VALID_MODES,
} from './modes';

describe('suggestMode (participantes → opciones)', () => {
  it('no pregunta si el tamaño coincide', () => {
    expect(suggestMode(PAREJA, 2).ok).toBe(true);
    expect(suggestMode(AMIGO_DUO, 2).ok).toBe(true);
    expect(suggestMode(PARCHE, 5).ok).toBe(true);
    expect(suggestMode(FAMILIA_GRUPO, 3).ok).toBe(true);
    expect(suggestMode(PARCHE, 3).options).toEqual([]);
  });

  it('5 personas elegidas como pareja: ofrece Parche o Familia (grupo)', () => {
    const s = suggestMode(PAREJA, 5);
    expect(s.ok).toBe(false);
    expect(s.options).toEqual(GROUP_MODES);
    expect(s.question).toBe('Este chat tiene 5 personas. ¿Lo armamos como Parche o como Familia?');
  });

  it('2 personas elegidas como grupo: ofrece Pareja, Mejor amigo/a o Familia', () => {
    const s = suggestMode(FAMILIA_GRUPO, 2);
    expect(s.ok).toBe(false);
    expect(s.options).toEqual(DUO_MODES);
    expect(s.question).toBe(
      'Este chat tiene 2 personas. ¿Lo armamos como Pareja, como Mejor amigo/a o como Familia?',
    );
  });

  it('con 3 personas también es grupo y con 1 es duo', () => {
    expect(suggestMode(PAREJA, 3).options).toEqual(GROUP_MODES);
    expect(suggestMode(PARCHE, 1).options).toEqual(DUO_MODES);
  });

  it('las opciones sugeridas siempre son combinaciones válidas', () => {
    for (const n of [1, 2, 3, 8, 40]) for (const m of VALID_MODES) for (const o of suggestMode(m, n).options) {
      expect(VALID_MODES).toContainEqual(o);
    }
  });

  it('etiquetas', () => {
    expect(VALID_MODES.map(modeLabel)).toEqual(['Pareja', 'Mejor amigo/a', 'Familia', 'Parche', 'Familia']);
  });

  it('pareja en grupo (inexistente) se normaliza a Parche', () => {
    expect(normalizeMode({ size: 'group', rel: 'pareja' })).toEqual(PARCHE);
  });
});

describe('COPY', () => {
  const combos = [PAREJA, AMIGO_DUO, FAMILIA_DUO, PARCHE, FAMILIA_GRUPO];

  it('las 5 combinaciones tienen todas las claves, sin vacíos', () => {
    expect(combos).toHaveLength(5);
    for (const m of combos) {
      const c = copyFor(m);
      for (const k of COPY_KEYS) {
        expect(typeof c[k], `${m.rel}/${m.size} ${k}`).toBe('string');
        expect(c[k].trim().length, `${m.rel}/${m.size} ${k}`).toBeGreaterThan(0);
      }
      expect(Object.keys(c).sort()).toEqual([...COPY_KEYS].sort());
    }
    expect(COPY.pareja.duo).toBe(copyFor(PAREJA));
  });

  it('textos de la tabla del SPEC', () => {
    expect(copyFor(PAREJA)['cover.kicker']).toBe('Nuestro año en el chat');
    expect(copyFor(AMIGO_DUO)['cover.bubble1']).toBe('¿ya viste?');
    expect(copyFor(FAMILIA_DUO)['cover.bubble1']).toBe('¿ya almorzaste?');
    expect(copyFor(PARCHE)['cover.kicker']).toBe('El año del parche');
    expect(copyFor(FAMILIA_GRUPO)['cover.kicker']).toBe('Así se habló la familia');
    expect(copyFor(PARCHE)['hour.lead']).toBe('La hora del parche');
    expect(copyFor(FAMILIA_GRUPO)['hour.lead']).toBe('La hora de la familia');
    expect(copyFor(PARCHE)['end.bubble1']).toBe('¿y tu parche qué?');
    expect(copyFor(FAMILIA_GRUPO)['end.bubble1']).toBe('¿y tu familia qué?');
    expect(copyFor(PAREJA)['end.bubble1']).toBe('¿y el tuyo con quién es?');
  });

  it('bubble2 lleva {n} y se rellena', () => {
    for (const m of combos) expect(copyFor(m)['cover.bubble2']).toContain('{n}');
    expect(fill(copyFor(PAREJA)['cover.bubble2'], { n: '18.432' })).toBe('18.432 mensajes después...');
  });

  it('franjas y días varían por relación', () => {
    const rels = [PAREJA, AMIGO_DUO, FAMILIA_DUO].map((m) => hourPhraseFor(m, 7));
    expect(new Set(rels).size).toBe(3);
    const days = [PAREJA, AMIGO_DUO, FAMILIA_DUO].map((m) => weekdayPhraseFor(m, 4));
    expect(new Set(days).size).toBe(3);
    for (const m of combos) {
      for (const h of [2, 8, 15, 19, 23]) expect(hourPhraseFor(m, h).length).toBeGreaterThan(0);
      for (let d = 0; d < 7; d++) expect(weekdayPhraseFor(m, d).length).toBeGreaterThan(0);
    }
  });
});
