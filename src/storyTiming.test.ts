import { describe, expect, it } from 'vitest';
import { CARDS } from './cards/deck';
import { DEFAULT_STORY_MS, storyDurationMs } from './storyTiming';

describe('storyDurationMs', () => {
  it('6 s por defecto; 8 s para awards, summary y talk; 10 s para el reto', () => {
    expect(storyDurationMs('cover')).toBe(6000);
    expect(storyDurationMs('awards')).toBe(8000);
    expect(storyDurationMs('summary')).toBe(8000);
    expect(storyDurationMs('talk')).toBe(8000);
    expect(storyDurationMs('quiz')).toBe(10000);
    expect(storyDurationMs(undefined)).toBe(DEFAULT_STORY_MS);
  });
  it('toda tarjeta tiene una duración positiva', () => {
    for (const c of CARDS) expect(storyDurationMs(c.id)).toBeGreaterThanOrEqual(6000);
  });
});
