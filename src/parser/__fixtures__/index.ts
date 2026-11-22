/**
 * Fixtures de exports de WhatsApp. Se escriben con escapes para conservar los
 * caracteres invisibles reales: ‎ (marca LTR) y   (espacio fino antes de "p. m.").
 */

/** iOS, 12 h es-CO, con marcas invisibles, multilínea, sistema, audio, imagen y mensaje eliminado. */
export const IOS_12H_ES = [
  '‎[14/02/25, 10:58:00 p. m.] Juana: ‎Los mensajes y las llamadas están cifrados de extremo a extremo. Nadie fuera de este chat puede leerlos.',
  '[14/02/25, 11:03:45 p. m.] Juana: Hola amor ❤️ 😂',
  '[14/02/25, 11:04:10 p. m.] Camilo: jajaja qué bobo',
  'te quiero mucho',
  'y más',
  '‎[14/02/25, 11:05:00 p. m.] Juana: ‎<adjunto: 00000012-AUDIO-2025-02-14-23-05-00.opus>',
  '‎[14/02/25, 11:06:00 p. m.] Camilo: ‎imagen omitida',
  '[15/02/25, 12:00:00 a. m.] Juana: Se eliminó este mensaje',
  '[15/02/25, 12:30:00 p. m.] Camilo: Almuerzo? https://ejemplo.com/x',
  '[15/02/25, 12:31:00 p. m.] Juana: Camilo se unió usando el enlace de invitación',
  '[15/02/25, 12:32:00 p. m.] Juana: dale parce',
  '',
].join('\n');

/** iOS con año de 4 dígitos y 24 h. */
export const IOS_24H = [
  '[14/02/2025, 23:03:45] Juana: hola',
  '[15/02/2025, 07:10:00] Camilo: buenos días',
  '',
].join('\n');

/** Android, 24 h, mes sin cero a la izquierda, sistema, multimedia y audio. */
export const ANDROID_24H = [
  '14/2/2025, 22:00 - Los mensajes y las llamadas están cifrados de extremo a extremo. Nadie fuera de este chat puede leerlos.',
  '14/2/2025, 22:01 - Juana creó el grupo "Pareja: 2025"',
  '14/2/2025, 23:03 - Juana: hola',
  '14/2/2025, 23:04 - Camilo: <Multimedia omitido>',
  '14/2/2025, 23:05 - Camilo: PTT-20250214-WA0002.opus (archivo adjunto)',
  '15/2/2025, 00:15 - Juana: Eliminaste este mensaje',
  '15/2/2025, 08:00 - Camilo: buenos días',
  'amor',
  '',
].join('\n');

/** Android, 12 h es-CO ("p. m." con espacio fino) y mediodía/medianoche. */
export const ANDROID_12H = [
  '14/02/2025, 11:03 p. m. - Juana: hola',
  '15/02/2025, 12:05 a. m. - Camilo: ya dormiste?',
  '15/02/2025, 12:30 p. m. - Juana: almorzando',
  '15/02/2025, 1:15 p. m. - Camilo: yo también',
  '',
].join('\n');

/** Android con teléfono en inglés: AM/PM y orden mes/día (algún segundo componente > 12). */
export const ANDROID_12H_EN_MDY = [
  '2/14/25, 11:03 PM - Juana: hola',
  '2/15/25, 12:05 AM - Camilo: still awake?',
  '3/1/25, 12:30 PM - Juana: lunch',
  '',
].join('\n');

/** Grupo de 4 personas (Android 24 h). */
export const GROUP_4 = [
  '1/3/2025, 20:00 - Ana: quién va hoy',
  '1/3/2025, 20:01 - Beto: yo parce',
  '1/3/2025, 20:02 - Carla: yo también 😂',
  '1/3/2025, 20:03 - Dani: yo no puedo',
  '1/3/2025, 20:05 - Ana: jajaja dale',
  '2/3/2025, 09:00 - Beto: buenos días parche',
  '2/3/2025, 09:05 - Ana: buenas',
  '2/3/2025, 09:06 - Carla: PTT-20250302-WA0001.opus (archivo adjunto)',
  '3/3/2025, 22:30 - Dani: ahorita llego',
  '3/3/2025, 22:31 - Dani: ahorita ahorita',
  '3/3/2025, 22:32 - Dani: ahorita',
  '',
].join('\n');

/** iOS, grupo: avisos del sistema con forma de mensaje (texto empieza con U+200E). */
export const IOS_GROUP_SYSTEM = [
  '[19/09/26, 2:57:44 p. m.] Los Panas: ‎Creaste el grupo "Los Panas".',
  '[19/09/26, 2:58:00 p. m.] Ana Ruiz: ‎Larry añadió a Ana Ruiz.',
  '[19/09/26, 2:59:00 p. m.] Larry: ‎Cambiaste los ajustes de este grupo para permitir que todos los miembros puedan añadir a otras personas.',
  '[19/09/26, 3:00:00 p. m.] Larry: ‎‎Larry activó los mensajes temporales.',
  '[19/09/26, 3:01:00 p. m.] Larry: quiubo pues',
  '[19/09/26, 3:02:00 p. m.] Ana Ruiz: ‎imagen omitida',
  '[19/09/26, 3:03:00 p. m.] Ana Ruiz: ‎audio omitido',
  '[19/09/26, 3:04:00 p. m.] Larry: ‎Se eliminó este mensaje.',
  '',
].join('\n');
