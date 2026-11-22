import { useState } from 'react';
import { StepBar } from './ui';

type Platform = 'android' | 'iphone';

const STEPS: Record<Platform, string[]> = {
  android: [
    'Abre el chat que quieres convertir.',
    'Toca los tres puntos arriba a la derecha, luego Más.',
    'Toca Exportar chat y escoge Sin archivos.',
    'Guárdalo en tu celular y súbelo aquí.',
  ],
  iphone: [
    'Abre el chat.',
    'Toca el nombre del chat arriba.',
    'Baja y toca Exportar chat, escoge Sin archivos.',
    'Guárdalo en Archivos y súbelo aquí.',
  ],
};

function defaultPlatform(): Platform {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  return /iPhone|iPad|iPod/i.test(ua) ? 'iphone' : 'android';
}

interface Props {
  onBack: () => void;
  onDone: () => void;
}

export default function Guide({ onBack, onDone }: Props) {
  const [platform, setPlatform] = useState<Platform>(defaultPlatform);

  return (
    <main className="screen">
      <StepBar onBack={onBack}>Toma menos de un minuto</StepBar>
      <h1 className="title">Exporta el chat en 4 pasos</h1>

      <div className="seg" role="tablist" aria-label="Tipo de celular">
        <button role="tab" aria-selected={platform === 'android'} onClick={() => setPlatform('android')} type="button">
          Android
        </button>
        <button role="tab" aria-selected={platform === 'iphone'} onClick={() => setPlatform('iphone')} type="button">
          iPhone
        </button>
      </div>

      <ol className="steps">
        {STEPS[platform].map((s, i) => (
          <li key={s}>
            <span className="n" aria-hidden="true">{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>

      <div className="spacer" />
      <p className="tip">
        Escoge siempre <b>Sin archivos</b>: es más liviano y no necesitamos tus fotos.
      </p>
      <p className="tip">
        ¿Quieres tus stickers en el Wrapped? Exporta con <b>Incluir archivos</b> (pesa más; igual nada sale de tu celular).
      </p>
      <button className="btn btn--lime" onClick={onDone} type="button">
        Ya lo tengo, subirlo
      </button>
    </main>
  );
}
