import { normalizeMode } from './modes';
import type { Mode } from './types';

/**
 * Analítica de visitas con Umami self-hosted.
 *
 * REGLA: solo se aceptan props sin datos del chat (modo, nº de participantes
 * en rango, éxito/error, tarjeta). Nunca nombres, textos ni conteos exactos.
 *
 * El tracker y el colector se sirven desde el mismo dominio (`/medicion`,
 * proxificado por nginx a Umami), así la CSP `script-src 'self'` no cambia y
 * no se manda nada a terceros. Sin `VITE_UMAMI_WEBSITE_ID` no se carga nada.
 */
export type AnalyticsEvent =
  | 'landing_view'
  | 'start'
  | 'upload_ok'
  | 'upload_error'
  | 'card_view'
  | 'download'
  | 'download_all'
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

/** Dato plano que acepta Umami. */
export type AnalyticsData = Record<string, string | number | boolean>;

export function participantsRange(n: number): SafeProps['participants'] {
  if (n <= 2) return '2';
  if (n <= 5) return '3-5';
  if (n <= 10) return '6-10';
  return '11+';
}

/** Identificador estable del modo para el panel (`pareja`, `amigos-duo`, `amigos-grupo`…). */
export function modeKey(mode: Mode): string {
  const m = normalizeMode(mode);
  return m.rel === 'pareja' ? 'pareja' : `${m.rel}-${m.size === 'group' ? 'grupo' : 'duo'}`;
}

/** Convierte props seguras al formato de datos de Umami (sin `undefined`, modo como texto). */
export function analyticsData(props: SafeProps = {}): AnalyticsData {
  const data: AnalyticsData = {};
  if (props.mode) data.mode = modeKey(props.mode);
  if (props.participants) data.participants = props.participants;
  if (typeof props.card === 'number') data.card = props.card;
  if (typeof props.ok === 'boolean') data.ok = props.ok;
  if (props.error) data.error = props.error;
  return data;
}

/** Ruta propia del script y del colector (nginx los proxifica a Umami). */
const UMAMI_BASE = '/medicion';

const WEBSITE_ID = (import.meta.env.VITE_UMAMI_WEBSITE_ID ?? '').trim();
const MAX_QUEUE = 50;

interface UmamiTracker {
  track(event: string, data?: AnalyticsData): Promise<void> | void;
}

declare global {
  interface Window {
    umami?: UmamiTracker;
    umamiConfig?: { websiteId?: string; hostUrl?: string; doNotTrack?: boolean };
  }
}

let tracker: UmamiTracker | null = null;
let started = false;
let failed = false;
const queue: Array<{ event: AnalyticsEvent; data: AnalyticsData }> = [];

/**
 * Carga el tracker de Umami si hay website ID configurado. Se llama una vez
 * desde `main.tsx`; sin ID no se inyecta ningún script (no-op).
 */
export function initAnalytics(): void {
  if (started || failed || !WEBSITE_ID || typeof document === 'undefined') return;
  started = true;
  // El script se inyecta desde JS: el ID llega por entorno y el HTML no lo expone.
  window.umamiConfig = {
    ...(window.umamiConfig ?? {}),
    websiteId: WEBSITE_ID,
    hostUrl: UMAMI_BASE,
    doNotTrack: true,
  };
  const script = document.createElement('script');
  script.async = true;
  script.src = `${UMAMI_BASE}/script.js`;
  script.dataset.umami = 'true';
  script.addEventListener('load', () => {
    tracker = window.umami ?? null;
    if (!tracker) {
      failed = true;
      queue.length = 0;
      return;
    }
    flush();
  });
  // Bloqueado por el navegador o por Umami caído: la app sigue sin analítica.
  script.addEventListener('error', () => {
    failed = true;
    queue.length = 0;
  });
  document.head.appendChild(script);
}

function flush(): void {
  if (!tracker) return;
  for (const item of queue.splice(0)) void tracker.track(item.event, item.data);
}

/** Registra un evento seguro. Si el tracker aún no cargó, se encola (máx. 50). */
export function track(event: AnalyticsEvent, props: SafeProps = {}): void {
  if (!WEBSITE_ID) return;
  const data = analyticsData(props);
  if (tracker) {
    void tracker.track(event, data);
    return;
  }
  if (!started) initAnalytics();
  if (!failed && queue.length < MAX_QUEUE) queue.push({ event, data });
}
