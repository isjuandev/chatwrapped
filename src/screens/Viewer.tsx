import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { track } from '../analytics';
import { buildDeck, cardToBlob, renderCardTo } from '../cards';
import type { Tier } from '../cards';
import { FEATURES } from '../config';
import { fullReportButton } from '../fullReport';
import { HOLD_MS, storyDurationMs } from '../storyTiming';
import type { WrappedData } from '../types';
import type { ZipProgress } from '../zipExport';
import { allEntries, canIncludeFullReport, deckToZip } from '../zipExport';

interface Props {
  data: WrappedData;
  onClose: () => void;
}

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Trazos de los íconos del visor (24×24, stroke). */
const ICON = {
  close: 'M6 6l12 12M18 6L6 18',
  download: 'M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19h14',
  share: 'M12 15V4m0 0L7.5 8.5M12 4l4.5 4.5M6 12v6a2 2 0 002 2h8a2 2 0 002-2v-6',
  zip: 'M4 7h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V7zm0 0l2-3h12l2 3M10 11h4',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zm10 3a3 3 0 100-6 3 3 0 000 6z',
  pause: 'M8 5v14M16 5v14',
  play: 'M8 5l11 7-11 7z',
  eyeOff: 'M3 3l18 18M10.6 5.1A10 10 0 0112 5c6.5 0 10 7 10 7a17 17 0 01-3.2 4.1M6.6 6.6C3.9 8.3 2 12 2 12s3.5 7 10 7c1.6 0 3-.4 4.3-1M9.9 9.9a3 3 0 004.2 4.2',
};

export default function Viewer({ data, onClose }: Props) {
  const [index, setIndex] = useState(1);
  const [tier, setTier] = useState<Tier>('free');
  const deck = useMemo(() => buildDeck(data, tier), [data, tier]);
  const fullLen = useMemo(() => buildDeck(data, 'full').length, [data]);
  const fullBtn = fullReportButton(FEATURES, fullLen);
  const full = tier === 'full';
  const count = deck.length;
  const isQuiz = deck[index - 1] === 'quiz';
  const [hide, setHide] = useState(false);
  const [revealed, setRevealed] = useState(false);
  // La respuesta solo cuenta en la tarjeta del reto; al salir de ella vuelve a ser pregunta.
  const reveal = isQuiz && revealed;
  const [notice, setNotice] = useState<string | null>(data.warnings[0] ?? null);
  const [busy, setBusy] = useState(false);
  const [zipProgress, setZipProgress] = useState<ZipProgress | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  // Avance automático (estilo historias): pausas por botón, por mantener presionado y por pestaña oculta.
  const [userPaused, setUserPaused] = useState(false);
  const [holding, setHolding] = useState(false);
  const [tabHidden, setTabHidden] = useState(() => typeof document !== 'undefined' && document.visibilityState === 'hidden');
  const [nav, setNav] = useState(0); // sube con cada navegación manual: reinicia el tiempo de la tarjeta
  const holdTimer = useRef<number | undefined>(undefined);
  const held = useRef(false);
  const paused = userPaused || holding || tabHidden || busy;

  const go = useCallback((d: number) => {
    setRevealed(false);
    setNav((n) => n + 1);
    setIndex((i) => Math.min(count, Math.max(1, i + d)));
  }, [count]);

  // Dibujar la tarjeta actual
  useEffect(() => {
    let cancelled = false;
    const c = canvas.current;
    if (!c) return;
    void renderCardTo(c, index, data, hide, reveal, tier).catch(() => {
      if (!cancelled) setNotice('No pudimos dibujar la tarjeta.');
    });
    track('card_view', { card: index });
    return () => {
      cancelled = true;
    };
  }, [index, hide, reveal, data, tier]);

  const switchTier = (next: Tier): void => {
    setRevealed(false);
    setNav((n) => n + 1);
    setUserPaused(false);
    setIndex(1);
    setTier(next);
  };

  const onFullReport = (): void => {
    if (fullBtn.action === 'open') {
      track('full_report_open');
      switchTier('full');
    } else if (fullBtn.action === 'pay') {
      // Futuro: flujo de pago (FEATURES.payments). Todavía no existe.
      setNotice('El pago del reporte completo todavía no está disponible.');
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === ' ' || e.key === 'Spacebar') {
        // Sobre un botón, el espacio lo activa a él (no lo duplicamos).
        if (e.repeat || (e.target as HTMLElement | null)?.closest('button, a, input, select, textarea')) return;
        e.preventDefault();
        setUserPaused((p) => !p);
      } else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose]);

  useEffect(() => {
    const onVis = (): void => setTabHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => () => window.clearTimeout(holdTimer.current), []);

  const fileName = `chat-wrapped-${data.year}${full ? '-completo' : ''}-${index}.png`;

  const onDownload = async (): Promise<void> => {
    setBusy(true);
    try {
      download(await cardToBlob(index, data, hide, reveal, tier), fileName);
      track('download', { card: index });
    } finally {
      setBusy(false);
    }
  };

  /** Todo (historia, respuesta del reto y reporte completo si se puede abrir) en un .zip. */
  const onDownloadAll = async (): Promise<void> => {
    setBusy(true);
    setZipProgress({ done: 0, total: allEntries(data, { includeFull: canIncludeFullReport(data) }).length });
    try {
      const zip = await deckToZip(data, { hide, onProgress: setZipProgress });
      download(zip.blob, zip.name);
      track('download_all');
    } catch {
      setNotice('No pudimos preparar el .zip. Intenta de nuevo.');
    } finally {
      setZipProgress(null);
      setBusy(false);
    }
  };

  const zipLabel =
    zipProgress === null
      ? 'Descargar todo (.zip)'
      : zipProgress.done === 0
        ? 'Preparando el .zip…'
        : `Preparando ${zipProgress.done} de ${zipProgress.total}…`;

  const onShare = async (): Promise<void> => {
    setBusy(true);
    try {
      const blob = await cardToBlob(index, data, hide, reveal, tier);
      const file = new File([blob], fileName, { type: 'image/png' });
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Chat Wrapped' });
          track('share', { card: index });
        } catch (e) {
          if (!(e instanceof DOMException && e.name === 'AbortError')) download(blob, fileName);
        }
      } else {
        download(blob, fileName);
        track('share', { card: index });
      }
    } finally {
      setBusy(false);
    }
  };

  const endHold = (): boolean => {
    window.clearTimeout(holdTimer.current);
    const was = held.current;
    held.current = false;
    if (was) setHolding(false);
    return was;
  };
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>): void => {
    start.current = { x: e.clientX, y: e.clientY };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* sin captura: el soltar fuera del escenario se maneja con pointercancel */
    }
    window.clearTimeout(holdTimer.current);
    holdTimer.current = window.setTimeout(() => {
      held.current = true;
      setHolding(true);
    }, HOLD_MS);
  };
  const onPointerCancel = (): void => {
    start.current = null;
    endHold();
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>): void => {
    const s = start.current;
    start.current = null;
    // Mantener presionado solo pausa: al soltar reanuda y no navega.
    if (endHold()) return;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      go(dx < 0 ? 1 : -1);
      return;
    }
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      const rect = e.currentTarget.getBoundingClientRect();
      go(e.clientX - rect.left < rect.width * 0.4 ? -1 : 1);
    }
  };

  const Icon = ({ d }: { d: string }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );

  return (
    <main className="screen screen--viewer">
      <div
        className="progress"
        aria-hidden="true"
        style={{ gridTemplateColumns: `repeat(${count}, 1fr)` }}
      >
        {Array.from({ length: count }, (_, i) => {
          const n = i + 1;
          // La última tarjeta se queda con la barra llena: no cierra ni reinicia.
          const active = n === index && n < count;
          return (
            <i key={`${tier}-${n}-${n === index ? nav : 0}`} className={n < index || (n === index && !active) ? 'on' : ''}>
              {active && (
                <b
                  className="progress__fill"
                  style={{ animationDuration: `${storyDurationMs(deck[i])}ms`, animationPlayState: paused ? 'paused' : 'running' }}
                  onAnimationEnd={() => go(1)}
                />
              )}
            </i>
          );
        })}
      </div>
      <div className="viewer-head">
        <span aria-live="polite">
          {full ? 'Completo · ' : ''}
          {index} / {count}
        </span>
        <div className="viewer-head__right">
          {full ? (
            <button
              className="chip chip--accent"
              type="button"
              onClick={() => switchTier('free')}
              aria-label="Volver a la historia"
            >
              ← Historia
            </button>
          ) : (
            <button
              className={fullBtn.enabled ? 'chip chip--accent' : 'chip'}
              type="button"
              disabled={!fullBtn.enabled}
              onClick={onFullReport}
              title={fullBtn.label}
            >
              {fullBtn.enabled ? 'Reporte completo' : fullBtn.label}
            </button>
          )}
          <button
            className="icon-btn"
            onClick={() => setUserPaused((p) => !p)}
            aria-label={userPaused ? 'Reanudar' : 'Pausar'}
            type="button"
          >
            <Icon d={userPaused ? ICON.play : ICON.pause} />
          </button>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar" type="button">
            <Icon d={ICON.close} />
          </button>
        </div>
      </div>

      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)}>Entendido</button>
        </div>
      )}

      <div
        className="stage"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onContextMenu={(e) => e.preventDefault()}
      >
        <canvas
          ref={canvas}
          className="card-canvas"
          width={1080}
          height={1920}
          role="img"
          aria-label={`${full ? 'Reporte completo, tarjeta' : 'Tarjeta'} ${index} de ${count}`}
        />
      </div>

      {/* Fila de altura fija: el chip del reto reserva su espacio aunque no se vea,
          así la tarjeta no cambia de tamaño (ni "salta") al llegar al reto. */}
      <div className="chips">
        <button
          className={hide ? 'chip chip--on' : 'chip'}
          type="button"
          role="switch"
          aria-checked={hide}
          onClick={() => setHide((h) => !h)}
        >
          <Icon d={hide ? ICON.eyeOff : ICON.eye} />
          Ocultar nombres
        </button>
        <button
          className={revealed ? 'chip chip--on' : 'chip'}
          type="button"
          aria-pressed={revealed}
          onClick={() => setRevealed((r) => !r)}
          style={{ visibility: isQuiz ? 'visible' : 'hidden' }}
          tabIndex={isQuiz ? 0 : -1}
          aria-hidden={!isQuiz}
        >
          {revealed ? 'Ocultar respuesta' : 'Ver respuesta'}
        </button>
      </div>

      <div className="actions">
        <button className="btn btn--lime actions__share" onClick={() => void onShare()} disabled={busy} type="button">
          <Icon d={ICON.share} />
          Compartir
        </button>
        <button
          className="icon-btn icon-btn--lg"
          onClick={() => void onDownload()}
          disabled={busy}
          type="button"
          aria-label="Descargar esta tarjeta"
          title="Descargar esta tarjeta"
        >
          <Icon d={ICON.download} />
        </button>
        <button
          className={zipProgress ? 'icon-btn icon-btn--lg icon-btn--wide' : 'icon-btn icon-btn--lg'}
          type="button"
          onClick={() => void onDownloadAll()}
          disabled={busy}
          aria-busy={zipProgress !== null}
          aria-label={zipLabel}
          title="Descargar todo (.zip)"
        >
          {zipProgress ? (
            <span className="zip-progress">
              {zipProgress.done}/{zipProgress.total}
            </span>
          ) : (
            <>
              <Icon d={ICON.zip} />
              <span className="icon-btn__label">.zip</span>
            </>
          )}
        </button>
      </div>
      <p className="sr-only" role="status">
        {zipProgress ? zipLabel : ''}
      </p>
    </main>
  );
}
