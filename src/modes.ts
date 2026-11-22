import type { Mode, Rel, Size } from './types';

export const PAREJA: Mode = { size: 'duo', rel: 'pareja' };
export const AMIGO_DUO: Mode = { size: 'duo', rel: 'amigos' };
export const FAMILIA_DUO: Mode = { size: 'duo', rel: 'familia' };
export const PARCHE: Mode = { size: 'group', rel: 'amigos' };
export const FAMILIA_GRUPO: Mode = { size: 'group', rel: 'familia' };

/** Combinaciones válidas, en el orden en que se muestran. */
export const DUO_MODES: Mode[] = [PAREJA, AMIGO_DUO, FAMILIA_DUO];
export const GROUP_MODES: Mode[] = [PARCHE, FAMILIA_GRUPO];
export const VALID_MODES: Mode[] = [...DUO_MODES, ...GROUP_MODES];

export const sameMode = (a: Mode, b: Mode): boolean => a.size === b.size && a.rel === b.rel;

/** Etiqueta corta de la UI. */
export function modeLabel(m: Mode): string {
  if (m.size === 'duo') return m.rel === 'pareja' ? 'Pareja' : m.rel === 'amigos' ? 'Mejor amigo/a' : 'Familia';
  return m.rel === 'familia' ? 'Familia' : 'Parche';
}

/** Descripción corta de la UI. */
export function modeDesc(m: Mode): string {
  if (m.size === 'duo') {
    return m.rel === 'pareja' ? 'Tu persona' : m.rel === 'amigos' ? 'Tu parcero o parcera' : 'Mamá, papá, hermano/a…';
  }
  return m.rel === 'familia' ? 'El grupo de la familia' : 'Tus amigos';
}

/** Una combinación que no existe (pareja en grupo) se lleva a su equivalente más cercana. */
export function normalizeMode(m: Mode): Mode {
  return m.size === 'group' && m.rel === 'pareja' ? PARCHE : m;
}

/** Tamaño natural de un chat según el número de participantes. */
export function sizeOf(participants: number): Size {
  return participants <= 2 ? 'duo' : 'group';
}

/** Opciones válidas para un chat con ese número de participantes. */
export function modeOptionsFor(participants: number): Mode[] {
  return sizeOf(participants) === 'duo' ? DUO_MODES : GROUP_MODES;
}

function joinLabels(labels: string[]): string {
  if (labels.length <= 1) return labels.join('');
  return `${labels.slice(0, -1).join(', ')} o ${labels[labels.length - 1]}`;
}

export interface ModeSuggestion {
  /** El tamaño del modo elegido coincide con el chat: no hay que preguntar. */
  ok: boolean;
  /** Pregunta para la hoja ("Este chat tiene 5 personas. ¿Lo armamos como Parche o como Familia?"). */
  question: string;
  options: Mode[];
}

/**
 * Lógica pura de la hoja de sugerencia: dado el modo elegido y el número de participantes
 * (con mensajes en la ventana), decide si hay que preguntar y con qué opciones.
 */
export function suggestMode(chosen: Mode, participants: number): ModeSuggestion {
  if (sizeOf(participants) === chosen.size) return { ok: true, question: '', options: [] };
  const options = modeOptionsFor(participants);
  const labels = options.map((o) => `como ${modeLabel(o)}`);
  const who = participants === 1 ? '1 persona' : `${participants} personas`;
  return {
    ok: false,
    question: `Este chat tiene ${who}. ¿Lo armamos ${joinLabels(labels)}?`,
    options,
  };
}

export type { Rel };
