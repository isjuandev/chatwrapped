#!/usr/bin/env node
/**
 * Verificación de encuadre: sirve el proyecto con un server estático, recorre el timeline cada STEP s
 * y lista todo elemento visible con información (texto, img, .zipic, #pg, burbujas, tarjetas, píldoras)
 * cuyo rect salga de la zona segura x 48-1032 / y 120-1800 EN REPOSO.
 * "En reposo" = el rect casi no cambia entre t-0.05, t y t+0.05 (los movimientos de entrada/salida se ignoran).
 * Dentro de #scr (pantalla del teléfono) el rect se compara contra #scr y contra el recorte del propio teléfono.
 * Uso: node tools/check-frame.mjs [paso=0.25]
 */
import puppeteer from 'puppeteer-core';
import http from 'node:http';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const STEP = +(process.argv[2] || 0.25), T0 = +(process.argv[3] || 0.5), T1 = +(process.argv[4] || 42.5);
const MIME = { '.html': 'text/html', '.png': 'image/png', '.woff2': 'font/woff2', '.js': 'text/javascript', '.wav': 'audio/wav', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!p.startsWith(root) || !existsSync(p) || statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' }); res.end(readFileSync(p));
}).listen(0);
const port = server.address().port;

const chromeRoot = join(os.homedir(), '.cache', 'hyperframes', 'chrome', 'chrome-headless-shell');
const ver = readdirSync(chromeRoot).sort().pop();
const exe = join(chromeRoot, ver, 'chrome-headless-shell-win64', 'chrome-headless-shell.exe');
const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--no-sandbox'], protocolTimeout: 900000 });
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1920 });
page.on('pageerror', (e) => console.log('pageerror', e.message)); page.on('console', (m) => m.type()==='error' && !/404/.test(m.text()) && console.log('console', m.text())); page.on('requestfailed', (r) => console.log('reqfail', r.url()));
console.log('launch ok'); await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'load', timeout: 120000 });
console.log('goto ok'); await page.evaluate(() => document.fonts.ready); console.log('fonts ok');
await new Promise((r)=>setTimeout(r,1500)); await page.evaluate(() => { window.__timelines.main.seek(0); return 0; });
console.log('loaded');

const result = await page.evaluate((STEP, T0, T1) => {
  const tl = window.__timelines.main;
  const SAFE = { x0: 48, x1: 1032, y0: 120, y1: 1800 }, TOL = 1.5;
  const scr = document.getElementById('scr');
  const cands = [];
  const all = document.querySelectorAll('#root *');
  all.forEach((el) => {
    if (el.closest('[data-layout-ignore]') && !el.closest('#s1a')) { if (!el.closest('#scr') && !el.closest('.ov')) return; }
    const tag = el.tagName;
    if (['SCRIPT', 'STYLE', 'AUDIO', 'I', 'U', 'B'].includes(tag) && !(tag === 'B' && false)) return;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    const isBox = tag === 'IMG' || el.classList.contains('zipic') || el.id === 'pg' || el.classList.contains('b') || el.classList.contains('gc') || el.classList.contains('fc') || el.id === 'sentPill' || el.id === 'cta2' || el.id === 'lockBadge';
    if (!own && !isBox) return;
    // las capas .lay (pantalla completa del teléfono) y el chat falso se evalúan contra #scr
    cands.push({ el, own, isBox });
  });
  function active(el, t) {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      if (n.classList && n.classList.contains('clip') && n.dataset.start !== undefined) {
        const s = +n.dataset.start, d = +n.dataset.duration;
        if (t < s - 1e-6 || t >= s + d - 1e-6) return false;
      }
    }
    return true;
  }
  let cache = new Map();
  function eff(el) {
    if (cache.has(el)) return cache.get(el);
    let v;
    if (!el || el === document.documentElement) v = 1;
    else {
      const cs = getComputedStyle(el);
      v = (cs.display === 'none' || cs.visibility === 'hidden') ? 0 : parseFloat(cs.opacity) * eff(el.parentElement);
    }
    cache.set(el, v); return v;
  }
  function rectOf(c) {
    if (c.own && !c.isBox) {
      const r = document.createRange(); let u = null;
      [...c.el.childNodes].forEach((n) => { if (n.nodeType === 3 && n.textContent.trim()) { r.selectNodeContents(n); const b = r.getBoundingClientRect(); u = u ? { l: Math.min(u.l, b.left), t: Math.min(u.t, b.top), r: Math.max(u.r, b.right), b: Math.max(u.b, b.bottom) } : { l: b.left, t: b.top, r: b.right, b: b.bottom }; } });
      return u;
    }
    const b = c.el.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom };
  }
  function sample(t) {
    tl.seek(t, false); cache = new Map();
    return cands.map((c) => {
      if (!active(c.el, t)) return null;
      const o = eff(c.el); if (o <= 0.05) return null;
      const r = rectOf(c); if (!r || r.r - r.l < 1) return null;
      return r;
    });
  }
  const label = (c) => (c.el.id ? '#' + c.el.id : '') + (c.el.className && typeof c.el.className === 'string' ? '.' + c.el.className.split(' ').join('.') : '') + ' "' + (c.el.textContent || c.el.tagName).trim().slice(0, 28) + '"';
  const viol = [];
  let moving = 0;
  const end = tl.duration();
  for (let t = T0; t <= T1 + 1e-6; t += STEP) {
    const a = sample(t - 0.05), b = sample(t), d = sample(t + 0.05);
    const sr = (tl.seek(t, false), scr.getBoundingClientRect());
    b.forEach((r, i) => {
      if (!r) return;
      const rest = a[i] && d[i] && ['l', 't', 'r', 'b'].every((k) => Math.abs(a[i][k] - r[k]) < 2 && Math.abs(d[i][k] - r[k]) < 2);
      if (!rest) { moving++; return; }
      const c = cands[i]; const inScr = scr.contains(c.el) && c.el !== scr;
      const out = [];
      if (r.l < SAFE.x0 - TOL) out.push('L' + Math.round(r.l)); if (r.r > SAFE.x1 + TOL) out.push('R' + Math.round(r.r));
      if (r.t < SAFE.y0 - TOL) out.push('T' + Math.round(r.t)); if (r.b > SAFE.y1 + TOL) out.push('B' + Math.round(r.b));
      if (inScr && !c.el.classList.contains('lay')) {
        // el contenido dentro del teléfono debe quedar entero dentro de #scr
        if (r.l < sr.left - 2 || r.r > sr.right + 2 || r.t < sr.top - 2 || r.b > sr.bottom + 2) out.push('fuera-de-pantalla');
      }
      if (out.length) viol.push({ t: +t.toFixed(2), what: label(c), out: out.join(' '), rect: [r.l, r.t, r.r, r.b].map(Math.round) });
    });
  }
  return { viol, moving };
}, STEP, T0, T1);

await browser.close(); server.close();
const seen = new Map();
for (const v of result.viol) { const k = v.what + '|' + v.out; (seen.get(k) || seen.set(k, { ...v, n: 0, t1: v.t }).get(k)).n++; seen.get(k).t1 = v.t; }
for (const v of seen.values()) console.log(`VIOLACION t=${v.t}..${v.t1} (${v.n} muestras) ${v.what} -> ${v.out} rect=${v.rect}`);
console.log(`muestras en movimiento ignoradas: ${result.moving}`);
console.log(`violaciones en reposo: ${seen.size}`);
process.exit(seen.size ? 1 : 0);
