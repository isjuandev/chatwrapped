import { useEffect } from 'react';
import { track } from '../analytics';
import { LockIcon } from './ui';

interface Props {
  onStart: () => void;
  onGuide: () => void;
}

export default function Landing({ onStart, onGuide }: Props) {
  useEffect(() => {
    track('landing_view');
  }, []);

  return (
    <main className="screen">
      <header className="top">
        <div className="logo">chat wrapped</div>
        <div className="pill-year" aria-label="Edición 2026">2026</div>
      </header>

      <div className="bubbles" aria-hidden="true">
        <span className="bubble bubble--cream">¿quién escribe más?</span>
        <span className="bubble bubble--lime">obvio tú</span>
        <span className="bubble bubble--coral">jajaja ya veremos</span>
      </div>

      <h1 className="hero">
        Tu año en el chat, hecho <em>tarjetas</em> para historias.
      </h1>
      <p className="lead">
        Pareja, parche o familia: quién escribe más, quién deja en visto y los premios del año.
      </p>

      <div className="spacer" />

      <div className="privacy">
        <LockIcon />
        <p style={{ margin: 0 }}>
          <strong>Tu chat nunca sale de tu celular.</strong> Todo se calcula en tu navegador; tu chat no se guarda.
          Solo contamos visitas anónimas, sin cookies.
        </p>
      </div>

      <button className="btn btn--lime" style={{ marginTop: 16 }} onClick={onStart} type="button">
        Hacer mi Chat Wrapped
      </button>
      <button className="link" onClick={onGuide} type="button">
        ¿Cómo exporto el chat?
      </button>
    </main>
  );
}
