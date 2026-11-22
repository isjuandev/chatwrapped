import { describe, expect, it } from 'vitest';
import type { WrappedData } from '../types';
import { monthPhrase } from './cardC';

const LABELS = ['diciembre', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre'];
const withCounts = (counts: number[]): WrappedData =>
  ({ monthly: counts.map((count, i) => ({ count, label: LABELS[i], initial: LABELS[i][0].toUpperCase() })) }) as unknown as WrappedData;

describe('monthPhrase', () => {
  it('no cuenta como "callados" los meses antes de que existiera el chat', () => {
    const p = monthPhrase(withCounts([0, 0, 0, 0, 0, 10, 200, 493, 300, 250, 260, 180]));
    expect(p.text).not.toContain('diciembre');
    expect(p.text).toContain('mayo');
  });

  it('sí dice "casi ni se hablaron" si hay un mes en cero dentro del chat', () => {
    const p = monthPhrase(withCounts([50, 60, 0, 70, 80, 90, 100, 120, 90, 80, 70, 60]));
    expect(p.text).toContain('en febrero casi ni se hablaron');
  });
});
