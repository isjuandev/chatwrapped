import { afterEach, describe, expect, it, vi } from 'vitest';

/** DOM mínimo para probar la inyección del tracker sin navegador. */
function setupDom() {
  const listeners = new Map<string, () => void>();
  const script = {
    async: false,
    src: '',
    dataset: {} as Record<string, string>,
    addEventListener(type: string, cb: () => void) {
      listeners.set(type, cb);
    },
  };
  const documentStub = {
    createElement: () => script,
    head: { appendChild: () => undefined },
  };
  const windowStub: Record<string, unknown> = {};
  vi.stubGlobal('document', documentStub);
  vi.stubGlobal('window', windowStub);
  return { listeners, script, windowStub };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('tracker de Umami', () => {
  it('inyecta el script same-origin y manda los eventos encolados', async () => {
    vi.stubEnv('VITE_UMAMI_WEBSITE_ID', 'sitio-123');
    const { listeners, script, windowStub } = setupDom();
    vi.resetModules();

    const analytics = await import('./analytics');
    // Antes de que cargue el script, el evento se encola.
    analytics.track('landing_view');
    analytics.initAnalytics();

    expect(script.src).toBe('/medicion/script.js');
    expect(windowStub.umamiConfig).toEqual({
      websiteId: 'sitio-123',
      hostUrl: '/medicion',
      doNotTrack: true,
    });

    const sent: Array<[string, unknown]> = [];
    windowStub.umami = {
      track: (event: string, data: unknown) => {
        sent.push([event, data]);
      },
    };
    listeners.get('load')?.();

    expect(sent).toEqual([['landing_view', {}]]);
  });

  it('no inyecta nada sin website ID', async () => {
    vi.stubEnv('VITE_UMAMI_WEBSITE_ID', '');
    const { script } = setupDom();
    vi.resetModules();

    const analytics = await import('./analytics');
    analytics.initAnalytics();
    analytics.track('start');

    expect(script.src).toBe('');
  });
});
