import { BlobReader, configure, TextWriter, Uint8ArrayWriter, ZipReader } from '@zip.js/zip.js';
import type { Entry, FileEntry } from '@zip.js/zip.js';
import type { StickerAsset, StickerIndex } from '../types';

// Sin workers anidados: el código ya corre dentro del Web Worker de la app (y en los tests).
configure({ useWebWorkers: false });

export class ZipNoTxtError extends Error {}
export class ZipTooBigError extends Error {}

/** Zips de más de 1,5 GB: se pide exportar «Sin archivos». */
export const MAX_ZIP_BYTES = 1.5 * 1024 * 1024 * 1024;
export const MAX_STICKERS = 400;
export const MAX_STICKER_BYTES = 60 * 1024 * 1024;

const STICKER_RE = /(^|\/)([^/]*STICKER[^/]*|STK-[^/]*)\.webp$/i;

/** Nombre de archivo sin carpeta y en minúsculas, la clave que une chat y zip. */
export function fileKey(name: string): string {
  return name.replace(/^.*[\\/]/, '').trim().toLowerCase();
}

export interface ZipChat {
  name: string;
  text: string;
  /**
   * Descomprime SOLO los stickers pedidos (nunca fotos, videos ni audios), en el orden dado,
   * hasta 400 archivos y 60 MB acumulados. Archivos que no estén en el zip se ignoran.
   */
  extractStickers(wanted: string[]): Promise<StickerIndex>;
  close(): Promise<void>;
}

function sniffMime(b: Uint8Array): string {
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8) return 'image/jpeg';
  if (b.length > 3 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'image/gif';
  return 'image/webp';
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes); // BufferSource estricto (ArrayBuffer, no Shared)
  const digest = await crypto.subtle.digest('SHA-256', copy);
  return Array.from(new Uint8Array(digest), (x) => x.toString(16).padStart(2, '0')).join('');
}

/** Abre el .zip con acceso aleatorio (no lo carga entero en memoria) y lee el .txt. */
export async function openChatZip(blob: Blob): Promise<ZipChat> {
  if (blob.size > MAX_ZIP_BYTES) throw new ZipTooBigError('Zip demasiado grande');
  const reader = new ZipReader(new BlobReader(blob));
  try {
    const entries = (await reader.getEntries()).filter((e): e is FileEntry => !e.directory);
    const txts = entries.filter((f) => /\.txt$/i.test(f.filename) && !f.filename.startsWith('__MACOSX/'));
    if (txts.length === 0) throw new ZipNoTxtError('El zip no tiene ningún .txt');
    const pick =
      txts.find((f) => /(^|\/)_chat\.txt$/i.test(f.filename)) ??
      txts.find((f) => /whatsapp|chat/i.test(f.filename)) ??
      txts[0];
    const text = await pick.getData(new TextWriter());

    const stickerEntries = new Map<string, FileEntry>();
    for (const e of entries) {
      if (STICKER_RE.test(e.filename) && !e.filename.startsWith('__MACOSX/')) {
        stickerEntries.set(fileKey(e.filename), e);
      }
    }

    return {
      name: pick.filename,
      text,
      async extractStickers(wanted) {
        const byFile = new Map<string, string>();
        const assets = new Map<string, StickerAsset>();
        let total = 0;
        let n = 0;
        for (const key of wanted) {
          if (n >= MAX_STICKERS) break;
          const entry: Entry | undefined = stickerEntries.get(key);
          if (!entry || entry.directory) continue;
          if (total + entry.uncompressedSize > MAX_STICKER_BYTES) continue;
          try {
            const bytes = await entry.getData(new Uint8ArrayWriter());
            total += bytes.length;
            n++;
            const hash = await sha256Hex(bytes);
            byFile.set(key, hash);
            if (!assets.has(hash)) assets.set(hash, { hash, bytes, mime: sniffMime(bytes) });
          } catch {
            /* sticker corrupto: se omite */
          }
        }
        return { byFile, assets };
      },
      close: () => reader.close(),
    };
  } catch (e) {
    await reader.close().catch(() => undefined);
    throw e;
  }
}

export async function isZipBlob(blob: Blob, fileName: string): Promise<boolean> {
  const head = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
  const magic = head.length > 3 && head[0] === 0x50 && head[1] === 0x4b && (head[2] === 3 || head[2] === 5);
  return magic || /\.zip$/i.test(fileName);
}
