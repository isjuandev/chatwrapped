import { useState } from 'react';
import { track } from './analytics';
import { PAREJA } from './modes';
import type { Mode, WrappedData } from './types';
import Guide from './screens/Guide';
import Landing from './screens/Landing';
import Upload from './screens/Upload';
import Viewer from './screens/Viewer';

type Screen = 'landing' | 'guide' | 'upload' | 'viewer';

/** Máquina de estados simple (sin router). */
export default function App() {
  const [screen, setScreen] = useState<Screen>('landing');
  const [guideBack, setGuideBack] = useState<Screen>('landing');
  const [mode, setMode] = useState<Mode>(PAREJA);
  const [data, setData] = useState<WrappedData | null>(null);

  const openGuide = (from: Screen): void => {
    setGuideBack(from);
    setScreen('guide');
  };

  return (
    <div className="app">
      {screen === 'landing' && (
        <Landing
          onStart={() => {
            track('start');
            setScreen('upload');
          }}
          onGuide={() => openGuide('landing')}
        />
      )}
      {screen === 'guide' && <Guide onBack={() => setScreen(guideBack)} onDone={() => setScreen('upload')} />}
      {screen === 'upload' && (
        <Upload
          mode={mode}
          onMode={setMode}
          onBack={() => setScreen('landing')}
          onGuide={() => openGuide('upload')}
          onResult={(d) => {
            setData(d);
            setScreen('viewer');
          }}
        />
      )}
      {screen === 'viewer' && data && (
        <Viewer
          data={data}
          onClose={() => {
            setData(null);
            setScreen('upload');
          }}
        />
      )}
    </div>
  );
}
