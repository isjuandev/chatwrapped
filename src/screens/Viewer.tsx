import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { track } from '../analytics';
import { buildDeck, cardToBlob, renderCardTo } from '../cards';
import type { Tier } from '../cards';
import { FEATURES } from '../config';
import { fullReportButton } from '../fullReport';
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

  const go = useCallback((d: number) => {
    setRevealed(false);
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
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose]);

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

  const onPointerDown = (e: React.PointerEvent): void => {
    start.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>): void => {
    const s = start.current;
    start.current = null;
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
        {Array.from({ length: count }, (_, i) => (
          <i key={i} className={i < index ? 'on' : ''} />
        ))}
      </div>
      <div className="viewer-head">
        <span aria-live="polite">
          {full ? 'Reporte completo · ' : ''}
          {index} / {count}
        </span>
        <div className="viewer-head__right">
          {full ? (
            <button className="chip chip--accent" type="button" onClick={() => switchTier('free')}>
              Volver a la historia
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
        onPointerCancel={() => (start.current = null)}
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
