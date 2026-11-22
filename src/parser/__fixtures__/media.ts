/** Fixtures de multimedia (fase 2). Los U+200E reales van con escape. */
const LRM = '‎';

/** iOS «Sin archivos»: marcas «… omitido». */
export const IOS_SIN_ARCHIVOS = [
  `[10/03/26, 9:00:00 a. m.] Ana: ${LRM}sticker omitido`,
  `[10/03/26, 9:01:00 a. m.] Beto: ${LRM}imagen omitida`,
  `[10/03/26, 9:02:00 a. m.] Ana: ${LRM}video omitido`,
  `[10/03/26, 9:03:00 a. m.] Beto: ${LRM}GIF omitido`,
  `[10/03/26, 9:04:00 a. m.] Ana: ${LRM}audio omitido`,
  `[10/03/26, 9:05:00 a. m.] Beto: ${LRM}documento omitido`,
  `[10/03/26, 9:06:00 a. m.] Ana: ${LRM}informe.pdf • 3 páginas ${LRM}documento omitido`,
  `[10/03/26, 9:07:00 a. m.] Beto: ${LRM}Tarjeta de contacto omitida`,
  `[10/03/26, 9:08:00 a. m.] Ana: mira esto https://ejemplo.com/a`,
  '',
].join('\n');

/** Android «Sin archivos»: todo es <Multimedia omitido>. */
export const ANDROID_SIN_ARCHIVOS = [
  '10/3/2026, 09:00 - Ana: <Multimedia omitido>',
  '10/3/2026, 09:01 - Beto: <Multimedia omitido>',
  '10/3/2026, 09:02 - Ana: hola www.ejemplo.com',
  '10/3/2026, 09:03 - Beto: <Media omitted>',
  '',
].join('\n');

/** iOS con archivos: adjuntos, editado, ubicación, encuesta, visualización única. */
export const IOS_CON_ARCHIVOS = [
  `[21/09/26, 9:03:12 p. m.] Ana: ${LRM}<adjunto: 00000034-STICKER-2026-09-21-21-03-12.webp>`,
  `[21/09/26, 9:04:00 p. m.] Beto: ${LRM}<adjunto: 00000035-PHOTO-2026-09-21-21-04-00.jpg>`,
  'mira qué foto',
  `[21/09/26, 9:05:00 p. m.] Ana: ${LRM}<adjunto: 00000036-VIDEO-2026-09-21-21-05-00.mp4>`,
  `[21/09/26, 9:06:00 p. m.] Beto: ${LRM}<adjunto: 00000037-GIF-2026-09-21-21-06-00.mp4>`,
  `[21/09/26, 9:07:00 p. m.] Ana: ${LRM}<adjunto: 00000038-AUDIO-2026-09-21-21-07-00.opus>`,
  `[21/09/26, 9:08:00 p. m.] Beto: hola ${LRM}<Se editó este mensaje.>`,
  `[21/09/26, 9:09:00 p. m.] Ana: ${LRM}ubicación: https://maps.google.com/?q=4.6,-74.0`,
  '[21/09/26, 9:10:00 p. m.] Beto: ENCUESTA:',
  'OPCIÓN: Sí (2 votos)',
  `[21/09/26, 9:11:00 p. m.] Ana: ${LRM}visualización única omitida`,
  `[21/09/26, 9:12:00 p. m.] Beto: ${LRM}<adjunto: 00000039-STICKER-2026-09-21-21-12-00.webp>`,
  '',
].join('\n');

/** Android con archivos: STK-…webp (archivo adjunto), IMG, VID, PTT, DOC; inglés al final. */
export const ANDROID_CON_ARCHIVOS = [
  '21/9/2026, 21:03 - Ana: STK-20260921-WA0003.webp (archivo adjunto)',
  '21/9/2026, 21:04 - Beto: IMG-20260921-WA0004.jpg (archivo adjunto)',
  'con pie de foto',
  '21/9/2026, 21:05 - Ana: VID-20260921-WA0005.mp4 (archivo adjunto)',
  '21/9/2026, 21:06 - Beto: PTT-20260921-WA0006.opus (archivo adjunto)',
  '21/9/2026, 21:07 - Ana: Informe final.pdf (archivo adjunto)',
  '21/9/2026, 21:08 - Beto: <attached: 00000010-STICKER-2026-09-21-21-08-00.webp>',
  '21/9/2026, 21:09 - Ana: IMG-20260921-WA0009.jpg (file attached)',
  '21/9/2026, 21:10 - Beto: Location: https://maps.google.com/?q=1,2',
  '21/9/2026, 21:11 - Ana: POLL:',
  '21/9/2026, 21:12 - Beto: ayer <This message was edited>',
  '',
].join('\n');
