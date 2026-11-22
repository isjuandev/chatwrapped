import { chatNameFromFile, parseChat } from './parser';
import { fileKey, isZipBlob, openChatZip, ZipNoTxtError, ZipTooBigError } from './parser/zip';
import type { ZipChat } from './parser/zip';
import { computeWrapped, EmptyChatError, windowMessages } from './metrics';
import type { Message, Mode, ReadRequest, StickerIndex, WorkerProgress, WorkerResponse } from './types';

/** Lo que queda de leer el archivo: sirve para recalcular con otro modo sin volver a leerlo. */
export interface ChatContext {
  messages: Message[];
  name: string | null;
  stickers: StickerIndex | null;
}

export type ReadResult = { ok: true; ctx: ChatContext } | { ok: false; error: string; code: Extract<WorkerResponse, { ok: false }>['code'] };

/** Calcula los datos del Wrapped para un modo a partir del chat ya leído. Nunca toca la red. */
export function buildWrapped(ctx: ChatContext, mode: Mode): WorkerResponse {
  try {
    return { ok: true, data: computeWrapped(ctx.messages, mode, ctx.name, ctx.stickers) };
  } catch (e) {
    if (e instanceof EmptyChatError) {
      return { ok: false, code: 'empty', error: 'Ese chat no tiene mensajes para contar.' };
    }
    return { ok: false, code: 'other', error: 'No pudimos leer ese archivo. Intenta de nuevo con el .txt o .zip exportado.' };
  }
}

/** Lee y parsea el archivo (y los stickers del .zip). */
export async function readChat(req: ReadRequest, onProgress?: (p: WorkerProgress) => void): Promise<ReadResult> {
  let zip: ZipChat | null = null;
  try {
    let text = req.text ?? '';
    let innerName = '';
    const blob: Blob | undefined = req.file ?? (req.bytes ? new Blob([req.bytes]) : undefined);
    if (blob) {
      if (await isZipBlob(blob, req.fileName)) {
        zip = await openChatZip(blob);
        text = zip.text;
        innerName = zip.name;
      } else {
        text = new TextDecoder('utf-8').decode(await blob.arrayBuffer());
      }
    }
    text = text.replace(/^﻿/, '');
    const messages = parseChat(text);
    if (messages.length === 0) {
      const looksLikeChat = /\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4}/.test(text.slice(0, 2000));
      return {
        ok: false,
        code: looksLikeChat ? 'empty' : 'unrecognized',
        error: looksLikeChat
          ? 'Ese chat está vacío en el último año. Prueba con otro.'
          : 'No reconocimos ese archivo como un chat de WhatsApp. Asegúrate de exportarlo desde WhatsApp (.txt o .zip).',
      };
    }

    // Stickers reales: solo los referenciados en el chat (más recientes primero), solo .webp de sticker.
    let stickers: StickerIndex | null = null;
    if (zip) {
      const wanted: string[] = [];
      const seen = new Set<string>();
      const inWindow = windowMessages(messages);
      for (let i = inWindow.length - 1; i >= 0; i--) {
        const m = inWindow[i];
        if (m.type !== 'sticker' || !m.file) continue;
        const key = fileKey(m.file);
        if (!seen.has(key)) {
          seen.add(key);
          wanted.push(key);
        }
      }
      if (wanted.length > 0) {
        onProgress?.({ progress: 'stickers' });
        stickers = await zip.extractStickers(wanted);
      }
    }

    const name = chatNameFromFile(req.fileName) ?? chatNameFromFile(innerName);
    return { ok: true, ctx: { messages, name, stickers } };
  } catch (e) {
    if (e instanceof ZipNoTxtError) {
      return { ok: false, code: 'zip_no_txt', error: 'Ese .zip no trae ningún archivo .txt. Expórtalo de nuevo «Sin archivos».' };
    }
    if (e instanceof ZipTooBigError) {
      return {
        ok: false,
        code: 'zip_too_big',
        error: 'Ese .zip es demasiado pesado (más de 1,5 GB). Expórtalo de nuevo «Sin archivos» y súbelo.',
      };
    }
    return { ok: false, code: 'other', error: 'No pudimos leer ese archivo. Intenta de nuevo con el .txt o .zip exportado.' };
  } finally {
    await zip?.close().catch(() => undefined);
  }
}

/** Lógica pura del worker (se puede probar sin Worker): leer + calcular. */
export async function processChat(
  req: ReadRequest,
  onProgress?: (p: WorkerProgress) => void,
): Promise<WorkerResponse> {
  const read = await readChat(req, onProgress);
  if (!read.ok) return read;
  return buildWrapped(read.ctx, req.mode);
}
