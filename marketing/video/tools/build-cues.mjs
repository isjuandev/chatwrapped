#!/usr/bin/env node
// cues.json -> index.html (window.CUE = {nombre: segundo}) + bloque <audio> dentro de index.html
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { cues } = JSON.parse(readFileSync(resolve(root, 'cues.json'), 'utf8'));
const CUE = Object.fromEntries(cues.map((c) => [c.n, c.t]));

// duración real de cada wav (cabecera de 44 bytes, mono 16-bit 44.1k)
const dur = (f) => {
  const b = readFileSync(resolve(root, 'assets', 'sfx', f + '.wav'));
  return +((b.length - 44) / 2 / 44100).toFixed(3);
};
const tags = cues.filter((c) => c.f).map((c, i) => {
  const d = c.d ?? dur(c.f);
  return `    <audio id="a-${c.n}" src="assets/sfx/${c.f}.wav" data-start="${c.t}" data-duration="${d}" data-track-index="${10 + (i % 6)}" data-volume="${c.v}"></audio>`;
});
const block = `<!-- AUDIO:START (generado por tools/build-cues.mjs) -->\n${tags.join('\n')}\n    <!-- AUDIO:END -->`;
const p = resolve(root, 'index.html');
let html = readFileSync(p, 'utf8');
html = html.replace(/<!-- CUE:START[\s\S]*?<!-- CUE:END -->/, `<!-- CUE:START (generado) -->
    <script>window.CUE = ${JSON.stringify(CUE)};</script>
    <!-- CUE:END -->`);
html = html.replace(/<!-- AUDIO:START[\s\S]*?<!-- AUDIO:END -->/, block);
writeFileSync(p, html);
console.log(`${cues.length} cues -> index.html`);
