import { BASELINE_ES } from './baseline-es';

/** Risas con errores de tipeo ("jajajajja", "jsjsjsj") que no deben contar como palabras nuevas. */
const LAUGH_LIKE = /^(?=.*j)[jaeish]+$/;
import type {
  Award, Evolution, HalfStats, MediaTotals, Message, MonthBucket, Mode, PersonStats, Phrase, ReplyPair,
  StickerIndex, StickerStat, TimeStats, WordStat, WrappedData,
} from '../types';
import { fmtInt, fmtResponse, MONTHS, ofEach } from '../format';
import { EXCLUDED_WORDS, STOPWORDS } from './stopwords';
import { hasPhrase, KEYWORDS, matchesKeywords, normalizeForMatch } from './keywords';
import { discoverPhrases } from './phrases';
import { countLaughs, extractEmojis, isLaughWord, stripAccents, tokenize } from './text';

const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export class EmptyChatError extends Error {}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dayIndex(d: Date): number {
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY);
}

/** Índice de día -> "2025-03-07". */
export function isoOfIndex(idx: number): string {
  const d = new Date(idx * DAY);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

interface PersonAcc {
  count: number;
  textCount: number;
  audios: number;
  stickers: number;
  images: number;
  videos: number;
  gifs: number;
  documents: number;
  generic: number;
  links: number;
  deleted: number;
  edited: number;
  lenSum: number;
  gaps: number[];
  responseSum: number;
  responseN: number;
  fast: number;
  night: number; // 00:00-04:59
  early: number; // 05:00-08:59
  laughMsgs: number;
  emojis: number;
  starts: number;
  maxRun: number;
  goodMorning: number;
  chains: number;
  plans: number;
  gossip: number;
  sweet: number;
  goodNight: number;
  teAmo: number;
  teExtrano: number;
  perdon: number;
  parce: number;
  goodMorningAny: number;
  gracias: number;
}

const newAcc = (): PersonAcc => ({
  count: 0,
  textCount: 0,
  audios: 0,
  stickers: 0,
  images: 0,
  videos: 0,
  gifs: 0,
  documents: 0,
  generic: 0,
  links: 0,
  deleted: 0,
  edited: 0,
  lenSum: 0,
  gaps: [],
  responseSum: 0,
  responseN: 0,
  fast: 0,
  night: 0,
  early: 0,
  laughMsgs: 0,
  emojis: 0,
  starts: 0,
  maxRun: 0,
  goodMorning: 0,
  chains: 0,
  plans: 0,
  gossip: 0,
  sweet: 0,
  goodNight: 0,
  teAmo: 0,
  teExtrano: 0,
  perdon: 0,
  parce: 0,
  goodMorningAny: 0,
  gracias: 0,
});

/** Racha más larga de días consecutivos con mensajes (índices de día). */
export function longestStreak(dayIdx: number[]): { days: number; startIdx: number; endIdx: number } {
  const days = Array.from(new Set(dayIdx)).sort((a, b) => a - b);
  let best = { days: 0, startIdx: 0, endIdx: 0 };
  let run = 0;
  let runStart = 0;
  let prev = Number.NEGATIVE_INFINITY;
  for (const d of days) {
    if (d === prev + 1) run++;
    else {
      run = 1;
      runStart = d;
    }
    if (run > best.days) best = { days: run, startIdx: runStart, endIdx: d };
    prev = d;
  }
  return best;
}

/** Máx. de días consecutivos con mensajes. */
export function maxStreak(dayIdx: number[]): number {
  return longestStreak(dayIdx).days;
}

/** Mayor hueco de días completos sin mensajes entre dos días con mensajes. */
export function longestSilence(dayIdx: number[]): { days: number; from: string; to: string } | null {
  const days = Array.from(new Set(dayIdx)).sort((a, b) => a - b);
  let best: { days: number; from: number; to: number } | null = null;
  for (let i = 1; i < days.length; i++) {
    const quiet = days[i] - days[i - 1] - 1;
    if (quiet > 0 && (!best || quiet > best.days)) best = { days: quiet, from: days[i - 1] + 1, to: days[i] - 1 };
  }
  return best && { days: best.days, from: isoOfIndex(best.from), to: isoOfIndex(best.to) };
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Mensajes de la ventana de 365 días que termina en el último mensaje (sin eliminados). */
export function windowMessages(all: Message[]): Message[] {
  const msgs = all.filter((m) => m.type !== 'deleted');
  if (msgs.length === 0) return [];
  const cutoff = msgs[msgs.length - 1].ts - 365 * DAY;
  return msgs.filter((m) => m.ts >= cutoff);
}

/** Nombre de respaldo del grupo cuando el archivo no lo trae. */
export function fallbackGroupName(mode: Mode): string {
  return mode.rel === 'familia' ? 'La familia' : 'El parche';
}

export function computeWrapped(
  allMessages: Message[],
  mode: Mode,
  chatName: string | null = null,
  stickerIndex: StickerIndex | null = null,
): WrappedData {
  const msgs = allMessages.filter((m) => m.type !== 'deleted');
  if (msgs.length === 0) throw new EmptyChatError('Chat vacío');

  const lastTs = msgs[msgs.length - 1].ts;
  const cutoff = lastTs - 365 * DAY;
  let win = msgs.filter((m) => m.ts >= cutoff);

  // Autores por cantidad de mensajes
  const counts = new Map<string, number>();
  for (const m of win) counts.set(m.author, (counts.get(m.author) ?? 0) + 1);
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const warnings: string[] = [];

  const participants = ranked.length;
  const duo = mode.size === 'duo';
  // La app pregunta antes (hoja de sugerencia); esto solo cubre llamadas directas con un duo de >2 personas.
  if (duo && ranked.length > 2) {
    warnings.push(
      `Este chat tiene ${ranked.length} personas. Para 2 personas usamos las 2 que más escriben.`,
    );
    const keep = new Set(ranked.slice(0, 2).map(([n]) => n));
    win = win.filter((m) => keep.has(m.author));
  }

  const names = (duo ? ranked.slice(0, 2) : ranked).map(([n]) => n);
  const acc = new Map<string, PersonAcc>(names.map((n) => [n, newAcc()]));
  const nameIdx = new Map<string, number>(names.map((n, i) => [n, i]));

  // Mensajes eliminados (no cuentan en el total; sí en "El arrepentido")
  for (const m of allMessages) {
    if (m.type === 'deleted' && m.ts >= cutoff) {
      const a = acc.get(m.author);
      if (a) a.deleted++;
    }
  }

  const hourHist = new Array<number>(24).fill(0);
  const weekdays = new Array<number>(7).fill(0);
  const dayCounts = new Map<string, number>();
  const dayIdx: number[] = [];
  const emojiCount = new Map<string, number>();
  const wordCount = new Map<string, Map<string, number>>();
  const wordTotal = new Map<string, number>();
  const personWords = new Map<string, Map<string, number>>(names.map((n) => [n, new Map()]));
  const matrix: number[][] = names.map(() => names.map(() => 0));
  const monthCounts = new Map<string, number>();
  const stickerCounts = new Map<string, { count: number; by: Map<string, number> }>();
  let jajaCount = 0;
  let totalStarts = 0;

  const nameKeys = new Set<string>();
  for (const n of names) {
    for (const t of tokenize(n)) if (t.length >= 2) nameKeys.add(stripAccents(t));
  }

  let runAuthor = '';
  let runLen = 0;

  // ---- Reporte completo (todo O(n), sin estructuras por mensaje)
  const firstTs = win[0].ts;
  const midTs = firstTs + (win[win.length - 1].ts - firstTs) / 2;
  const halfMsgs = [0, 0];
  const halfPerson: number[][] = [names.map(() => 0), names.map(() => 0)];
  const halfGaps: number[][] = [[], []];
  /** Usos de cada palabra en la 1.ª mitad (los de la 2.ª salen de wordTotal − esto). */
  const firstHalfWords = new Map<string, number>();
  let conversations = 0;
  let convTotalMs = 0;
  let longestConv: TimeStats['longest'] = null;
  let convStart = 0;
  let convLast = 0;
  let convN = 0;
  const flushConv = (): void => {
    if (convN === 0) return;
    const ms = Math.max(MIN, convLast - convStart);
    conversations++;
    convTotalMs += ms;
    if (!longestConv || ms > longestConv.ms) longestConv = { ms, iso: isoOf(new Date(convStart)), messages: convN };
    convN = 0;
  };

  for (let i = 0; i < win.length; i++) {
    const m = win[i];
    const a = acc.get(m.author);
    if (!a) continue;
    const half = m.ts >= midTs ? 1 : 0;
    halfMsgs[half]++;
    halfPerson[half][nameIdx.get(m.author)!]++;
    if (i === 0 || m.ts - win[i - 1].ts >= 30 * MIN) {
      flushConv();
      convStart = m.ts;
    }
    convLast = m.ts;
    convN++;
    const d = new Date(m.ts);
    const h = d.getHours();
    a.count++;
    hourHist[h]++;
    weekdays[(d.getDay() + 6) % 7]++;
    if (h < 5) a.night++;
    else if (h < 9) a.early++;
    const iso = isoOf(d);
    dayCounts.set(iso, (dayCounts.get(iso) ?? 0) + 1);
    dayIdx.push(dayIndex(d));
    const mk = iso.slice(0, 7);
    monthCounts.set(mk, (monthCounts.get(mk) ?? 0) + 1);

    switch (m.type) {
      case 'audio': a.audios++; break;
      case 'sticker': {
        a.stickers++;
        const hash = m.file && stickerIndex ? stickerIndex.byFile.get(m.file.replace(/^.*[\\/]/, '').trim().toLowerCase()) : undefined;
        if (hash) {
          let e = stickerCounts.get(hash);
          if (!e) stickerCounts.set(hash, (e = { count: 0, by: new Map() }));
          e.count++;
          e.by.set(m.author, (e.by.get(m.author) ?? 0) + 1);
        }
        break;
      }
      case 'image': a.images++; break;
      case 'video': a.videos++; break;
      case 'gif': a.gifs++; break;
      case 'document': a.documents++; break;
      case 'media': a.generic++; break;
      default: break;
    }
    if (m.edited) a.edited++;
    if (m.link) a.links++;

    if (m.type === 'image' && h >= 5 && h < 9) a.chains++;

    if (m.type === 'text') {
      if (m.text.length > 300) a.chains++;
      const norm = normalizeForMatch(m.text);
      if (h >= 5 && h < 10 && (hasPhrase(norm, KEYWORDS.buenosDias.phrases) || matchesKeywords(m.text, { phrases: [], emojis: KEYWORDS.buenosDias.emojis }))) a.goodMorning++;
      if (hasPhrase(norm, KEYWORDS.buenosDias.phrases)) a.goodMorningAny++;
      if (hasPhrase(norm, KEYWORDS.teAmo.phrases)) a.teAmo++;
      if (hasPhrase(norm, KEYWORDS.teExtrano.phrases)) a.teExtrano++;
      if (hasPhrase(norm, KEYWORDS.perdon.phrases)) a.perdon++;
      if (hasPhrase(norm, KEYWORDS.parce.phrases)) a.parce++;
      if (hasPhrase(norm, KEYWORDS.gracias.phrases)) a.gracias++;
      if (hasPhrase(norm, KEYWORDS.planes.phrases)) a.plans++;
      if (hasPhrase(norm, KEYWORDS.chisme.phrases)) a.gossip++;
      if (matchesKeywords(m.text, KEYWORDS.cursi)) a.sweet++;
      if ((h >= 21 || h < 2) && hasPhrase(norm, KEYWORDS.buenasNoches.phrases)) a.goodNight++;
      a.textCount++;
      a.lenSum += m.text.length;
      const laughs = countLaughs(m.text);
      jajaCount += laughs;
      const emojis = extractEmojis(m.text);
      const laughed = laughs > 0 || emojis.some((e) => e.startsWith('😂') || e.startsWith('🤣'));
      if (laughed) a.laughMsgs++;
      a.emojis += emojis.length;
      for (const e of emojis) emojiCount.set(e, (emojiCount.get(e) ?? 0) + 1);
      const mine = personWords.get(m.author)!;
      for (const tok of tokenize(m.text)) {
        const key = stripAccents(tok);
        if (key.length < 3 || /^\d+$/.test(key)) continue;
        if (STOPWORDS.has(key) || EXCLUDED_WORDS.has(key) || nameKeys.has(key) || isLaughWord(key)) {
          continue;
        }
        wordTotal.set(key, (wordTotal.get(key) ?? 0) + 1);
        if (half === 0) firstHalfWords.set(key, (firstHalfWords.get(key) ?? 0) + 1);
        mine.set(key, (mine.get(key) ?? 0) + 1);
        let forms = wordCount.get(key);
        if (!forms) wordCount.set(key, (forms = new Map()));
        forms.set(tok, (forms.get(tok) ?? 0) + 1);
      }
    }

    // Rachas de mensajes seguidos sin respuesta
    if (m.author === runAuthor) runLen++;
    else {
      runAuthor = m.author;
      runLen = 1;
    }
    if (runLen > a.maxRun) a.maxRun = runLen;

    if (i > 0) {
      const prev = win[i - 1];
      const gap = m.ts - prev.ts;
      if (prev.author !== m.author && gap <= 12 * HOUR) {
        a.responseSum += gap;
        a.responseN++;
        a.gaps.push(gap);
        halfGaps[half].push(gap);
        if (gap < MIN) a.fast++;
      }
      if (prev.author !== m.author && gap < 30 * MIN) {
        const pi = nameIdx.get(prev.author);
        const mi = nameIdx.get(m.author);
        if (pi !== undefined && mi !== undefined) matrix[mi][pi]++; // m responde a prev
      }
      if (gap >= 6 * HOUR) {
        a.starts++;
        totalStarts++;
      }
    }
  }

  const total = win.length;
  flushConv();

  const timeStats: TimeStats = {
    conversations,
    totalMs: convTotalMs,
    avgMs: conversations ? convTotalMs / conversations : 0,
    longest: longestConv,
  };

  const firstIso = isoOf(new Date(firstTs));
  const midIso = isoOf(new Date(midTs));
  const lastIso = isoOf(new Date(win[win.length - 1].ts));
  const halfDays = Math.max(1, (dayIndex(new Date(win[win.length - 1].ts)) - dayIndex(new Date(firstTs)) + 1) / 2);
  const halfOf = (h: 0 | 1): HalfStats => ({
    startIso: h === 0 ? firstIso : midIso,
    endIso: h === 0 ? midIso : lastIso,
    messages: halfMsgs[h],
    perDay: halfMsgs[h] / halfDays,
    shares: halfPerson[h].map((c) => (halfMsgs[h] ? c / halfMsgs[h] : 0)),
    medianResponseMs: median(halfGaps[h]),
  });
  // Palabras nuevas: ≥ 5 usos en la 2.ª mitad y ≤ 1 en la 1.ª.
  const newWordKeys: { key: string; c: number }[] = [];
  for (const [key, all] of wordTotal) {
    const before = firstHalfWords.get(key) ?? 0;
    const after = all - before;
    // Igual que en las expresiones: las palabras del español genérico ("creo", "pasó") no son "nuevas" con gracia.
    if (after >= 5 && before <= 1 && !BASELINE_ES.has(key) && !LAUGH_LIKE.test(key)) newWordKeys.push({ key, c: after });
  }
  newWordKeys.sort((x, y) => y.c - x.c || x.key.localeCompare(y.key));
  const newWords: WordStat[] = newWordKeys.slice(0, 3).map(({ key, c }) => {
    const forms = [...wordCount.get(key)!.entries()].sort((a, b) => b[1] - a[1]);
    return { word: forms[0][0], count: c };
  });
  const evolution: Evolution = { first: halfOf(0), second: halfOf(1), newWords };

  // Palabra característica: score = log(1+c_p) * (c_p+1)/(c_otros+1), c_p >= 3; sin repetir palabra entre personas.
  const triples: { name: string; key: string; score: number; c: number }[] = [];
  for (const n of names) {
    for (const [key, c] of personWords.get(n)!) {
      if (c < 3) continue;
      const others = (wordTotal.get(key) ?? c) - c;
      triples.push({ name: n, key, c, score: Math.log(1 + c) * ((c + 1) / (others + 1)) });
    }
  }
  triples.sort((x, y) => y.score - x.score || y.c - x.c || x.key.localeCompare(y.key));
  const signatures = new Map<string, { word: string; count: number }>();
  const takenKeys = new Set<string>();
  for (const t of triples) {
    if (signatures.has(t.name) || takenKeys.has(t.key)) continue;
    const forms = [...wordCount.get(t.key)!.entries()].sort((a, b) => b[1] - a[1]);
    signatures.set(t.name, { word: forms[0][0], count: t.c });
    takenKeys.add(t.key);
  }

  const people: PersonStats[] = names.map((n) => {
    const a = acc.get(n)!;
    return {
      name: n,
      quiz: {
        night: a.night,
        laughMsgs: a.laughMsgs,
        emojis: a.emojis,
        teAmo: a.teAmo,
        teExtrano: a.teExtrano,
        perdon: a.perdon,
        parce: a.parce,
        planes: a.plans,
        buenosDias: a.goodMorningAny,
        gracias: a.gracias,
      },
      count: a.count,
      share: total ? a.count / total : 0,
      audios: a.audios,
      avgResponseMs: a.responseN ? a.responseSum / a.responseN : null,
      stickers: a.stickers,
      images: a.images,
      videos: a.videos,
      gifs: a.gifs,
      documents: a.documents,
      generic: a.generic,
      links: a.links,
      deleted: a.deleted,
      edited: a.edited,
      avgLength: a.textCount ? a.lenSum / a.textCount : 0,
      medianResponseMs: median(a.gaps),
      responses: a.responseN,
      fastShare: a.responseN ? a.fast / a.responseN : null,
      signature: signatures.get(n) ?? null,
    };
  });

  let peakHour = 0;
  hourHist.forEach((v, h) => {
    if (v > hourHist[peakHour]) peakHour = h;
  });

  let busiest = { iso: '', count: 0 };
  for (const [iso, c] of [...dayCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (c > busiest.count) busiest = { iso, count: c };
  }

  const topEmojis = [...emojiCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([emoji, count]) => ({ emoji, count }));

  const topWords = [...wordTotal.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([key, count]) => {
      const forms = [...wordCount.get(key)!.entries()].sort((a, b) => b[1] - a[1]);
      return { word: forms[0][0], count };
    });

  const phrases: Phrase[] = discoverPhrases(win, names, {
    rel: mode.rel,
    excludeKeys: new Set(topWords.map((w) => stripAccents(w.word.toLowerCase()))),
  });

  // Mensajes por mes: los 12 meses calendario que terminan en el del último mensaje.
  const last = new Date(lastTs);
  const monthly: MonthBucket[] = [];
  for (let k = 11; k >= 0; k--) {
    const d = new Date(last.getFullYear(), last.getMonth() - k, 1);
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    const label = MONTHS[d.getMonth()];
    monthly.push({ key, label, initial: label[0].toUpperCase(), count: monthCounts.get(key) ?? 0 });
  }

  const sortedIdx = [...dayIdx].sort((a, b) => a - b);
  const streak = longestStreak(dayIdx);
  const totals: MediaTotals = {
    stickers: 0, images: 0, videos: 0, gifs: 0, documents: 0, audios: 0, generic: 0, links: 0, deleted: 0, edited: 0,
  };
  for (const p of people) {
    totals.stickers += p.stickers;
    totals.images += p.images;
    totals.videos += p.videos;
    totals.gifs += p.gifs;
    totals.documents += p.documents;
    totals.audios += p.audios;
    totals.generic += p.generic;
    totals.links += p.links;
    totals.deleted += p.deleted;
    totals.edited += p.edited;
  }

  const pairs: ReplyPair[] = [];
  for (let x = 0; x < names.length; x++) {
    for (let y = x + 1; y < names.length; y++) {
      const c = matrix[x][y] + matrix[y][x];
      if (c > 0) pairs.push({ a: names[x], b: names[y], count: c });
    }
  }
  pairs.sort((p, q) => q.count - p.count || p.a.localeCompare(q.a) || p.b.localeCompare(q.b));

  const topStickers: StickerStat[] = [];
  if (stickerIndex) {
    const ranking = [...stickerCounts.entries()].sort((a, b) => b[1].count - a[1].count);
    for (const [hash, e] of ranking) {
      const asset = stickerIndex.assets.get(hash);
      if (!asset) continue;
      const topSender = [...e.by.entries()].sort((a, b) => b[1] - a[1])[0][0];
      topStickers.push({ bytes: asset.bytes, mime: asset.mime, count: e.count, topSender });
      if (topStickers.length === 3) break;
    }
  }

  const candidates = buildAwardCandidates(names, acc, totalStarts, total, mode);
  const awards = selectAwards(candidates, mode, names);

  return {
    mode,
    groupName: duo ? '' : chatName?.trim() || fallbackGroupName(mode),
    participants,
    year: new Date(lastTs).getFullYear(),
    total,
    people,
    daysTalking: dayCounts.size,
    spanDays: sortedIdx.length ? sortedIdx[sortedIdx.length - 1] - sortedIdx[0] + 1 : 0,
    maxStreak: streak.days,
    streak: { days: streak.days, start: isoOfIndex(streak.startIdx), end: isoOfIndex(streak.endIdx) },
    silence: longestSilence(dayIdx),
    hourHist,
    peakHour,
    busiestDay: busiest,
    monthly,
    weekdays,
    topEmojis,
    topWords,
    jajaCount,
    mediaTotals: totals,
    replyMatrix: matrix,
    pairs: pairs.slice(0, 4),
    topStickers,
    awards,
    awardCandidates: candidates,
    time: timeStats,
    evolution,
    phrases,
    warnings,
  };
}

// ---------------------------------------------------------------- Premios

export interface AwardCandidate {
  id: string;
  title: string;
  winner: string;
  detail: string;
  /** Qué tan por encima de los demás está el ganador (valor / promedio de los demás). Por defecto 1. */
  notoriety?: number;
}

interface Winner {
  name: string;
  value: number;
  notoriety: number;
}

const NOTORIETY_CAP = 100;

/** valor del ganador / promedio de los demás (invertido si menor es mejor). */
function notorietyOf(value: number, others: number[], lowerIsBetter: boolean, smooth = 1e-9): number {
  if (others.length === 0) return 1;
  const mean = others.reduce((s, v) => s + v, 0) / others.length;
  // `smooth` (conteos): sin él, 2 saludos contra 0 de los demás daban notoriedad 100 y el
  // premio más pobre del chat terminaba en el lugar destacado.
  const r = lowerIsBetter ? (mean + smooth) / (value + smooth) : (value + smooth) / (mean + smooth);
  return Math.min(NOTORIETY_CAP, r);
}

/** Todos los premios con ganador y dato > 0, con su notoriedad (antes de elegir los 6). */
function buildAwardCandidates(
  names: string[],
  acc: Map<string, PersonAcc>,
  totalStarts: number,
  total: number,
  mode: Mode,
): AwardCandidate[] {
  const minMsgs = Math.max(10, Math.round(total * 0.02));
  const eligible = names.filter((n) => acc.get(n)!.count >= minMsgs);
  const pool = eligible.length ? eligible : names;
  const A = (n: string): PersonAcc => acc.get(n)!;

  /** Ganador real (el mejor dato). `lower`: gana el menor valor (que sea > 0 en `valid`). */
  const best = (
    from: string[],
    metric: (n: string) => number,
    lower = false,
    valid: (v: number) => boolean = (v) => v > 0,
    smooth = 1e-9,
  ): Winner | null => {
    let w: { name: string; value: number } | null = null;
    for (const n of from) {
      const v = metric(n);
      if (!valid(v)) continue;
      if (w === null || (lower ? v < w.value : v > w.value)) w = { name: n, value: v };
    }
    if (!w) return null;
    const others = from.filter((n) => n !== w!.name).map(metric);
    return { ...w, notoriety: notorietyOf(w.value, others, lower, smooth) };
  };

  /** Premios de conteo: exigen un mínimo absoluto y suavizan la notoriedad. */
  const minCount = Math.max(3, Math.round(total * 0.001));
  const bestCount = (from: string[], metric: (n: string) => number, min = minCount): Winner | null =>
    best(from, metric, false, (v) => v >= min, 5);

  const out: AwardCandidate[] = [];
  const add = (
    id: string,
    title: string,
    w: Winner | null,
    detail: (v: number, name: string) => string,
  ): void => {
    if (w) out.push({ id, title, winner: w.name, detail: detail(w.value, w.name), notoriety: w.notoriety });
  };

  add('intenso', 'El intenso', bestCount(names, (n) => A(n).maxRun, 3), (v) =>
    `${v} mensajes seguidos sin respuesta`,
  );

  const withResp = names.filter((n) => A(n).responseN > 0);
  const respPool = withResp.filter((n) => pool.includes(n));
  add(
    'fantasma',
    'El fantasma',
    best(respPool.length ? respPool : withResp, (n) => A(n).responseSum / A(n).responseN),
    (v) => `Responde en ${fmtResponse(v)}, en promedio`,
  );

  add('trasnochador', 'El trasnochador', bestCount(names, (n) => A(n).night), (v) =>
    `${fmtInt(v)} mensajes después de las 12`,
  );

  add(
    'jajajero',
    'El jajajero',
    // Premios de proporción: también exigen un mínimo absoluto (1 emoji o 2 mensajes cursis no son un premio).
    best(pool, (n) => (A(n).textCount && A(n).laughMsgs >= minCount ? A(n).laughMsgs / A(n).textCount : 0)),
    (v) => `Se ríe en ${ofEach(v)} mensajes`,
  );

  add('podcastero', 'El podcastero', bestCount(names, (n) => A(n).audios), (v) =>
    `${fmtInt(v)} ${v === 1 ? 'audio' : 'audios'} en el año`,
  );

  add('arranca', 'El que arranca', bestCount(names, (n) => A(n).starts), (v) =>
    `Empieza ${ofEach(totalStarts ? v / totalStarts : 0)} charlas`,
  );

  add('madrugador', 'El madrugador', bestCount(names, (n) => A(n).early), (v) =>
    `${fmtInt(v)} mensajes antes de las 9`,
  );

  add(
    'emojero',
    'El emojero',
    best(pool, (n) => (A(n).textCount && A(n).emojis >= Math.max(10, minCount) ? A(n).emojis / A(n).textCount : 0)),
    (_v, name) => `${fmtInt(A(name).emojis)} emojis en el año`,
  );

  add('stickerero', 'El stickerero', bestCount(names, (n) => A(n).stickers), (v) =>
    `${fmtInt(v)} ${v === 1 ? 'sticker' : 'stickers'} en el año`,
  );

  add('fotografo', 'El fotógrafo', bestCount(names, (n) => A(n).images + A(n).videos), (v) =>
    `${fmtInt(v)} fotos y videos`,
  );

  add('arrepentido', 'El arrepentido', bestCount(names, (n) => A(n).deleted + A(n).edited), (v) =>
    `${fmtInt(v)} mensajes borrados o editados`,
  );

  add(
    'testamento',
    'El testamento',
    best(pool, (n) => (A(n).textCount ? A(n).lenSum / A(n).textCount : 0), false, (v) => v >= 1),
    (v) => `Sus mensajes tienen ${fmtInt(v)} letras en promedio`,
  );

  const medianOf = (n: string): number => median(A(n).gaps) ?? 0;
  add(
    'rayo',
    'El rayo',
    best(
      pool.filter((n) => A(n).responseN >= 5),
      medianOf,
      true,
      (v) => v > 0,
    ),
    (v) => `Responde en ${fmtResponse(v)}`,
  );

  add('linkero', 'El linkero', bestCount(names, (n) => A(n).links), (v) =>
    `${fmtInt(v)} ${v === 1 ? 'link compartido' : 'links compartidos'}`,
  );

  // ---- Premios propios de cada modo (compiten solo en su modo, con +25 % de notoriedad)
  const OWN_BOOST = 1.25;
  const addOwn = (
    id: string,
    title: string,
    w: Winner | null,
    detail: (v: number, name: string) => string,
  ): void => {
    if (w) out.push({ id, title, winner: w.name, detail: detail(w.value, w.name), notoriety: w.notoriety * OWN_BOOST });
  };

  if (mode.rel === 'familia') {
    addOwn('buenosdias', 'El de los buenos días', bestCount(names, (n) => A(n).goodMorning, Math.max(5, minCount)), (v) =>
      `${fmtInt(v)} ${v === 1 ? 'saludo' : 'saludos'} de buenos días`,
    );
    addOwn('cadenas', 'El de las cadenas', bestCount(names, (n) => A(n).chains), (v) =>
      `${fmtInt(v)} ${v === 1 ? 'cadena o reenvío' : 'cadenas y reenvíos'} en el año`,
    );
    if (mode.size === 'group') {
      // Tono cariñoso: quien casi no escribe (< 3 % de los mensajes, pero al menos 1).
      const quiet = best(
        names,
        (n) => A(n).count,
        true,
        (v) => v >= 1 && total > 0 && v / total < 0.03,
      );
      if (quiet) quiet.notoriety = Math.min(quiet.notoriety, 3);
      addOwn('nolee', 'El que no lee el grupo', quiet, (v) =>
        `Escribió ${fmtInt(v)} ${v === 1 ? 'vez' : 'veces'} en todo el año. Igual lo queremos.`,
      );
    }
  }
  if (mode.rel === 'amigos') {
    addOwn('propone', 'El que propone y nunca va', bestCount(names, (n) => A(n).plans), (v) =>
      `Lanzó ${fmtInt(v)} ${v === 1 ? 'plan' : 'planes'} en el año`,
    );
    addOwn('chismoso', 'El chismoso', bestCount(names, (n) => A(n).gossip), (v) =>
      `${fmtInt(v)} mensajes de chisme`,
    );
  }
  if (mode.rel === 'pareja') {
    addOwn(
      'cursi',
      'El cursi',
      best(pool, (n) => (A(n).textCount && A(n).sweet >= Math.max(5, minCount) && A(n).sweet / A(n).textCount >= 0.02 ? A(n).sweet / A(n).textCount : 0)),
      (v) => `Se pone cursi en ${ofEach(v)} mensajes`,
    );
    addOwn('buenasnoches', 'El de las buenas noches', bestCount(names, (n) => A(n).goodNight, Math.max(5, minCount)), (v) =>
      `${fmtInt(v)} buenas noches en el año`,
    );
  }

  return out;
}

/**
 * Elige 6 premios. Primero ordena por notoriedad (más destacados primero) y luego aplica el reparto:
 * en pareja cada persona al menos 2 si se puede; en grupo prefiere ganadores distintos.
 */
export function selectAwards(candidates: AwardCandidate[], mode: Mode, names: string[]): Award[] {
  const sortedCands = candidates
    .map((c, i) => ({ c, i }))
    .sort((a, b) => (b.c.notoriety ?? 1) - (a.c.notoriety ?? 1) || a.i - b.i)
    .map((x) => x.c);
  const order = sortedCands.map((c) => c.id);
  let picked: AwardCandidate[];

  if (mode.size === 'duo') {
    picked = sortedCands.slice(0, 6);
    const wins = (n: string): number => picked.filter((c) => c.winner === n).length;
    for (let guard = 0; guard < 8; guard++) {
      const sorted = [...names].sort((a, b) => wins(a) - wins(b));
      const low = sorted[0];
      const high = sorted[sorted.length - 1];
      if (low === undefined || low === high || wins(low) >= 2 || wins(high) <= 2) break;
      const incoming = sortedCands.find((c) => !picked.includes(c) && c.winner === low);
      if (!incoming) break;
      const outgoing = [...picked].reverse().find((c) => c.winner === high);
      if (!outgoing) break;
      picked = picked.map((c) => (c === outgoing ? incoming : c));
    }
  } else {
    picked = [];
    const seen = new Set<string>();
    for (const c of sortedCands) {
      if (picked.length >= 6) break;
      if (!seen.has(c.winner)) {
        picked.push(c);
        seen.add(c.winner);
      }
    }
    for (const c of sortedCands) {
      if (picked.length >= 6) break;
      if (!picked.includes(c)) picked.push(c);
    }
  }
  return picked
    .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
    .map((c) => ({ id: c.id, title: c.title, detail: c.detail, winner: c.winner }));
}

// ---------------------------------------------------------------- Ocultar nombres

/** "Juana" -> "J."; si chocan, "Persona 1", "Persona 2"… */
export function anonymizeNames(names: string[]): Map<string, string> {
  const initials = names.map((n) => {
    const ch = Array.from(n.trim().replace(/^[^\p{L}\p{N}]+/u, ''))[0];
    return ch ? ch.toUpperCase() + '.' : '?.';
  });
  const clash = new Set(initials).size !== initials.length;
  const map = new Map<string, string>();
  names.forEach((n, i) => map.set(n, clash ? `Persona ${i + 1}` : initials[i]));
  return map;
}

export function hideNames(data: WrappedData): WrappedData {
  const map = anonymizeNames(data.people.map((p) => p.name));
  const f = (n: string): string => map.get(n) ?? n;
  return {
    ...data,
    groupName: data.mode.size === 'duo' ? '' : fallbackGroupName(data.mode),
    people: data.people.map((p) => ({ ...p, name: f(p.name) })),
    pairs: data.pairs.map((p) => ({ ...p, a: f(p.a), b: f(p.b) })),
    topStickers: data.topStickers.map((s) => ({ ...s, topSender: f(s.topSender) })),
    awards: data.awards.map((a) => ({ ...a, winner: f(a.winner) })),
    phrases: data.phrases.map((p) => ({ ...p, byPerson: p.byPerson.map((b) => ({ ...b, name: f(b.name) })) })),
  };
}
