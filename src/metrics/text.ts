/** Utilidades de texto para métricas: emojis, palabras, risas. */

const SEGMENTER: { segment(s: string): Iterable<{ segment: string }> } | null =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new (Intl as unknown as {
        Segmenter: new (l?: string, o?: { granularity: string }) => {
          segment(s: string): Iterable<{ segment: string }>;
        };
      }).Segmenter('es', { granularity: 'grapheme' })
    : null;

const PICTO = /\p{Extended_Pictographic}/u;
const SKIN_TONE = /[\u{1F3FB}-\u{1F3FF}]/gu;
const VS16 = /\uFE0F/g;

/** Extrae los emojis (un elemento por emoji), normalizando variantes (❤ vs ❤️, tonos de piel). */
export function extractEmojis(text: string): string[] {
  const out: string[] = [];
  const segs: string[] = SEGMENTER
    ? Array.from(SEGMENTER.segment(text), (s) => s.segment)
    : Array.from(text);
  for (const seg of segs) {
    if (!PICTO.test(seg)) continue;
    // Descarta símbolos de texto simples (©, ®, ™) sin selector de emoji.
    if (/^[\u00a9\u00ae\u2122]$/.test(seg)) continue;
    out.push(normalizeEmoji(seg));
  }
  return out;
}

export function normalizeEmoji(seg: string): string {
  const base = seg.replace(VS16, '').replace(SKIN_TONE, '');
  // Los símbolos BMP de un solo punto (❤, ☺, ✨) se muestran como emoji con VS16.
  const cps = Array.from(base);
  if (cps.length === 1 && (cps[0].codePointAt(0) ?? 0) < 0x10000) return base + '\uFE0F';
  return base;
}

export function stripAccents(w: string): string {
  return w
    .replace(/ñ/g, '\u0001')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0001/g, 'ñ');
}

const URL_RE = /(https?:\/\/\S+|www\.\S+)/gi;

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(URL_RE, ' ')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/** ¿La palabra es una risa (jaja, jeje, jsjs, haha…)? */
export function isLaughWord(key: string): boolean {
  return /^(?:j[aeiou]){2,}j?[aeiou]?$|^(?:js){2,}\w*$|^je{2,}\w*$|^ja{2,}\w*$|^(?:ha){2,}h?a?$|^(?:ja)+j?$/.test(key);
}

export const LAUGH_RE = /\b(ja){2,}j?a?\b|\bjsjs\w*|\bjeje\w*/gi;

export function countLaughs(text: string): number {
  const m = text.match(LAUGH_RE);
  return m ? m.length : 0;
}
