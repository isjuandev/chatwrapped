#!/usr/bin/env node
/**
 * Captura PANTALLAS COMPLETAS reales de la app (visor incluido, no solo el canvas de la tarjeta)
 * usando SOLO el chat ficticio assets/_work/chat-ficticio-vale-santi.zip.
 * Requiere el dev server en :5173.  Salida: assets/screens/*.png (1290x2796, iPhone 430x932 @3x)
 *   node tools/capture-screens.mjs
 */
import puppeteer from 'puppeteer-core';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const assets = resolve(here, '..', 'assets');
const out = join(assets, 'screens');
const ZIP = resolve(assets, '_work', 'chat-ficticio-vale-santi.zip');
const URL = 'http://localhost:5173/';

const chromeRoot = join(os.homedir(), '.cache', 'hyperframes', 'chrome', 'chrome-headless-shell');
const ver = readdirSync(chromeRoot)[0];
const exe = join(chromeRoot, ver, 'chrome-headless-shell-win64', 'chrome-headless-shell.exe');
mkdirSync(out, { recursive: true });
for (const d of ['cards', 'full']) mkdirSync(join(assets, d), { recursive: true });
const saveCanvas = async (file) => { const url = await page.evaluate(() => document.querySelector('canvas.card-canvas').toDataURL('image/png')); writeFileSync(file, Buffer.from(url.split(',')[1], 'base64')); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 430, height: 932, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
page.on('pageerror', (e) => console.log('pageerror', e.message));
const shot = async (name) => { await page.screenshot({ path: join(out, name + '.png') }); console.log(name); };

await page.goto(URL, { waitUntil: 'networkidle0' });
await sleep(900);
await shot('landing');

await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Hacer mi|Empezar|Subir|Crear|Comenzar|Hazlo|Sube/i.test(b.textContent))?.click());
await sleep(700);
// modo Mejor amigo/a
await page.evaluate(() => [...document.querySelectorAll('.mode')].find((b) => /Mejor amigo/i.test(b.textContent))?.click());
await sleep(400);
await shot('upload');

const input = await page.$('input[type=file]');
await input.uploadFile(ZIP);
await sleep(150);
await shot('processing');

await page.waitForSelector('canvas.card-canvas', { timeout: 120000 });
await sleep(400);
// pausar el avance automático (si está corriendo)
const paused = () => page.evaluate(() => /Reanudar/.test(document.querySelector('.viewer-head .icon-btn')?.getAttribute('aria-label') || ''));
if (!(await paused())) await page.keyboard.press('Space');
await sleep(500);

const count = await page.evaluate(() => document.querySelectorAll('.progress i').length);
console.log('cards', count);
for (let i = 1; i <= count; i++) {
  await sleep(900);
  const n = String(i).padStart(2, '0');
  await shot(`v${n}`);
  await saveCanvas(join(assets, 'cards', `v${n}.png`));
  const hasReveal = await page.evaluate(() => [...document.querySelectorAll('.chips button')].some((b) => /respuesta/i.test(b.textContent)));
  if (hasReveal) {
    await page.evaluate(() => [...document.querySelectorAll('.chips button')].find((b) => /respuesta/i.test(b.textContent))?.click());
    await sleep(1000);
    await shot(`v${n}-answer`);
    await saveCanvas(join(assets, 'cards', `v${n}-answer.png`));
    await page.evaluate(() => [...document.querySelectorAll('.chips button')].find((b) => /respuesta/i.test(b.textContent))?.click());
    await sleep(300);
  }
  if (i < count) await page.keyboard.press('ArrowRight');
}

await page.evaluate(() => [...document.querySelectorAll('.viewer-head button')].find((b) => /reporte completo/i.test(b.textContent))?.click());
await sleep(1000);
if (!(await paused())) await page.keyboard.press('Space');
const fcount = await page.evaluate(() => document.querySelectorAll('.progress i').length);
console.log('full', fcount);
for (let i = 1; i <= fcount; i++) {
  await sleep(900);
  await shot(`f${String(i).padStart(2, '0')}`);
  await saveCanvas(join(assets, 'full', `${String(i).padStart(2, '0')}.png`));
  if (i < fcount) await page.keyboard.press('ArrowRight');
}
await browser.close();
console.log('done');
