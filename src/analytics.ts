import type { Mode } from './types';

/**
 * Gancho de analítica. En el MVP es un no-op.
 * REGLA: solo se aceptan props sin datos del chat (modo, nº de participantes
 * en rango, éxito/error). Nunca nombres, textos ni conteos exactos de mensajes.
 */
export type AnalyticsEvent =
  | 'landing_view'
  | 'start'
  | 'upload_ok'
  | 'upload_error'
  | 'card_view'
  | 'download'
  | 'share'
  | 'full_report_open';

export interface SafeProps {
  mode?: Mode;
  /** Rango de participantes, nunca el número exacto ni nombres. */
  participants?: '2' | '3-5' | '6-10' | '11+';
  card?: number;
  ok?: boolean;
  error?: 'unrecognized' | 'empty' | 'zip_no_txt' | 'zip_too_big' | 'other';
}

export function participantsRange(n: number): SafeProps['participants'] {
  if (n <= 2) return '2';
  if (n <= 5) return '3-5';
  if (n <= 10) return '6-10';
  return '11+';
}

export function track(event: AnalyticsEvent, props: SafeProps = {}): void {
  // Aquí se conectaría el proveedor de analítica (p. ej. Plausible).
  void event;
  void props;
}
