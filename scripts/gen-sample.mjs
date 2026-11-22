#!/usr/bin/env node
/**
 * Genera un chat de ejemplo (un año, formato iOS es-CO «Sin archivos») para probar la app a mano.
 *
 *   node scripts/gen-sample.mjs           -> public/sample-chat.txt  (pareja, ~5.000 mensajes)
 *   node scripts/gen-sample.mjs --group   -> public/sample-group.txt (grupo de 5, un año)
 *
 * Incluye audios, stickers, fotos, videos, links, mensajes editados y eliminados con las marcas
 * de iOS «Sin archivos» («sticker omitido», «imagen omitida», …).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const GROUP = process.argv.includes('--group');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'public', GROUP ? 'sample-group.txt' : 'sample-chat.txt');
const LRM = '‎';

// PRNG determinista (mulberry32) para que el archivo sea reproducible.
let seed = GROUP ? 20260921 : 20260214;
function rnd() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const between = (a, b) => a + Math.floor(rnd() * (b - a + 1));

const A = 'Juana';
const B = 'Camilo';
const PEOPLE = GROUP ? ['Ana', 'Beto', 'Carla', 'Dani', 'Eva'] : [A, B];
// Peso de cada persona al escribir y palabra que repite (palabra característica)
const WEIGHT = GROUP ? [30, 24, 20, 16, 10] : [62, 38];
const SIGNATURE = GROUP
  ? { Ana: 'amiga', Beto: 'bro', Carla: 'literal', Dani: 'chimba', Eva: 'ay' }
  : { [A]: 'amor', [B]: 'parce' };
const TARGET = GROUP ? 7000 : 4500;

function pickWho() {
  const total = WEIGHT.reduce((a, b) => a + b, 0);
  let r = rnd() * total;
  for (let i = 0; i < PEOPLE.length; i++) {
    r -= WEIGHT[i];
    if (r <= 0) return PEOPLE[i];
  }
  return PEOPLE[0];
}

// Pesos por hora (0..23): sesgado a la noche, pico a las 11 p. m.
const HOUR_W = [4, 2, 1, 0.5, 0.3, 0.3, 0.5, 1, 2, 3, 3.5, 4, 5, 6, 5, 4.5, 5, 6, 7, 9, 11, 14, 18, 22];
function pickHour() {
  const total = HOUR_W.reduce((a, b) => a + b, 0);
  let r = rnd() * total;
  for (let h = 0; h < 24; h++) {
    r -= HOUR_W[h];
    if (r <= 0) return h;
  }
  return 23;
}

const PHRASES = [
  'hola', 'buenos días', 'ya llegué a la casa', 'dale ahorita te escribo', 'qué hiciste hoy',
  'voy saliendo del trabajo', 'te extraño mucho', 'ahorita hablamos', 'dale, listo', 'no me vas a creer',
  'qué almorzaste', 'vamos a cine el sábado?', 'ya comiste?', 'me dio mucha pereza hoy',
  'mañana madrugo, toca dormir', 'mira esto', 'jajaja no puede ser', 'jajajaja qué boba', 'ahorita te llamo',
  'confirmo para el plan', 'no ni de fundas', 'te quiero harto', 'qué rico todo', 'estoy en el bus, hay trancón',
  'pedimos domicilio?', 'dale pues', 'me ayudas con algo', 'ya casi salgo', 'qué pereza el lunes',
  'ese man es una vaina', 'quiero pizza', 'buenas noches', 'sueña con los angelitos', 'jajaja ya veremos',
  'acuérdate de la cita mañana', 'no encuentro las llaves', 'ya las encontré jajaja', 'hoy sí toca ejercicio',
  'te mandé la foto', 'qué tal el parcial', 'salió todo bien', 'ahorita sí te cuento', 'llámame cuando puedas',
  'el que no llega paga la ronda', 'ya van a dar las tres y nada que salen',
];
const LONG_PHRASES = [
  'les cuento que ayer fui a la reunión y al final no sirvió de nada, nos tocó repetir todo el proceso desde cero',
  'acuérdense que el sábado es el cumpleaños y todavía no hemos comprado el regalo, hay que ponerse las pilas',
];
const LINKS = [
  'mira este video https://www.youtube.com/watch?v=abc123',
  'la ubicación del plan https://maps.google.com/?q=4.65,-74.05',
  'les paso el artículo https://ejemplo.com/noticia/123',
  'reservé aquí www.restaurante.co/mesa',
];
const EMOJIS = ['😂', '😂', '😂', '❤️', '❤️', '😭', '🙈', '🔥', '🥺', '😍'];
const LAUGHS = ['jajaja', 'jajajaja', 'jsjsjs', 'jajajajaja', 'jejeje', 'JAJAJA'];

function makeText(who) {
  let t = rnd() < 0.04 ? pick(LONG_PHRASES) : pick(PHRASES);
  const r = rnd();
  if (r < 0.18) t += ' ' + pick(LAUGHS);
  if (rnd() < 0.22) t += ' ' + pick(EMOJIS);
  if (rnd() < 0.16) t = `${SIGNATURE[who]} ${t}`;
  if (rnd() < 0.05) t += '\n' + pick(PHRASES);
  return t;
}

const pad = (n) => String(n).padStart(2, '0');
function stamp(d) {
  let h = d.getHours();
  const ampm = h >= 12 ? 'p. m.' : 'a. m.';
  h = h % 12 === 0 ? 12 : h % 12;
  const date = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`;
  return `${date}, ${h}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${ampm}`;
}

// Un año hacia atrás desde hoy; el último día termina en la noche.
const end = new Date();
end.setHours(23, 30, 0, 0);
const start = new Date(end.getTime() - 364 * 86400000);
start.setHours(0, 0, 0, 0);

const msgs = [];
const dayMs = 86400000;
const days = 365;
const perDay = TARGET / days;

/** Marcas de iOS «Sin archivos». */
const MARK = {
  sticker: 'sticker omitido',
  image: 'imagen omitida',
  video: 'video omitido',
  deleted: 'Se eliminó este mensaje.',
};

function addConversation(day, count, forcedHour = null, gapScale = 1) {
  const h = forcedHour ?? pickHour();
  let t = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, between(0, 59), between(0, 59)).getTime();
  let who = pickWho();
  for (let i = 0; i < count; i++) {
    // Se queda con rachas de mensajes sin respuesta a veces.
    if (rnd() < 0.55) who = pickWho();
    const kind = rnd();
    let text;
    const isCouple = !GROUP;
    const podcaster = isCouple ? B : PEOPLE[1];
    if (who === podcaster && kind < 0.07) {
      text = `${LRM}<adjunto: ${String(between(1, 99999999)).padStart(8, '0')}-AUDIO-${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}-${pad(Math.floor(t / 3600000) % 24)}-00-00.opus>`;
    } else if (kind < 0.075) {
      text = `${LRM}${MARK.sticker}`;
    } else if (kind < 0.095) {
      text = `${LRM}${MARK.image}`;
    } else if (kind < 0.1) {
      text = `${LRM}${MARK.video}`;
    } else if (kind < 0.115) {
      text = pick(LINKS);
    } else if (kind < 0.125) {
      text = `${makeText(who)} ${LRM}<Se editó este mensaje.>`;
    } else if (kind < 0.133) {
      text = `${LRM}${MARK.deleted}`;
    } else if (who === PEOPLE[0] && kind < 0.14) {
      text = `${LRM}<adjunto: ${String(between(1, 99999999)).padStart(8, '0')}-AUDIO-${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}-00-00-00.opus>`;
    } else {
      text = makeText(who);
    }
    msgs.push({ ts: t, who, text });
    // Respuestas más lentas para la segunda persona
    const slow = who === PEOPLE[0] ? between(10, 240) : between(30, 900);
    t += slow * 1000 * gapScale;
  }
}

for (let i = 0; i < days; i++) {
  const day = new Date(start.getTime() + i * dayMs);
  // Algunos días sin hablar (≈ 6 %), otros muy intensos
  if (rnd() < 0.06) continue;
  let n = Math.max(2, Math.round(perDay * (0.3 + rnd() * 1.6)));
  if (day.getMonth() === 1 && day.getDate() === 14) n = 140; // San Valentín
  // 1 a 3 conversaciones por día
  if (day.getMonth() === 1 && day.getDate() === 14) {
    [8, 13, 19].forEach((hr) => addConversation(day, Math.round(n / 3), hr, 0.15));
    continue;
  }
  const convs = between(1, 3);
  for (let c = 0; c < convs; c++) addConversation(day, Math.max(1, Math.round(n / convs)));
}

// Un silencio largo (~9 días) en la mitad del año: se quitan los mensajes de esos días
{
  const a = start.getTime() + 120 * dayMs;
  const b = a + 9 * dayMs;
  for (let i = msgs.length - 1; i >= 0; i--) if (msgs[i].ts >= a && msgs[i].ts < b) msgs.splice(i, 1);
}

// Una racha larga de la primera persona sin respuesta (premio "El intenso")
{
  const day = new Date(start.getTime() + 200 * dayMs);
  let t = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 15, 0, 0).getTime();
  for (let i = 0; i < 14; i++) msgs.push({ ts: (t += 20000), who: PEOPLE[0], text: pick(PHRASES) });
}

msgs.sort((a, b) => a.ts - b.ts);

const lines = [];
const first = new Date(msgs[0].ts - 60000);
if (GROUP) {
  lines.push(`[${stamp(first)}] Los Panas: ${LRM}Creaste el grupo "Los Panas".`);
}
lines.push(`${LRM}[${stamp(first)}] ${PEOPLE[0]}: ${LRM}Los mensajes y las llamadas están cifrados de extremo a extremo. Nadie fuera de este chat, ni siquiera WhatsApp, puede leerlos ni escucharlos.`);
for (const m of msgs) {
  lines.push(`[${stamp(new Date(m.ts))}] ${m.who}: ${m.text}`);
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, lines.join('\n') + '\n', 'utf8');
console.log(`${GROUP ? 'Grupo' : 'Chat'} de ejemplo: ${msgs.length} mensajes -> ${out}`);
