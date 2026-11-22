import { buildWrapped, readChat } from './process';
import type { ChatContext } from './process';
import type { WorkerProgress, WorkerRequest, WorkerResponse } from './types';

interface WorkerScope {
  onmessage: ((e: MessageEvent<WorkerRequest>) => void) | null;
  postMessage(message: WorkerResponse | WorkerProgress, transfer?: Transferable[]): void;
}

const scope = self as unknown as WorkerScope;

/** Último chat leído, para recalcular con otro modo sin volver a leer el archivo. */
let last: ChatContext | null = null;

function reply(res: WorkerResponse): void {
  if (!res.ok) {
    scope.postMessage(res);
    return;
  }
  // Se transfieren copias de los bytes de los stickers: los originales se quedan en el worker
  // por si hay que recalcular.
  const topStickers = res.data.topStickers.map((s) => ({ ...s, bytes: s.bytes.slice() }));
  scope.postMessage(
    { ok: true, data: { ...res.data, topStickers } },
    topStickers.map((s) => s.bytes.buffer as ArrayBuffer),
  );
}

scope.onmessage = async (e) => {
  const req = e.data;
  if ('recompute' in req) {
    reply(last ? buildWrapped(last, req.mode) : { ok: false, code: 'other', error: 'No pudimos recalcular el chat.' });
    return;
  }
  const read = await readChat(req, (p) => scope.postMessage(p));
  if (!read.ok) {
    scope.postMessage(read);
    return;
  }
  last = read.ctx;
  reply(buildWrapped(read.ctx, req.mode));
};
