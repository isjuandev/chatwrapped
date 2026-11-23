#!/usr/bin/env node
/**
 * Toma el render de HyperFrames con SOLO efectos (renders/sfx-raw.mp4) y genera:
 *   renders/chat-wrapped-promo-sync-sfx.mp4   solo SFX (pico <= -2 dBFS), mismo timing de beats
 *   renders/chat-wrapped-promo-nuevayol.mp4   música + SFX (sidechain, fade in 0.3 s / out 2 s, -14 LUFS, TP <= -1 dBTP)
 * La canción (assets/music/nuevayol.mp3, con copyright, NO se versiona) arranca en SONG_START (cues.json) para que el drop caiga en 1.60 s.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, renameSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const R = (p) => resolve(root, p);
const { song_start: START } = JSON.parse(readFileSync(R('cues.json'), 'utf8'));
const DUR = 43.0;
const MUSIC_DB = Number(process.env.MUSIC_DB ?? 0); // la música manda; loudnorm deja el total en -14 LUFS
const SFX_DB = Number(process.env.SFX_DB ?? -4); // efectos por debajo de la música (solo subrayan)
const ff = (args) => spawnSync('ffmpeg', ['-hide_banner', '-y', ...args], { encoding: 'utf8', maxBuffer: 1 << 28 });

// 1) audio de efectos tal cual salió del render
ff(['-i', R('renders/sfx-raw.mp4'), '-vn', '-ac', '2', '-ar', '48000', '-c:a', 'pcm_s16le', R('assets/_work/sfx.wav')]);

// 2) SFX-only: pico a -2 dBFS si hace falta
const vd = ff(['-i', R('assets/_work/sfx.wav'), '-af', 'volumedetect', '-f', 'null', '-']).stderr;
const peak = Number(/max_volume: (-?[\d.]+) dB/.exec(vd)[1]);
const gain = peak > -1.5 ? -2 - peak : 0;
ff(['-i', R('renders/sfx-raw.mp4'), '-c:v', 'copy', '-af', `volume=${gain.toFixed(2)}dB`, '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', R('renders/chat-wrapped-promo-sync-sfx.mp4')]);
console.log(`SFX-only: pico crudo ${peak} dB, ganancia ${gain.toFixed(2)} dB`);

// 3) música + SFX
const chain = (norm) =>
  `[1:a]atrim=start=${START}:duration=${DUR},asetpts=PTS-STARTPTS,volume=${MUSIC_DB}dB,afade=t=in:st=0:d=0.3,afade=t=out:st=${DUR - 2}:d=2[m];` +
  `[0:a]volume=${SFX_DB}dB,asplit=2[s1][s2];` +
  `[m][s1]sidechaincompress=threshold=0.2:ratio=1.6:attack=5:release=120:makeup=1[md];` +
  `[md][s2]amix=inputs=2:normalize=0:duration=first[mix];` +
  `[mix]${norm}[out]`;
const first = ff(['-i', R('assets/_work/sfx.wav'), '-i', R('assets/music/nuevayol.mp3'), '-filter_complex', chain('loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json'), '-map', '[out]', '-f', 'null', '-']).stderr;
const j = JSON.parse(/\{[^{}]*"input_i"[^{}]*\}/s.exec(first)[0]);
const norm = `loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true`;
ff(['-i', R('assets/_work/sfx.wav'), '-i', R('assets/music/nuevayol.mp3'), '-filter_complex', chain(norm), '-map', '[out]', '-ar', '48000', R('assets/_work/mix.wav')]);
ff(['-i', R('renders/sfx-raw.mp4'), '-i', R('assets/_work/mix.wav'), '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', R('renders/chat-wrapped-promo-nuevayol.mp4')]);
console.log('listo: renders/chat-wrapped-promo-nuevayol.mp4');
