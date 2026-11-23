#!/usr/bin/env python
"""Sintetiza TODOS los efectos de sonido del video (sin descargar nada). Salida: assets/sfx/*.wav
   (mono, 44.1 kHz, 16 bit, pico individual -3 dBFS, filtro pasa-bajos ~9 kHz para evitar agudos hirientes)."""
import wave, os
import numpy as np

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sfx')
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)


def t_(d): return np.arange(int(d * SR)) / SR
def env_exp(n, tau): return np.exp(-np.arange(n) / SR / tau)
def sine(f, d, ph=0.0):
    t = t_(d); f = np.asarray(f)
    if f.ndim == 0: return np.sin(2 * np.pi * f * t + ph)
    return np.sin(2 * np.pi * np.cumsum(f) / SR + ph)
def sweep(f0, f1, d, curve=2.0):
    t = t_(d) / d
    return f0 + (f1 - f0) * t ** curve
def noise(d): return rng.uniform(-1, 1, int(d * SR))
def fade(x, a=0.002, b=0.004):
    x = x.copy(); na, nb = int(a * SR), int(b * SR)
    if na: x[:na] *= np.linspace(0, 1, na)
    if nb: x[-nb:] *= np.linspace(1, 0, nb)
    return x

def lowpass(x, fc):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / (1 + (f / fc) ** 4)
    return np.fft.irfft(X, len(x))
def highpass(x, fc):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 - 1 / (1 + (f / fc) ** 4)
    return np.fft.irfft(X, len(x))
def bandsweep_noise(d, f0, f1, q=0.25, curve=1.5):
    """ruido filtrado por banda que barre de f0 a f1 (STFT simple)."""
    n = int(d * SR); x = noise(d)
    win = 2048; hop = 512; out = np.zeros(n + win)
    w = np.hanning(win); freqs = np.fft.rfftfreq(win, 1 / SR)
    for s in range(0, n - win, hop):
        p = (s / n) ** curve
        fc = f0 * (f1 / f0) ** p
        g = np.exp(-0.5 * ((np.log2(freqs + 1) - np.log2(fc)) / q) ** 2)
        out[s:s + win] += np.fft.irfft(np.fft.rfft(x[s:s + win] * w) * g, win) * w
    return out[:n]

def place(buf, x, at):
    i = int(at * SR)
    if i + len(x) > len(buf): buf = np.pad(buf, (0, i + len(x) - len(buf)))
    buf[i:i + len(x)] += x
    return buf

def save(name, x, peak_db=-3.0):
    x = lowpass(x, 9000)
    m = np.max(np.abs(x)) or 1
    x = x / m * 10 ** (peak_db / 20)
    x = fade(x, 0.001, 0.01)
    with wave.open(os.path.join(OUT, name + '.wav'), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype('<i2').tobytes())
    print(name, round(len(x) / SR, 2), 's')

# ------------------------------------------------------------------ sonidos
def pop(f0=720, f1=240, d=0.11, tau=0.03):
    x = sine(sweep(f0, f1, d, 0.5), d) * env_exp(int(d * SR), tau)
    return x + 0.25 * sine(sweep(f0 * 2, f1 * 2, d, 0.5), d) * env_exp(int(d * SR), tau / 2)

def tick(f=1800, d=0.05):
    x = sine(f, d) * env_exp(int(d * SR), 0.008)
    c = highpass(noise(0.004), 2500) * 0.6
    x[:len(c)] += c
    return x

def click(f=900):
    d = 0.09
    x = sine(f, d) * env_exp(int(d * SR), 0.012)
    c = noise(0.006) * np.hanning(int(0.006 * SR)) * 0.9
    x[:len(c)] += c
    return x + 0.5 * pop(500, 160, 0.09, 0.02)[:len(x)]

def boom(d=1.4, f0=95, f1=34):
    t = t_(d)
    x = sine(sweep(f0, f1, d, 0.35), d) * env_exp(len(t), 0.45)
    x += 0.5 * sine(sweep(f0 * 2, f1 * 2, d, 0.35), d) * env_exp(len(t), 0.2)
    n = lowpass(noise(d), 900) * env_exp(len(t), 0.12) * 0.9
    thump = noise(0.01) * np.hanning(int(0.01 * SR)) * 0.8
    x += n; x[:len(thump)] += thump
    return x

def whoosh(d=0.7, f0=300, f1=3500, up=True):
    x = bandsweep_noise(d, f0, f1) if up else bandsweep_noise(d, f1, f0)
    e = np.sin(np.pi * np.linspace(0, 1, len(x)) ** (0.7 if up else 1.4)) ** 1.5
    return x * e

def riser(d=1.6):
    n = int(d * SR)
    x = bandsweep_noise(d, 250, 5200, 0.35, 1.2) * np.linspace(0.05, 1, n) ** 2
    s = sine(sweep(120, 880, d, 2.2), d) * np.linspace(0, 1, n) ** 2 * 0.35
    return x + s

def glitch(d=0.35):
    n = int(d * SR); x = np.zeros(n); i = 0
    while i < n:
        seg = int(rng.uniform(0.008, 0.04) * SR)
        f = rng.choice([180, 330, 520, 1250, 2200])
        s = np.sign(np.sin(2 * np.pi * f * np.arange(seg) / SR)) * rng.uniform(0.3, 1)
        if rng.random() < 0.4: s = rng.uniform(-1, 1, seg) * 0.7
        x[i:i + seg] += s[:max(0, min(seg, n - i))]
        i += seg + int(rng.uniform(0, 0.02) * SR)
    return lowpass(x, 5000) * np.linspace(1, 0.1, n)

def chime(freqs, d=0.9, gap=0.07, tau=0.25):
    buf = np.zeros(int(d * SR))
    for k, f in enumerate(freqs):
        dd = d - k * gap
        s = (sine(f, dd) + 0.3 * sine(f * 2.01, dd) + 0.12 * sine(f * 3.02, dd)) * env_exp(int(dd * SR), tau)
        buf = place(buf, s * (1 - 0.05 * k), k * gap)
    return buf[:int(d * SR)]

def thud(d=0.4):
    x = sine(sweep(160, 55, d, 0.4), d) * env_exp(int(d * SR), 0.1)
    return x + lowpass(noise(d), 500) * env_exp(int(d * SR), 0.04) * 0.6

def shutter():
    a = highpass(noise(0.03), 1500) * env_exp(int(0.03 * SR), 0.007)
    b = highpass(noise(0.045), 1000) * env_exp(int(0.045 * SR), 0.012)
    buf = np.zeros(int(0.2 * SR)); buf = place(buf, a, 0); buf = place(buf, b, 0.075)
    return buf + 0.4 * place(np.zeros(int(0.2 * SR)), sine(220, 0.05) * env_exp(int(0.05 * SR), 0.01), 0.0)

def zipper(d=0.5):
    n = int(d * SR); buf = np.zeros(n); t = 0.0; k = 0
    while t < d - 0.02:
        buf = place(buf, tick(2200 + 40 * k % 800, 0.02) * 0.8, t)
        t += max(0.012, 0.03 - 0.0008 * k); k += 1
    return buf

# ---- sueltos
save('pop_a', pop(760, 260))
save('pop_b', pop(980, 360, 0.1))
save('pop_big', pop(520, 150, 0.2, 0.06) + 0.4 * sine(70, 0.2) * env_exp(int(0.2 * SR), 0.06))
save('tick', tick())
save('click', click())
save('boom_big', boom(1.5, 100, 34))
save('boom_small', boom(0.7, 120, 50))
save('impact', boom(1.0, 140, 45) + 0.3 * highpass(noise(1.0), 3000) * env_exp(int(SR), 0.05))
save('whoosh_up', whoosh(0.6, 300, 3800, True))
save('whoosh_down', whoosh(0.5, 3200, 350, False))
save('swipe', whoosh(0.38, 600, 4200, True))
save('riser', riser(1.7))
save('glitch', glitch())
save('ding', chime([1318.5, 1975.5], 1.1, 0.0, 0.3))
save('sting_reveal', chime([523.25, 659.25, 783.99, 1046.5, 1318.5], 1.3, 0.075, 0.35))
save('sparkle', chime([1568, 1976, 2349, 2637], 1.0, 0.06, 0.18))
save('lock', place(chime([987.8, 1318.5], 0.7, 0.09, 0.2), 0.8 * click(700), 0.0))
save('thud', thud())
save('shutter', shutter())
save('zipper', zipper())

# ---- compuestos sincronizados con la animación
# Inundación del hook: N pops acelerando (misma fórmula que index.html) + subgrave que crece.
N = 40
dur = 1.65
buf = np.zeros(int(dur * SR))
for i in range(N):
    at = 0.05 + 1.5 * (i / (N - 1)) ** 2.0
    f = 520 + 90 * (i % 5) + 14 * i
    buf = place(buf, pop(f, f * 0.35, 0.09, 0.022) * (0.5 + 0.5 * i / N), at)
buf += 0.35 * bandsweep_noise(dur, 400, 4800, 0.4, 1.4) * np.linspace(0.05, 1, len(buf)) ** 2
buf += 0.25 * sine(sweep(60, 160, dur, 2.0), dur) * np.linspace(0, 1, len(buf)) ** 1.5
save('flood', buf)

# Barra de procesamiento: 16 ticks con tono ascendente en 1.2 s
d = 1.3; buf = np.zeros(int(d * SR))
for i in range(16):
    buf = place(buf, tick(1100 + 90 * i, 0.04), 0.02 + 1.2 * i / 15 * (0.6 + 0.4 * i / 15))
save('progress_ticks', buf)

save('flick', whoosh(0.22, 800, 5000, True))
