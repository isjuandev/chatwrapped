import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { track } from '../analytics';
import { buildDeck, cardToBlob, renderCardTo } from '../cards';
import type { Tier } from '../cards';
import { FEATURES } from '../config';
import { fullReportButton } from '../fullReport';
import type { WrappedData } from '../types';
import type { ZipProgress } from '../zipExport';
import { deckToZip } from '../zipExport';

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

  /** Todo el mazo visible en un .zip (mismas tarjetas, mismos ajustes). */
  const onDownloadAll = async (): Promise<void> => {
    setBusy(true);
    setZipProgress({ done: 0, total: count });
    try {
      const zip = await deckToZip(data, { hide, reveal, tier, onProgress: setZipProgress });
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
          {full ? 'Reporte completo · ' : ''}Tarjeta {index} de {count}
        </span>
        <button className="back" onClick={onClose} aria-label="Cerrar" type="button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
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

      {isQuiz && (
        <button
          className="btn btn--outline reveal-btn"
          type="button"
          aria-pressed={revealed}
          onClick={() => setRevealed((r) => !r)}
        >
          {revealed ? 'Ocultar respuesta' : 'Ver respuesta'}
        </button>
      )}

      <div className="toggle-row">
        <span id="hide-label">Ocultar nombres</span>
        <button
          className="switch"
          role="switch"
          aria-checked={hide}
          aria-labelledby="hide-label"
          onClick={() => setHide((h) => !h)}
          type="button"
        />
      </div>

      <div className="actions">
        <button className="btn btn--outline" onClick={() => void onDownload()} disabled={busy} type="button">
          Descargar
        </button>
        <button className="btn btn--lime" onClick={() => void onShare()} disabled={busy} type="button">
          Compartir
        </button>
      </div>
      <button
        className="btn btn--outline zip-btn"
        type="button"
        onClick={() => void onDownloadAll()}
        disabled={busy}
        aria-busy={zipProgress !== null}
      >
        {zipLabel}
      </button>
      <p className="sr-only" role="status">
        {zipProgress ? zipLabel : ''}
      </p>
      <button className="link" style={{ marginTop: 12 }} onClick={() => void onShare()} type="button">
        Mándasela a quien sale en el chat
      </button>

      {full ? (
        <button className="pay pay--open" type="button" onClick={() => switchTier('free')}>
          Volver a la historia
        </button>
      ) : (
        <button
          className={fullBtn.enabled ? 'pay pay--open' : 'pay'}
          type="button"
          disabled={!fullBtn.enabled}
          onClick={onFullReport}
        >
          {fullBtn.label}
        </button>
      )}
    </main>
  );
}
