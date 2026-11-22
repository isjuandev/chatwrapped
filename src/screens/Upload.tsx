import { useEffect, useRef, useState } from 'react';
import { participantsRange, track } from '../analytics';
import { DUO_MODES, GROUP_MODES, modeDesc, modeLabel, sameMode, suggestMode } from '../modes';
import type { ModeSuggestion } from '../modes';
import type { Mode, ReadRequest, RecomputeRequest, WorkerErrorCode, WorkerProgress, WorkerResponse, WrappedData } from '../types';
import { StepBar, UploadIcon } from './ui';

const GROUPS: { label: string; modes: Mode[] }[] = [
  { label: '2 personas', modes: DUO_MODES },
  { label: 'Grupo', modes: GROUP_MODES },
];

interface Props {
  mode: Mode;
  onMode: (m: Mode) => void;
  onBack: () => void;
  onGuide: () => void;
  onResult: (d: WrappedData) => void;
}

export default function Upload({ mode, onMode, onBack, onGuide, onResult }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stickers, setStickers] = useState(false);
  const [over, setOver] = useState(false);
  /** Chat leído cuyo tamaño no coincide con el modo elegido: se pregunta antes de seguir. */
  const [ask, setAsk] = useState<ModeSuggestion | null>(null);
  const modeRef = useRef(mode);
  const input = useRef<HTMLInputElement>(null);
  const worker = useRef<Worker | null>(null);

  useEffect(() => () => worker.current?.terminate(), []);

  const cancel = (): void => {
    worker.current?.terminate();
    worker.current = null;
    setAsk(null);
    setLoading(false);
  };

  /** Recalcula con el modo elegido en la hoja, sin volver a leer el archivo. */
  const choose = (m: Mode): void => {
    const w = worker.current;
    if (!w) return;
    onMode(m);
    modeRef.current = m;
    setAsk(null);
    setLoading(true);
    const req: RecomputeRequest = { recompute: true, mode: m };
    w.postMessage(req);
  };

  const fail = (msg: string, code: WorkerErrorCode): void => {
    worker.current?.terminate();
    worker.current = null;
    setLoading(false);
    setError(msg);
    setAsk(null);
    track('upload_error', { mode: modeRef.current, ok: false, error: code });
  };

  const handleFile = async (file: File | undefined | null): Promise<void> => {
    if (!file) return;
    setError(null);
    if (!/\.(txt|zip)$/i.test(file.name)) {
      fail('Ese archivo no es de WhatsApp. Sube el .txt o el .zip que exportaste.', 'unrecognized');
      return;
    }
    setLoading(true);
    setStickers(false);
    modeRef.current = mode;
    try {
      const w = new Worker(new URL('../worker.ts', import.meta.url), { type: 'module' });
      worker.current = w;
      w.onmessage = (e: MessageEvent<WorkerResponse | WorkerProgress>) => {
        const res = e.data;
        if ('progress' in res) {
          setStickers(true);
          return;
        }
        if (!res.ok) {
          fail(res.error, res.code);
          return;
        }
        const s = suggestMode(modeRef.current, res.data.participants);
        if (!s.ok) {
          // El worker conserva los mensajes: la elección se recalcula sin releer el archivo.
          setLoading(false);
          setAsk(s);
          return;
        }
        w.terminate();
        worker.current = null;
        track('upload_ok', { mode: modeRef.current, ok: true, participants: participantsRange(res.data.participants) });
        setLoading(false);
        onResult(res.data);
      };
      w.onerror = () => fail('No pudimos leer ese archivo. Intenta de nuevo.', 'other');
      // El worker recibe el File tal cual (Blob): lee el .zip con acceso aleatorio, sin cargarlo entero.
      const req: ReadRequest = { fileName: file.name, file, mode };
      w.postMessage(req);
    } catch {
      fail('No pudimos abrir ese archivo. Intenta de nuevo.', 'other');
    }
  };

  if (loading) {
    return (
      <main className="screen">
        <StepBar onBack={cancel}>Paso 2 de 2</StepBar>
        <div className="loading" role="status" aria-live="polite">
          <div className="spinner" aria-hidden="true" />
          <h1 className="title" style={{ margin: 0 }}>Leyendo tu chat…</h1>
          {stickers && <p className="note" style={{ margin: 0 }}>Leyendo stickers…</p>}
          <p className="note" style={{ margin: 0 }}>Esto pasa en tu celular. No se sube a ningún servidor.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="screen">
      <StepBar onBack={onBack}>Paso 1 de 2</StepBar>
      <h1 className="title">¿Con quién es el chat?</h1>

      {GROUPS.map((g) => (
        <div className="modes" role="radiogroup" aria-label={g.label} key={g.label}>
          <p className="modes-label">{g.label}</p>
          {g.modes.map((m) => (
            <button
              key={`${m.size}-${m.rel}`}
              className="mode"
              role="radio"
              aria-checked={sameMode(mode, m)}
              onClick={() => onMode(m)}
              type="button"
            >
              <span>
                <b>{modeLabel(m)}</b>
                <small>{modeDesc(m)}</small>
              </span>
              <span className="radio" aria-hidden="true" />
            </button>
          ))}
        </div>
      ))}

      <button
        className={`drop${over ? ' drop--over' : ''}`}
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void handleFile(e.dataTransfer.files[0]);
        }}
      >
        <UploadIcon />
        <b>Sube el chat exportado</b>
        <small>Archivo .txt o .zip</small>
      </button>
      <input
        ref={input}
        className="hidden-input"
        type="file"
        accept=".txt,.zip,text/plain,application/zip,application/x-zip-compressed"
        aria-label="Archivo del chat exportado"
        tabIndex={-1}
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}

      <button className="link" onClick={onGuide} type="button">
        ¿Cómo exporto el chat?
      </button>
      <p className="note">El archivo se lee en tu celular. No se sube a ningún servidor.</p>

      {ask && (
        <div className="sheet-backdrop" onClick={cancel}>
          <div
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sheet-q"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="sheet-title" id="sheet-q">{ask.question}</h2>
            <div className="modes" style={{ margin: 0 }}>
              {ask.options.map((m) => (
                <button key={`${m.size}-${m.rel}`} className="mode" onClick={() => choose(m)} type="button">
                  <span>
                    <b>{modeLabel(m)}</b>
                    <small>{modeDesc(m)}</small>
                  </span>
                </button>
              ))}
            </div>
            <button className="link" onClick={cancel} type="button">
              Elegir otro archivo
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
