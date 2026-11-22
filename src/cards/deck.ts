import type { WrappedData } from '../types';
import { drawCard1 } from './card1';
import { drawCard2 } from './card2';
import { drawCard3 } from './card3';
import { drawCard4 } from './card4';
import { drawCard5 } from './card5';
import { drawCard6 } from './card6';
import { drawCardMedia, mediaAvailable } from './cardA';
import { drawCardStickers } from './cardB';
import { drawCardMonth } from './cardC';
import { drawCardWeekday } from './cardD';
import { drawCardStreaks } from './cardE';
import { drawCardReply, replyAvailable } from './cardF';
import { drawCardSignature, signatureRows } from './cardG';
import { drawCardPairs, pairsAvailable } from './cardH';
import { drawCardQuiz, quizAvailable } from './cardQuiz';
import { drawCardSummary } from './cardSummary';
import { drawCardTime, timeAvailable } from './cardTime';
import { drawCardEvolution, evolutionAvailable } from './cardEvolution';
import { drawCardPhrases, phrasesAvailable } from './cardPhrases';
import type { CardOpts, ThemeId } from './draw';

export type CardId =
  | 'cover' | 'who' | 'month' | 'weekday' | 'hour' | 'streaks' | 'reply'
  | 'talk' | 'signature' | 'media' | 'stickers' | 'pairs' | 'awards' | 'quiz' | 'summary' | 'end'
  | 'time' | 'evolution' | 'phrases';

/** Mazo: la historia gratis o el reporte completo. */
export type Tier = 'free' | 'full';

export type Draw = (ctx: CanvasRenderingContext2D, data: WrappedData, opts?: CardOpts) => void;

interface CardDef {
  id: CardId;
  tier: Tier;
  theme: ThemeId;
  available: (d: WrappedData) => boolean;
  draw: Draw;
}

const always = (): boolean => true;

/** Mazo completo, en orden. `available` decide cuáles entran. */
export const CARDS: CardDef[] = [
  { id: 'cover', tier: 'free', theme: 'dark', available: always, draw: drawCard1 },
  { id: 'who', tier: 'free', theme: 'lime', available: always, draw: drawCard2 },
  { id: 'month', tier: 'free', theme: 'cream', available: (d) => d.spanDays >= 60, draw: drawCardMonth },
  { id: 'weekday', tier: 'free', theme: 'coral', available: (d) => d.daysTalking >= 14, draw: drawCardWeekday },
  { id: 'hour', tier: 'free', theme: 'coral', available: always, draw: drawCard3 },
  { id: 'streaks', tier: 'free', theme: 'lime', available: (d) => d.daysTalking >= 7, draw: drawCardStreaks },
  { id: 'reply', tier: 'free', theme: 'cream', available: replyAvailable, draw: drawCardReply },
  { id: 'talk', tier: 'free', theme: 'dark', available: always, draw: drawCard4 },
  { id: 'signature', tier: 'free', theme: 'coral', available: (d) => signatureRows(d).length >= 2, draw: drawCardSignature },
  { id: 'media', tier: 'free', theme: 'cream', available: mediaAvailable, draw: drawCardMedia },
  { id: 'stickers', tier: 'free', theme: 'lime', available: (d) => d.topStickers.length >= 1, draw: drawCardStickers },
  { id: 'pairs', tier: 'free', theme: 'dark', available: pairsAvailable, draw: drawCardPairs },
  { id: 'awards', tier: 'free', theme: 'cream', available: always, draw: drawCard5 },
  { id: 'quiz', tier: 'free', theme: 'coral', available: quizAvailable, draw: drawCardQuiz },
  { id: 'summary', tier: 'free', theme: 'dark', available: always, draw: drawCardSummary },
  { id: 'end', tier: 'free', theme: 'lime', available: always, draw: drawCard6 },
  // Reporte completo (segundo mazo; no aparece en la historia gratis)
  { id: 'time', tier: 'full', theme: 'dark', available: timeAvailable, draw: drawCardTime },
  { id: 'evolution', tier: 'full', theme: 'cream', available: evolutionAvailable, draw: drawCardEvolution },
  { id: 'phrases', tier: 'full', theme: 'coral', available: phrasesAvailable, draw: drawCardPhrases },
];

const BY_ID = new Map<CardId, CardDef>(CARDS.map((c) => [c.id, c]));

/** Decide qué tarjetas van y en qué orden, para la historia gratis (`free`) o el reporte completo (`full`). */
export function buildDeck(data: WrappedData, tier: Tier = 'free'): CardId[] {
  return CARDS.filter((c) => c.tier === tier && c.available(data)).map((c) => c.id);
}

const ALT: Record<ThemeId, ThemeId> = { dark: 'cream', cream: 'dark', lime: 'coral', coral: 'lime' };

/**
 * Fondo de cada tarjeta del mazo. Tras omitir tarjetas, si dos seguidas quedan con el mismo
 * fondo, la segunda pasa al alterno (dark↔cream, lime↔coral), resolviendo de izquierda a derecha.
 */
export function deckThemes(deck: CardId[]): ThemeId[] {
  const out: ThemeId[] = [];
  for (const id of deck) {
    let theme = BY_ID.get(id)!.theme;
    if (out.length > 0 && out[out.length - 1] === theme) theme = ALT[theme];
    out.push(theme);
  }
  return out;
}

export function drawerOf(id: CardId): Draw {
  return BY_ID.get(id)!.draw;
}
