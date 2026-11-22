import type { CardId } from './cards';

/** Duración por defecto de cada tarjeta en el avance automático (estilo historias). */
export const DEFAULT_STORY_MS = 6000;

/** Tarjetas con más contenido que necesitan más tiempo. */
export const STORY_DURATIONS_MS: Partial<Record<CardId, number>> = {
  awards: 8000,
  summary: 8000,
  talk: 8000,
  quiz: 10000,
};

export function storyDurationMs(id: CardId | undefined): number {
  return (id && STORY_DURATIONS_MS[id]) || DEFAULT_STORY_MS;
}

/** Mantener presionada la tarjeta más de esto cuenta como "pausa", no como toque. */
export const HOLD_MS = 180;
