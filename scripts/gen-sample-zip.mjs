#!/usr/bin/env node
/**
 * Genera public/sample-with-stickers.zip: un chat de iOS «Incluir archivos» (grupo de 3, ~6 meses)
 * con referencias `<adjunto: …STICKER…webp>` y ~6 stickers (PNG guardados como .webp, de colores
 * distintos; varios archivos repiten el mismo sticker, como en un export real). También trae
 * fotos y audios de relleno que la app nunca descomprime.
 *
 *   node scripts/gen-sample-zip.mjs
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'public', 'sample-with-stickers.zip');
const LRM = '‎';

let seed = 20260921;
function rnd() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (a) => a[Math.floor(rnd() * a.length)];
const between = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pad = (n, w = 2) => String(n).padStart(w, '0');

// ---------------------------------------------------------------- PNG mínimo (RGBA)
const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}
/** Sticker de 192×192: cuadrado redondeado de un color con una carita. */
function stickerPng(r, g, b) {
  const S = 192;
  const raw = Buffer.alloc(S * (S * 4 + 1));
  const R = 44;
  for (let y = 0; y < S; y++) {
    raw[y * (S * 4 + 1)] = 0;
    for (let x = 0; x < S; x++) {
      const o = y * (S * 4 + 1) + 1 + x * 4;
      // cuadrado redondeado con margen
      const m = 10;
      const cx = Math.min(Math.max(x, m + R), S - m - R);
      const cy = Math.min(Math.max(y, m + R), S - m - R);
      const inside = (x - cx) ** 2 + (y - cy) ** 2 <= R * R && x >= m && x < S - m && y >= m && y < S - m;
      let px = [0, 0, 0, 0];
      if (inside) {
        px = [r, g, b, 255];
        const eye = (ex) => (x - ex) ** 2 + (y - 78) ** 2 <= 100;
        const smile = Math.abs(Math.hypot(x - 96, y - 100) - 46) < 5 && y > 108;
        if (eye(70) || eye(122) || smile) px = [255, 255, 255, 255];
      }
      raw[o] = px[0];
      raw[o + 1] = px[1];
      raw[o + 2] = px[2];
      raw[o + 3] = px[3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(S, 0);
  ihdr.writeUInt32BE(S, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const COLORS = [
  [203, 242, 63], [255, 115, 80], [120, 170, 255], [255, 196, 61], [190, 130, 255], [70, 200, 150],
];
const STICKERS = COLORS.map(([r, g, b]) => stickerPng(r, g, b));
// Qué tan seguido se manda cada uno (el primero gana por mucho)
const STICKER_W = [10, 6, 4, 2, 1, 1];

const PEOPLE = ['Laura', 'Mateo', 'Sofía'];
const WEIGHT = [40, 35, 25];
function pickWho() {
  let r = rnd() * 100;
  for (let i = 0; i < PEOPLE.length; i++) {
    r -= WEIGHT[i];
    if (r <= 0) return PEOPLE[i];
  }
  return PEOPLE[0];
}
function pickSticker(who) {
  // Cada quien tiene su preferido
  const fav = PEOPLE.indexOf(who) * 2 % 6;
  if (rnd() < 0.35) return fav;
  const total = STICKER_W.reduce((a, b) => a + b, 0);
  let r = rnd() * total;
  for (let i = 0; i < STICKER_W.length; i++) {
    r -= STICKER_W[i];
    if (r <= 0) return i;
  }
  return 0;
}

const PHRASES = [
  'quiubo, qué hacen', 'yo voy llegando', 'ya casi salgo', 'qué pereza hoy', 'jajaja no puede ser',
  'pedimos algo?', 'dale pues', 'mañana nos vemos', 'me muero de hambre', 'jajajaja qué boba',
  'llegó el domicilio', 'listo, confirmo', 'ya les mando la ubicación', 'qué mamera el trancón',
];
const stampOf = (d) => {
  let h = d.getHours();
  const ap = h >= 12 ? 'p. m.' : 'a. m.';
  h = h % 12 === 0 ? 12 : h % 12;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}, ${h}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${ap}`;
};

const zip = new JSZip();
const lines = [];
let counter = 1;
const end = new Date();
end.setHours(22, 0, 0, 0);
const DAYS = 180;
const startMs = end.getTime() - (DAYS - 1) * 86400000;

for (let d = 0; d < DAYS; d++) {
  if (rnd() < 0.05) continue;
  const day = new Date(startMs + d * 86400000);
  let t = new Date(day.getFullYear(), day.getMonth(), day.getDate(), between(8, 21), between(0, 59), 0).getTime();
  const n = between(8, 26);
  let who = pickWho();
  for (let i = 0; i < n; i++) {
    if (rnd() < 0.6) who = pickWho();
    const k = rnd();
    const dt = new Date(t);
    const tag = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}-${pad(dt.getHours())}-${pad(dt.getMinutes())}-${pad(dt.getSeconds())}`;
    let body;
    if (k < 0.22) {
      const s = pickSticker(who);
      const name = `${pad(counter++, 8)}-STICKER-${tag}.webp`;
      zip.file(name, STICKERS[s]);
      body = `${LRM}<adjunto: ${name}>`;
    } else if (k < 0.27) {
      const name = `${pad(counter++, 8)}-PHOTO-${tag}.jpg`;
      zip.file(name, Buffer.from('foto de relleno que la app no debe leer'));
      body = `${LRM}<adjunto: ${name}>`;
    } else if (k < 0.3) {
      const name = `${pad(counter++, 8)}-AUDIO-${tag}.opus`;
      zip.file(name, Buffer.from('audio de relleno'));
      body = `${LRM}<adjunto: ${name}>`;
    } else if (k < 0.33) {
      body = `mira esto https://ejemplo.com/${between(100, 999)}`;
    } else {
      body = pick(PHRASES);
      if (rnd() < 0.2) body += ' jajaja';
    }
    lines.push(`[${stampOf(dt)}] ${who}: ${body}`);
    t += between(20, 900) * 1000;
  }
}

const first = new Date(startMs);
const header = `${LRM}[${stampOf(first)}] Laura: ${LRM}Los mensajes y las llamadas están cifrados de extremo a extremo. Nadie fuera de este chat, ni siquiera WhatsApp, puede leerlos ni escucharlos.`;
zip.file('_chat.txt', [header, ...lines].join('\n') + '\n');

mkdirSync(dirname(out), { recursive: true });
const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
writeFileSync(out, buf);
console.log(`Zip de ejemplo: ${lines.length} mensajes, ${counter - 1} archivos -> ${out} (${(buf.length / 1024).toFixed(0)} KB)`);
