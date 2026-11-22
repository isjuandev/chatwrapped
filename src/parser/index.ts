import type { Message, MessageType } from '../types';

/** Caracteres invisibles/espacios raros que WhatsApp mete en el export. */
const INVISIBLE = /[\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g;
const WEIRD_SPACES = /[\u00a0\u202f\u2009\u2007]/g;

const TIME = String.raw`(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([ap]\s?\.?\s?m\.?)?`;
const DATE = String.raw`(\d{1,2})[\/.](\d{1,2})[\/.](\d{2,4})`;
/** iOS: [14/02/25, 11:03:45 p. m.] Juana: hola */
const IOS_RE = new RegExp(String.raw`^\[${DATE},?\s+${TIME}\]\s?(.*)$`, 'i');
/** Android: 14/02/25, 11:03 p. m. - Juana: hola */
const ANDROID_RE = new RegExp(String.raw`^${DATE},?\s+${TIME}\s?[-–]\s(.*)$`, 'i');

const SYSTEM_AUTHOR =
  /(\bse unió\b|\bsalió\b|\bañadió\b|\beliminó a\b|\bcambió\b|\bcreó el grupo\b|\bte añadió\b|\bahora eres\b|\bse cambió\b|\bsaliste\b|\bañadiste\b|\bcreaste\b|\bcambiaste\b|\bjoined\b|\bleft\b|\badded\b|\bremoved\b|\bchanged\b|\bcreated group\b|\bsecurity code\b)/i;
const SYSTEM_TEXT =
  /(cifrad[oa]s? de extremo a extremo|end-to-end encrypted|se unió usando|joined using this group)/i;

const DELETED_RE =
  /^(se eliminó este mensaje|eliminaste este mensaje|this message was deleted|you deleted this message)\.?$/i;
const EDITED_RE = /\s*<\s*(se editó este mensaje\.?|this message was edited\.?)\s*>\s*/gi;
const URL_RE = /(https?:\/\/|www\.)\S+/i;

/** Marca de adjunto: «<adjunto: x.webp>», «<attached: x>», «x.jpg (archivo adjunto)», «x (file attached)». */
const ATTACH_IOS_RE = /<\s*(?:adjunto|attached)\s*:\s*([^>]+?)\s*>/i;
const ATTACH_ANDROID_RE = /(?:^|\n)\s*(.+?)\s*\((?:archivo adjunto|file attached)\)/i;

/** «sticker omitido», «imagen omitida», «<archivo>.pdf • 3 páginas documento omitido»… */
const OMITTED: [RegExp, MessageType][] = [
  [/^(?:.*\s)?sticker\s+(?:omitido|omitted)\.?$/i, 'sticker'],
  [/^(?:.*\s)?(?:imagen|foto|image|photo)\s+(?:omitid[ao]|omitted)\.?$/i, 'image'],
  [/^(?:.*\s)?gif\s+(?:omitido|omitted)\.?$/i, 'gif'],
  [/^(?:.*\s)?v[ií]deo\s+(?:omitido|omitted)\.?$/i, 'video'],
  [/^(?:.*\s)?(?:audio|mensaje de voz|voice message)\s+(?:omitido|omitted)\.?$/i, 'audio'],
  [/^(?:.*\s)?(?:documento|document)\s+(?:omitido|omitted)\.?$/i, 'document'],
  [/^(?:tarjeta de contacto|contact card)\s+(?:omitida|omitted)\.?$/i, 'contact'],
  [/^(?:ubicaci[oó]n|location)\s+(?:omitida|omitted)\.?$/i, 'location'],
  [/^<\s*(?:multimedia omitido|media omitted)\s*>$/i, 'media'],
];

export function typeFromFileName(name: string): MessageType {
  const n = name.trim();
  if (/(^|[\s/-])STK-\d|-STICKER-|sticker/i.test(n) || /\.webp$/i.test(n)) return 'sticker';
  if (/-GIF-/i.test(n) || /\.gif$/i.test(n)) return 'gif';
  if (/(^|[\s/-])PTT-\d|(^|[\s/-])AUD-\d|-AUDIO-|\.(opus|ogg|oga|m4a|aac|amr|mp3|wav)$/i.test(n)) return 'audio';
  if (/(^|[\s/-])IMG-\d|-PHOTO-|\.(jpe?g|png|heic|heif|bmp)$/i.test(n)) return 'image';
  if (/(^|[\s/-])VID-\d|-VIDEO-|\.(mp4|mov|3gp|mkv|avi|webm)$/i.test(n)) return 'video';
  if (/\.vcf$/i.test(n)) return 'contact';
  if (/(^|[\s/-])DOC-\d|\.(pdf|docx?|xlsx?|pptx?|txt|zip|rar|csv|apk)$/i.test(n)) return 'document';
  return 'media';
}

export interface Classified {
  type: MessageType;
  /** Texto sin el sufijo de «editado». */
  text: string;
  edited: boolean;
  link: boolean;
  file?: string;
}

export function classifyMessage(raw: string): Classified {
  let text = raw.trim();
  const edited = EDITED_RE.test(text);
  EDITED_RE.lastIndex = 0;
  if (edited) text = text.replace(EDITED_RE, ' ').trim();
  const done = (type: MessageType, file?: string): Classified => ({
    type,
    text,
    edited,
    link: type === 'text' && URL_RE.test(text),
    file,
  });

  if (DELETED_RE.test(text)) return done('deleted');

  const ios = ATTACH_IOS_RE.exec(text);
  if (ios) return done(typeFromFileName(ios[1]), ios[1].trim());
  const andr = ATTACH_ANDROID_RE.exec(text);
  if (andr) return done(typeFromFileName(andr[1]), andr[1].trim());

  const first = text.split('\n')[0].trim();
  for (const [re, type] of OMITTED) if (re.test(first)) return done(type);

  if (/^(ubicaci[oó]n|location)\s*:\s*https?:\/\//i.test(first)) return done('location');
  if (/^(encuesta|poll)\s*:/i.test(first)) return done('poll');
  if (text.length < 80 && /(visualizaci[oó]n [uú]nica|view once)/i.test(text)) return done('viewonce');
  return done('text');
}

export function classify(text: string): MessageType {
  return classifyMessage(text).type;
}

interface Raw {
  a: number;
  b: number;
  y: number;
  hh: number;
  mm: number;
  ss: number;
  ampm: string | undefined;
  author: string;
  text: string;
  skip: boolean;
}

function cleanLine(line: string): string {
  return line.replace(INVISIBLE, '').replace(WEIRD_SPACES, ' ').replace(/\r$/, '');
}

function splitAuthor(rest: string): { author: string; text: string } | null {
  const idx = rest.indexOf(': ');
  if (idx <= 0) return null;
  const author = rest.slice(0, idx).trim();
  const text = rest.slice(idx + 2);
  if (!author || author.length > 80) return null;
  if (SYSTEM_AUTHOR.test(author) || author.includes('"')) return null;
  if (SYSTEM_TEXT.test(text)) return null;
  return { author, text };
}

/** Año de 2 dígitos -> 20xx */
function fullYear(y: number): number {
  return y < 100 ? 2000 + y : y;
}

function to24(hh: number, ampm: string | undefined): number {
  if (!ampm) return hh;
  const isPm = ampm.toLowerCase().startsWith('p');
  if (isPm) return hh === 12 ? 12 : hh + 12;
  return hh === 12 ? 0 : hh;
}

/**
 * Parsea el texto de un export de WhatsApp (iOS o Android).
 * Orden día/mes: d/m por defecto (es-CO); si algún primer componente > 12 es d/m,
 * si algún segundo componente > 12 es m/d.
 */
export function parseChat(input: string): Message[] {
  const lines = input.split('\n');
  const raws: Raw[] = [];
  let current: Raw | null = null;

  for (const original of lines) {
    const line = cleanLine(original);
    const m = IOS_RE.exec(line) ?? ANDROID_RE.exec(line);
    if (m) {
      const rest = m[8] ?? '';
      let split = splitAuthor(rest);
      // iOS escribe los avisos del sistema como mensajes ("Grupo: ‎Cambiaste los ajustes…",
      // "Ana: ‎Larry añadió a Ana."): el texto empieza con U+200E. La multimedia y los
      // mensajes eliminados también lo traen, así que solo se descarta si es texto.
      if (split && original.includes(`${split.author}: ‎`) && classify(split.text) === 'text') {
        split = null;
      }
      const raw: Raw = {
        a: +m[1],
        b: +m[2],
        y: fullYear(+m[3]),
        hh: +m[4],
        mm: +m[5],
        ss: m[6] ? +m[6] : 0,
        ampm: m[7]?.replace(/[\s.]/g, ''),
        author: split?.author ?? '',
        text: split?.text ?? '',
        skip: !split,
      };
      raws.push(raw);
      current = raw;
    } else if (current && !current.skip) {
      current.text += '\n' + line;
    }
  }

  const all = raws;
  let dmy = true;
  if (all.some((r) => r.a > 12)) dmy = true;
  else if (all.some((r) => r.b > 12)) dmy = false;

  const out: Message[] = [];
  for (const r of all) {
    if (r.skip) continue;
    const day = dmy ? r.a : r.b;
    const month = dmy ? r.b : r.a;
    if (month < 1 || month > 12 || day < 1 || day > 31) continue;
    const ts = new Date(r.y, month - 1, day, to24(r.hh, r.ampm), r.mm, r.ss).getTime();
    if (Number.isNaN(ts)) continue;
    const c = classifyMessage(r.text);
    const msg: Message = { ts, author: r.author, text: c.text, type: c.type, edited: c.edited, link: c.link };
    if (c.file) msg.file = c.file;
    out.push(msg);
  }
  out.sort((x, y) => x.ts - y.ts);
  return out;
}

/** Nombre del grupo a partir del nombre del archivo ("Chat de WhatsApp con X.txt"). */
export function chatNameFromFile(fileName: string): string | null {
  const base = fileName.replace(/^.*[\/]/, '').replace(/\.(txt|zip)$/i, '').trim();
  const patterns = [
    /^chat de whatsapp con\s+(.+)$/i,
    /^whatsapp chat with\s+(.+)$/i,
    /^whatsapp chat\s*-\s*(.+)$/i,
    /^chat de whatsapp\s*-\s*(.+)$/i,
  ];
  for (const p of patterns) {
    const m = p.exec(base);
    if (m) return m[1].trim();
  }
  return null;
}
