import { loadEnv, type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { cssVars, DEFAULT_THEME, PALETTES, parseTheme, THEMES_AVAILABLE } from './src/palette';

/**
 * Tema de la app según `VITE_THEME` (ver .env.example):
 * - Falla el build si el nombre no existe (mejor que publicar otro tema sin avisar).
 * - Escribe en index.html los colores iniciales, el theme-color y el favicon del tema,
 *   para que no parpadee otra paleta antes de cargar el JS.
 */
function themePlugin(themeRaw: string | undefined): Plugin {
  const name = (themeRaw ?? '').trim() || DEFAULT_THEME;
  const theme = parseTheme(name);
  if (!theme) {
    throw new Error(`VITE_THEME="${name}" no existe. Temas disponibles: ${THEMES_AVAILABLE.join(', ')}`);
  }
  const p = PALETTES[theme.palette];
  const vars = Object.entries(cssVars(p))
    .map(([k, v]) => `${k}:${v}`)
    .join(';');
  const favicon =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E" +
    `%3Crect width='32' height='32' rx='9' fill='${encodeURIComponent(p.lime)}'/%3E` +
    `%3Cpath d='M8 10h16v9H15l-4 4v-4H8z' fill='${encodeURIComponent(p.bg)}'/%3E%3C/svg%3E`;
  return {
    name: 'chat-wrapped-theme',
    transformIndexHtml(html) {
      return {
        html: html
          .replace(/<meta name="theme-color" content="[^"]*"\s*\/?>/, `<meta name="theme-color" content="${p.bg}" />`)
          .replace(/<link rel="icon" href="[^"]*"\s*\/?>/, `<link rel="icon" href="${favicon}" />`),
        // `:root:root` gana a las variables por defecto de styles.css sin importar el orden.
        tags: [{ tag: 'style', attrs: { 'data-theme': name }, children: `:root:root{${vars}}`, injectTo: 'head' }],
      };
    },
  };
}

export default defineConfig(({ mode }) => {
  // loadEnv incluye .env* y process.env (Docker/Coolify) con prefijo VITE_.
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [react(), themePlugin(env.VITE_THEME)],
    worker: { format: 'es' },
    test: { environment: 'node', include: ['src/**/*.test.ts'] },
  };
});
