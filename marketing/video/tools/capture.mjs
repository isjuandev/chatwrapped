#!/usr/bin/env node
/**
 * Captura assets reales de la app (dev server en :5173) usando SOLO el chat ficticio
 * assets/_work/chat-ficticio-laura-andres.zip. Nunca toca los chats reales de la raíz.
 */
import puppeteer from 'puppeteer-core';
import { mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const assets = resolve(here, '..', 'assets');
const ZIP = resolve(assets, '_work', 'chat-ficticio-laura-andres.zip');
const URL = 'http://localhost:5173/';

const chromeRoot = join(os.homedir(), '.cache', 'hyperframes', 'chrome', 'chrome-headless-shell');
const ver = readdirSync(chromeRoot)[0];
const exe = join(chromeRoot, ver, 'chrome-headless-shell-win64', 'chrome-headless-shell.exe');

for (const d of ['ui', 'cards', 'full']) mkdirSync(join(assets, d), { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const saveDataUrl = (file, url) => writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));

const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 430, height: 932, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
page.on('pageerror', (e) => console.log('pageerror', e.message));
await page.goto(URL, { waitUntil: 'networkidle0' });
await sleep(800);
await page.screenshot({ path: join(assets, 'ui', 'landing.png') });
console.log('landing');

await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Hacer mi|Empezar|Subir|Crear|Comenzar|Hazlo|Sube/i.test(b.textContent))?.click());
await sleep(600);
await page.screenshot({ path: join(assets, 'ui', 'upload.png') });
console.log('upload');

const input = await page.$('input[type=file]');
await input.uploadFile(ZIP);
await sleep(120);
await page.screenshot({ path: join(assets, 'ui', 'processing.png') });
console.log('processing');

await page.waitForSelector('canvas.card-canvas', { timeout: 120000 });
await sleep(1500);
// Pausar para que no avance solo
await page.keyboard.press('Space');
await sleep(300);
await page.screenshot({ path: join(assets, 'ui', 'viewer.png') });

const grab = () => page.evaluate(() => document.querySelector('canvas.card-canvas').toDataURL('image/png'));
const count = await page.evaluate(() => document.querySelectorAll('.progress i').length);
console.log('free cards', count);
const nameOf = { 1: 'cover', 2: 'who', 3: 'month', 4: 'hour', 5: 'talk', 6: 'stickers', 7: 'awards', 8: 'quiz', 9: 'summary', 10: 'end' };
for (let i = 1; i <= count; i++) {
  await sleep(700);
  const label = await page.evaluate(() => document.querySelector('canvas.card-canvas').getAttribute('aria-label'));
  const name = `${String(i).padStart(2, '0')}-${nameOf[i] ?? 'card'}`;
  saveDataUrl(join(assets, 'cards', `${name}.png`), await grab());
  console.log(name, label);
  if (/quiz/.test(name)) {
    await page.screenshot({ path: join(assets, 'ui', 'viewer-quiz.png') });
    await page.evaluate(() => [...document.querySelectorAll('.chips button')].find((b) => /respuesta/i.test(b.textContent))?.click());
    await sleep(900);
    saveDataUrl(join(assets, 'cards', `${name}-answer.png`), await grab());
    await page.evaluate(() => [...document.querySelectorAll('.chips button')].find((b) => /respuesta/i.test(b.textContent))?.click());
  }
  if (i < count) await page.keyboard.press('ArrowRight');
}

// Reporte completo
await page.evaluate(() => [...document.querySelectorAll('.viewer-head button')].find((b) => /reporte completo/i.test(b.textContent))?.click());
await sleep(900);
const fcount = await page.evaluate(() => document.querySelectorAll('.progress i').length);
console.log('full cards', fcount);
for (let i = 1; i <= fcount; i++) {
  await sleep(700);
  saveDataUrl(join(assets, 'full', `${String(i).padStart(2, '0')}.png`), await grab());
  if (i === 1) await page.screenshot({ path: join(assets, 'ui', 'viewer-full.png') });
  if (i < fcount) await page.keyboard.press('ArrowRight');
}
await browser.close();
console.log('done');
