import { describe, expect, it } from 'vitest';
import { cssVars, DEFAULT_THEME, PALETTES, parseTheme, THEMES_AVAILABLE } from './palette';

describe('temas por VITE_THEME', () => {
  it('cada tema disponible apunta a una paleta existente', () => {
    for (const t of THEMES_AVAILABLE) {
      const parsed = parseTheme(t);
      expect(parsed, t).not.toBeNull();
      expect(PALETTES[parsed!.palette]).toBeDefined();
    }
  });

  it('sin sufijo = tarjetas de color; "-oscuro" = tarjetas oscuras', () => {
    expect(parseTheme('tropico')).toEqual({ palette: 'tropico', cards: 'color' });
    expect(parseTheme('tropico-oscuro')).toEqual({ palette: 'tropico', cards: 'dark' });
  });

  it('tolera mayúsculas y espacios, rechaza nombres inexistentes', () => {
    expect(parseTheme('  Cafe-Oscuro ')).toEqual({ palette: 'cafe', cards: 'dark' });
    expect(parseTheme('lima')).toBeNull();
    expect(parseTheme('tropico-dark')).toBeNull();
    expect(parseTheme('')).toBeNull();
  });

  it('el tema por defecto es válido', () => {
    expect(parseTheme(DEFAULT_THEME)).not.toBeNull();
  });

  it('cssVars expone todas las variables que usa la app', () => {
    const v = cssVars(PALETTES.atardecer);
    expect(v['--bg']).toBe('#1A1029');
    expect(Object.keys(v)).toEqual(expect.arrayContaining(['--surface', '--lime', '--coral', '--cream', '--scrim']));
  });
});
