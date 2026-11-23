#!/usr/bin/env node
/**
 * Chat de pareja 100% FICTICIO (Laura y Andrés) para grabar el video promo.
 * Un año, formato iOS es-CO "Incluir archivos" (zip con stickers, fotos y audios de relleno).
 *   node tools/gen-duo.mjs  ->  assets/_work/chat-ficticio-laura-andres.zip
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '..', 'assets', '_work', 'chat-ficticio-laura-andres.zip');
const LRM = '‎';

let seed = 20261122;
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
  const o = Buffer.alloc(12 + data.length);
  o.writeUInt32BE(data.length, 0);
  o.write(type, 4, 'ascii');
  data.copy(o, 8);
  o.writeUInt32BE(crc32(o.subarray(4, 8 + data.length)), 8 + data.length);
  return o;
}
/** Sticker 256x256: círculo de color con carita (variantes de boca/ojos). */
function stickerPng(r, g, b, variant) {
  const S = 256;
  const raw = Buffer.alloc(S * (S * 4 + 1));
  for (let y = 0; y < S; y++) {
    raw[y * (S * 4 + 1)] = 0;
    for (let x = 0; x < S; x++) {
      const o = y * (S * 4 + 1) + 1 + x * 4;
      const d = Math.hypot(x - 128, y - 128);
      let px = [0, 0, 0, 0];
      if (d <= 116) {
        px = d > 108 ? [Math.round(r * 0.75), Math.round(g * 0.75), Math.round(b * 0.75), 255] : [r, g, b, 255];
        const ink = [26, 16, 41, 255];
        const eye = (ex, ey, rad) => (x - ex) ** 2 + (y - ey) ** 2 <= rad * rad;
        if (variant === 0) {
          if (eye(92, 104, 11) || eye(164, 104, 11)) px = ink;
          if (Math.abs(Math.hypot(x - 128, y - 130) - 56) < 6 && y > 140) px = ink;
        } else if (variant === 1) {
          if (eye(92, 104, 16) || eye(164, 104, 16)) px = [255, 255, 255, 255];
          if (eye(92, 104, 8) || eye(164, 104, 8)) px = ink;
          if (eye(128, 168, 20)) px = ink;
        } else if (variant === 2) {
          if (Math.abs(Math.hypot(x - 92, y - 112) - 16) < 5 && y < 112) px = ink;
          if (Math.abs(Math.hypot(x - 164, y - 112) - 16) < 5 && y < 112) px = ink;
          if (Math.hypot(x - 128, y - 150) < 34 && y > 148) px = ink;
        } else if (variant === 3) {
          if (Math.abs(y - 108) < 4 && ((x > 76 && x < 108) || (x > 148 && x < 180))) px = ink;
          if (eye(128, 168, 12)) px = ink;
        } else if (variant === 4) {
          if (eye(92, 104, 11)) px = ink;
          if (Math.abs(y - 104) < 4 && x > 148 && x < 180) px = ink;
          if (Math.abs(Math.hypot(x - 140, y - 130) - 52) < 6 && y > 144) px = ink;
        } else {
          if (eye(92, 100, 12) || eye(164, 100, 12)) px = ink;
          if (eye(128, 162, 22)) px = ink;
        }
      }
      raw[o] = px[0]; raw[o + 1] = px[1]; raw[o + 2] = px[2]; raw[o + 3] = px[3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}
const COLORS = [[255, 184, 48], [255, 107, 154], [150, 205, 255], [190, 150, 255], [120, 220, 170], [255, 150, 100]];
const STICKERS = COLORS.map(([r, g, b], i) => stickerPng(r, g, b, i));
const STICKER_W = [9, 8, 5, 3, 2, 1];

const PEOPLE = ['Laura', 'Andrés'];
const WEIGHT = [58, 42];
const SIG = { Laura: ['amor', 'mi vida'], 'Andrés': ['mi reina', 'parce'] };
const pickWho = () => (rnd() * 100 < WEIGHT[0] ? PEOPLE[0] : PEOPLE[1]);
const pickSticker = (who) => {
  if (rnd() < 0.3) return who === 'Laura' ? 1 : 0;
  const total = STICKER_W.reduce((a, b) => a + b, 0);
  let r = rnd() * total;
  for (let i = 0; i < STICKER_W.length; i++) { r -= STICKER_W[i]; if (r <= 0) return i; }
  return 0;
};

const LOVE = ['te amo 🥺', 'te amo mucho', 'te extraño ❤️', 'te amo ❤️', 'ay te amo', 'qué lindo eres 🥹', 'te adoro', 'mi amor lindo ❤️'];
const PHRASES = [
  '¿ya llegaste?', 'ya casi llego', 'jajajaja no puede ser', 'qué haces', 'qué hambre', 'pedimos algo?',
  'ya salí del trabajo', 'llámame cuando puedas', 'no me vas a creer lo que pasó', 'qué pereza hoy',
  'mañana nos vemos', 'buenos días 🌞', 'buenas noches, sueña bonito 🌙', 'ya comiste?', 'estoy en el bus, hay trancón 🙈',
  'jajaja qué boba', 'voy en camino', 'cuéntame cómo te fue', 'ay no, qué mamera', 'dale, listo', 'acabo de llegar',
  'qué vemos hoy?', 'mira esto jajaja', 'me muero de sueño 😴', 'pásame la ubicación', 'te llamo ya', 'ven te cuento',
  'siii obvio', 'nooo jajaja', 'qué rico todo', 'bueno pues', 'ya te mando la foto', 'hoy sí toca ejercicio',
  'ven a recogerme?', 'tengo antojo de helado 🍦', 'me hiciste el día', 'quiero verte ya', 'no me dejes en visto 😤',
];
const EMO = ['😂', '🥺', '😭', '❤️', '🙈', '😍', '🥰', '😅'];
const stampOf = (d) => {
  let h = d.getHours();
  const ap = h >= 12 ? 'p. m.' : 'a. m.';
  h = h % 12 === 0 ? 12 : h % 12;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}, ${h}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${ap}`;
};

const zip = new JSZip();
const lines = [];
let counter = 1;
const DAYS = 365;
const end = new Date(2026, 10, 20, 0, 0, 0);
const startMs = end.getTime() - (DAYS - 1) * 86400000;

function session(day, hour, n) {
  let t = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, between(0, 59), between(0, 59)).getTime();
  let who = pickWho();
  for (let i = 0; i < n; i++) {
    if (rnd() < 0.62) who = who === 'Laura' ? 'Andrés' : 'Laura';
    else if (rnd() < 0.3) who = pickWho();
    const dt = new Date(t);
    const tag = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}-${pad(dt.getHours())}-${pad(dt.getMinutes())}-${pad(dt.getSeconds())}`;
    const k = rnd();
    let body;
    if (k < 0.16) {
      const name = `${pad(counter++, 8)}-STICKER-${tag}.webp`;
      zip.file(name, STICKERS[pickSticker(who)]);
      body = `${LRM}<adjunto: ${name}>`;
    } else if (k < 0.2) {
      const name = `${pad(counter++, 8)}-AUDIO-${tag}.opus`;
      zip.file(name, Buffer.from('audio de relleno'));
      body = `${LRM}<adjunto: ${name}>`;
    } else if (k < 0.23) {
      const name = `${pad(counter++, 8)}-PHOTO-${tag}.jpg`;
      zip.file(name, Buffer.from('foto de relleno'));
      body = `${LRM}<adjunto: ${name}>`;
    } else if (k < 0.36) {
      body = who === 'Andrés' && rnd() < 0.6 ? pick(PHRASES) : pick(LOVE);
    } else if (k < 0.5) {
      body = pick(['jajaja', 'jajajaja', 'jajajajaja', 'jajaja ' + pick(EMO), 'jajajaja ay no', 'jajaja qué boba', 'jajajaja ' + pick(EMO)]);
    } else {
      body = pick(PHRASES);
      if (rnd() < 0.22) body += ' ' + pick(SIG[who]);
      else if (rnd() < 0.15) body += ' ' + pick(EMO);
    }
    lines.push(`[${stampOf(dt)}] ${who}: ${body}`);
    const r = rnd();
    t += (r < 0.55 ? between(8, 90) : r < 0.9 ? between(90, 600) : between(600, 2400)) * 1000;
  }
}

for (let d = 0; d < DAYS; d++) {
  if (rnd() < 0.03) continue;
  const day = new Date(startMs + d * 86400000);
  session(day, between(7, 10), between(6, 22));
  session(day, between(12, 15), between(8, 26));
  session(day, between(19, 20), between(18, 55));
  if (rnd() < 0.8) session(day, between(22, 23), between(14, 40));
}
const parse = (l) => {
  const m = l.match(/^\[(\d+)\/(\d+)\/(\d+), (\d+):(\d+):(\d+) ([ap])\. m\.\]/);
  let h = +m[4] % 12;
  if (m[7] === 'p') h += 12;
  return Date.UTC(2000 + +m[3], +m[2] - 1, +m[1], h, +m[5], +m[6]);
};
lines.sort((a, b) => parse(a) - parse(b));

const first = new Date(startMs);
const header = `${LRM}[${stampOf(first)}] Laura: ${LRM}Los mensajes y las llamadas están cifrados de extremo a extremo. Nadie fuera de este chat, ni siquiera WhatsApp, puede leerlos ni escucharlos.`;
zip.file('_chat.txt', [header, ...lines].join('\n') + '\n');
mkdirSync(dirname(out), { recursive: true });
const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
writeFileSync(out, buf);
console.log(`Zip ficticio: ${lines.length} mensajes, ${counter - 1} archivos -> ${out} (${(buf.length / 1024).toFixed(0)} KB)`);
