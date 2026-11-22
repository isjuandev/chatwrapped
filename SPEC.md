# Chat Wrapped — especificación del MVP

Fuente de verdad visual: `design-ref/p1.png … p10.png` (renders del PDF "Chat Wrapped — Diseños.pdf").
Fuente de verdad de flujo: `Chat Wrapped — Flujo del proyecto.png`.

Lema: **"El chat nunca sale del celular; las tarjetas sí."** Cero backend con mensajes. Todo en el navegador.

## Stack
- Vite + React 18 + TypeScript (strict). Sin router: máquina de estados simple en `App.tsx`.
- CSS plano con variables (o CSS modules). Sin Tailwind.
- `jszip` para .zip. Web Worker (`new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })`) para parseo + métricas.
- Fuentes **autoalojadas** con `@fontsource` (nada de Google Fonts: privacidad). Títulos: `Inter Tight` 800 (tracking negativo, ~-0.04em). Cuerpo: `Inter` 400/500/600/700.
- `vitest` para tests de parser y métricas.
- Mobile‑first (diseño a 390px de ancho); en desktop centrar una columna de máx. ~440px.
- Idioma: español de Colombia (es-CO). Números con punto de miles (`18.432`), horas "11 p. m.", "12 m." (mediodía), "12 a. m.".

## Paleta (tokens)
```
--bg:       #16131C   fondo oscuro
--surface:  #221E2C   tarjetas/inputs sobre fondo oscuro
--lime:     #CBF23F   acento principal (CTA, resaltados)
--coral:    #FF7350   acento secundario
--cream:    #F4F1EA   claro / texto sobre oscuro
--ink:      #16131C   texto sobre fondos claros
--muted:    #A9A4B5   texto secundario sobre oscuro
```
Radios grandes: botones pill (999px), tarjetas 20–28px. Burbujas de chat estilo mensaje (crema, lima, coral).

## Pantallas (app)
1. **Portada** (p1): logo "chat wrapped" + pill "2026" (contorno lima). Tres burbujas ("¿quién escribe más?" crema izq., "obvio tú" lima der., "jajaja ya veremos" coral izq.). Título "Tu año en el chat, hecho **tarjetas** para historias." (tarjetas en lima). Subtítulo. Caja de privacidad con candado: "**Tu chat nunca sale de tu celular.** Todo se calcula en tu navegador; no guardamos nada." CTA lima "Hacer mi Chat Wrapped". Link lima subrayado "¿Cómo exporto el chat?".
2. **Modo + subir** (p2): botón atrás circular, "Paso 1 de 2". "¿Con quién es el chat?" Radios‑tarjeta: Pareja (Dos personas, premios repartidos) / Parche (Grupo de amigos) / Familia (El grupo de la familia). Seleccionada = fondo lima, texto ink. Zona de subida punteada (click + drag&drop), ícono subir lima, "Sube el chat exportado", "Archivo .txt o .zip". Link guía. Nota: "El archivo se lee en tu celular. No se sube a ningún servidor."
   - Al subir: estado de carga ("Leyendo tu chat…" — Paso 2 de 2) mientras el worker trabaja. Errores amables (archivo no reconocido, chat vacío, zip sin .txt).
   - Si modo = Pareja pero hay >2 participantes, o modo grupo con 2: avisar y continuar igual (usar el modo elegido, pero pareja requiere exactamente los 2 con más mensajes).
3. **Guía de exportación** (p3): atrás, "Toma menos de un minuto", "Exporta el chat en 4 pasos", segmented control Android/iPhone (por defecto según userAgent), 4 pasos numerados con círculo lima. Pasos iPhone: 1 Abre el chat. 2 Toca el nombre del chat arriba. 3 Baja y toca Exportar chat, escoge Sin archivos. 4 Guárdalo en Archivos y súbelo aquí. Nota "Escoge siempre **Sin archivos**: es más liviano y no necesitamos tus fotos." CTA "Ya lo tengo, subirlo" → pantalla 2.
4. **Visor de tarjetas** (p4): barras de progreso tipo historias arriba (6 segmentos), "Tarjeta N de 6", botón cerrar (X circular). Tarjeta 9:16 renderizada al centro (vista previa del mismo canvas o un `<img>` del PNG). Tap derecha/izquierda o swipe para navegar; flechas de teclado en desktop. Toggle "Ocultar nombres". Botones "Descargar" (contorno) y "Compartir" (lima). Link "Mándasela a quien sale en el chat" (= compartir).
   - Compartir: `navigator.share({ files: [png] })` si `navigator.canShare` lo permite; si no, descargar.
   - Descargar: PNG `chat-wrapped-2026-N.png`.

## Tarjetas (canvas → PNG 1080×1920)
Ver p5–p10 exactamente. Todas: "chat wrapped" arriba izq., pill "2026" arriba der., "N / 6" abajo izq. y dominio abajo der. (constante `SITE_DOMAIN` en `src/config.ts`, por defecto `"chatwrapped.co"`; la tarjeta 1 dice "Desliza para ver más" abajo izq. en vez de "1 / 6").
1. **Portada** (fondo bg): burbujas "te escribo en 5" (crema) y "{total} mensajes después…" (lima). "Nuestro año en el chat" (muted). Nombres grandes: pareja "Juana" (crema) / "& Camilo" (lima). Grupo: nombre del grupo (del nombre del archivo/zip o "El parche"/"La familia") en dos líneas con la segunda en lima. Tres stats en cajas surface: mensajes, días hablando, días de racha.
2. **¿Quién escribe más?** (fondo lima, texto ink): % grande del que más escribe, su nombre, barra (ink vs crema con borde ink), "A · n  B · m", frase "Juana manda 3 de cada 5 mensajes." (aproximar fracción simple: 1/2,3/5,2/3,3/4,4/5…). Grupo: ranking top 5 con barras horizontales y % del primero.
3. **Su hora** (fondo coral, texto ink): "Su hora es la" + hora pico grande ("11 p. m."). Frase según franja (madrugada/mañana/tarde/noche). Histograma de 24 barras ink, la barra pico en crema con borde ink. Ejes 12 a. m., 6 a. m., 12 m., 6 p. m., 11 p. m. Caja ink "Día más intenso" / fecha ("14 de febrero") / "{n} mensajes en un día" en coral.
4. **Así hablan ustedes** (fondo bg): "Así hablan" crema + "ustedes" lima. Top 5 emojis en cajas surface con conteo. "Las palabras que más usan": top 5 con barras lima proporcionales y conteo. Frase final "Se dijeron **{n} jajajas**. Algunos fueron de verdad." (n en lima). Si no hay emojis suficientes, mostrar los que haya.
5. **Los premios del año** (fondo crema, texto ink): grid 2×3 de premios; el primero relleno ink con título y ganador en lima, el resto con borde ink. Cada uno: título, descripción con el dato, ganador.
6. **Ahora te toca** (fondo lima): burbujas "¿y el tuyo con quién es?" (ink, texto crema) y "mándaselo ya" (crema). "Ahora te toca." gigante. Subtítulo. Botón ink pill con el dominio y flecha lima. Candado + "Tu chat nunca sale de tu celular."

"Ocultar nombres": reemplaza nombres por iniciales con punto ("J.", "C."); si chocan, "Persona 1", "Persona 2"…

Renderizado: una función por tarjeta `drawCardN(ctx, data, opts)` en `src/cards/`. Esperar `document.fonts.ready` y cargar explícitamente las fuentes antes de dibujar. Ajustar textos largos (nombres) reduciendo tamaño hasta que quepan. Emojis con la fuente de emoji del sistema.

## Parser (`src/parser/`)
Entrada: texto de `_chat.txt` (iOS) o `Chat de WhatsApp con X.txt` (Android); si es .zip, buscar el primer `.txt` dentro.
Formatos a soportar (con y sin `‎`, ` `, ` ` alrededor de "p. m."):
- iOS: `[14/02/25, 11:03:45 p. m.] Juana: hola`  · `[14/02/2025, 23:03:45] Juana: hola`
- Android: `14/02/25, 11:03 p. m. - Juana: hola` · `14/2/2025, 23:03 - Juana: hola`
- AM/PM en inglés también (`11:03 PM`), por si el teléfono está en inglés.
- Orden día/mes: es-CO es d/m/a por defecto; si algún primer componente >12 es d/m, si algún segundo >12 es m/d.
- Mensajes multilínea: líneas sin prefijo de fecha se unen al mensaje anterior.
- Mensajes de sistema (sin "Nombre: "), cifrado de extremo a extremo, "se unió", "cambió el asunto", etc.: descartar.
- Multimedia: detectar audio ("audio omitido", "<adjunto: ...opus>", "PTT-", ".opus"), imagen, sticker, video, "<Multimedia omitido>". Marcar `type: 'text'|'audio'|'media'|'deleted'` ("Se eliminó este mensaje", "Eliminaste este mensaje").
Salida: `Message { ts: number (ms local), author: string, text: string, type }`.

## Métricas (`src/metrics/`) — 12 stats + 8 premios
Ventana: últimos 365 días que terminan en el último mensaje. Año mostrado = año del último mensaje.
Stats: 1 total mensajes · 2 mensajes por persona (+ %) · 3 días hablando (días distintos con mensajes) · 4 racha máxima de días consecutivos · 5 histograma por hora (24) · 6 hora pico · 7 día más intenso (fecha + conteo) · 8 top 5 emojis (usar `Intl.Segmenter` + `\p{Extended_Pictographic}`, normalizar variantes de ❤) · 9 top 5 palabras (minúsculas, sin tildes al comparar pero mostrar la forma más común, ≥3 letras, lista de stopwords en español, excluir "jaja…", "multimedia", "omitido", urls, nombres de participantes) · 10 conteo de jajajas (regex `\b(ja){2,}j?a?\b|\bjsjs\w*|\bjeje\w*`) · 11 audios por persona · 12 tiempo de respuesta promedio por persona (solo cuando cambia el autor, ignorar huecos > 12 h).
Premios (cada uno con ganador + dato + texto):
1 **El intenso** — racha más larga de mensajes seguidos sin respuesta ("14 mensajes seguidos sin respuesta").
2 **El fantasma** — mayor tiempo de respuesta promedio ("Responde en 47 min, en promedio").
3 **El trasnochador** — más mensajes entre 00:00 y 04:59 ("2.104 mensajes después de las 12").
4 **El jajajero** — mayor proporción de mensajes con risa ("Se ríe en 1 de cada 4 mensajes").
5 **El podcastero** — más audios ("318 audios en el año").
6 **El que arranca** — más inicios de conversación (primer mensaje tras hueco ≥ 6 h) ("Empieza 6 de cada 10 charlas").
7 **El madrugador** — más mensajes entre 05:00 y 08:59.
8 **El emojero** — más emojis por mensaje.
La tarjeta 5 muestra 6 premios: en pareja, priorizar repartirlos (cada persona al menos 2 si es posible); omitir premios con dato 0 y rellenar con 7/8. En grupo, preferir ganadores distintos.

El worker recibe `{ fileName, bytes|text, mode }` y devuelve `{ ok: true, data: WrappedData }` o `{ ok: false, error }`. Nunca hacer `fetch` con contenido del chat.

## Lo que NO entra (dejar ganchos)
- Pago (Wompi/Nequi): solo un botón deshabilitado/"Próximamente" "Reporte completo" en el visor, detrás de flag `FEATURES.payments=false`.
- Analítica: `src/analytics.ts` con `track(event, props)` no-op que solo acepta props sin datos del chat (modo, nº participantes en rango, éxito/error). Eventos: landing_view, start, upload_ok, upload_error, card_view, download, share.

## Calidad
- `npm run build`, `npm run test`, `npm run lint` (tsc --noEmit basta) deben pasar.
- Fixtures en `src/parser/__fixtures__/`: iOS 12h es-CO, Android 24h, Android 12h, grupo de 4. Generador `scripts/gen-sample.mjs` que crea un chat de pareja realista (~5.000 mensajes, un año, horas sesgadas a la noche, emojis, audios, jajajas) en `public/sample-chat.txt` para probar a mano.
- Accesible: botones con label, focus visible, contraste.

---

# Fase 2 — multimedia, stickers y más tarjetas

Lecciones de la prueba con un chat real (iOS, grupo): los avisos del sistema de iOS vienen con forma de mensaje
(`Nombre: ‎Cambiaste…`) y ya se filtran en el parser. **No romper eso** (test `avisos del sistema de iOS`).
Los nombres de grupo largos se ajustan en varias líneas en la tarjeta 1 (ya hecho).

## 1. Tipos de multimedia (siempre, sin archivos)
Ampliar `MessageType` a: `text | audio | sticker | image | video | gif | document | location | contact | poll | viewonce | media | deleted`
(`media` = multimedia genérica sin tipo). Además `Message.edited: boolean` y `Message.link: boolean` (el texto tiene una URL; sigue siendo `text`).
Marcas a reconocer (es y en, con y sin U+200E):
- iOS «Sin archivos»: `sticker omitido`, `imagen omitida`, `video omitido`, `GIF omitido`, `audio omitido`, `documento omitido` (también `<nombre>.pdf • 3 páginas documento omitido`), `Tarjeta de contacto omitida`.
- Android «Sin archivos»: **todo** sale como `<Multimedia omitido>` → `media`. Android no distingue tipos; la tarjeta A lo maneja (ver abajo).
- Con archivos — iOS: `<adjunto: 00000034-STICKER-2026-09-21-21-03-12.webp>`, `-PHOTO-…jpg`, `-VIDEO-…mp4`, `-AUDIO-…opus`, `-GIF-…mp4`. Android: `STK-20260921-WA0003.webp (archivo adjunto)`, `IMG-…jpg`, `VID-…mp4`, `PTT-…opus` / `AUD-…`, `DOC-…`. Inglés: `<attached: …>`, `(file attached)`. Un pie de foto puede venir junto a la marca; el mensaje sigue siendo del tipo multimedia.
- Ubicación: `ubicación: https://maps.google.com/?q=…` / `Location: https://maps…`. Encuesta: texto que empieza con `ENCUESTA:` / `POLL:`. Una sola vez: `visualización única` / `view once`.
- Editado: sufijo `<Se editó este mensaje.>` / `<This message was edited>` → quitarlo del texto y marcar `edited`.
Palabras, emojis y risas siguen usando solo mensajes `text`.

## 2. Stickers reales (opcional, con archivos)
- Cambiar la lectura de .zip a **`@zip.js/zip.js`** con `BlobReader` (acceso aleatorio, no carga el zip entero en memoria). El worker recibe el `File` (Blob) directamente.
- Leer siempre el `.txt`. Si hay entradas `*STICKER*.webp` o `STK-*.webp`: descomprimir **solo esas** (nunca fotos, videos ni audios), máx. 400 stickers y 60 MB acumulados; hash SHA-256 con `crypto.subtle` para agrupar idénticos. El conteo sale de las referencias en el chat (nombre de archivo → hash); archivos referenciados que no estén en el zip se ignoran.
- Resultado: `topStickers: { bytes: Uint8Array; mime: string; count: number; topSender: string }[]` (máx. 3). Se transfieren al hilo principal y se dibujan con `createImageBitmap` (primer cuadro si es animado). Si falla la decodificación, se omite ese sticker.
- Zip > 1,5 GB → error amable sugiriendo exportar «Sin archivos». Mostrar "Leyendo stickers…" en la pantalla de carga mientras tanto.
- Guía (pantalla 3): nota corta: "¿Quieres tus stickers en el Wrapped? Exporta con **Incluir archivos** (pesa más; igual nada sale de tu celular)." La recomendación por defecto sigue siendo «Sin archivos».

## 3. Métricas nuevas
Por persona: stickers, imágenes, videos, gifs, documentos, links, eliminados, editados, longitud media de mensaje (caracteres, solo text), mediana de respuesta, % de respuestas en < 1 min.
Globales: mensajes por mes (ventana, 12 cubetas con etiqueta de mes), por día de semana (lunes primero), racha máxima **con fechas de inicio y fin**, silencio más largo (mayor hueco entre mensajes consecutivos, en días, con fechas), palabra característica por persona (`score = log(1+c_p) * (c_p+1)/(c_otros+1)`, c_p ≥ 3, mismas exclusiones del top de palabras), matriz de respuestas (A→B cuando cambia el autor con hueco < 30 min) y pares con más respuestas mutuas.

## 4. Premios nuevos
Añadir al banco: **El stickerero** (más stickers), **El fotógrafo** (más fotos+videos), **El arrepentido** (más eliminados+editados), **El testamento** (mayor longitud media: "Sus mensajes tienen 84 letras en promedio"), **El rayo** (menor mediana de respuesta: "Responde en 40 s"), **El linkero** (más links). Dato 0 → el premio no existe.
Selección de los 6: ordenar candidatos por **notoriedad** = valor del ganador / promedio de los demás (invertido en "menor es mejor"); luego aplicar las reglas de reparto existentes (pareja ≥ 2 c/u; grupo ganadores distintos). Los premios de razón exigen el mínimo de mensajes existente. Los premios siguen yendo a quien de verdad tiene el mejor dato (nunca a un segundo lugar).

## 5. Tarjetas — visor dinámico
`buildDeck(data): CardId[]` decide qué tarjetas van y en qué orden; visor, barras de progreso, nombre del PNG y "N / total" usan ese largo. Cada tarjeta tiene `available(data)`:

| # | id | Fondo | Disponible si |
|---|---|---|---|
| 1 | cover | dark | siempre |
| 2 | who | lime | siempre |
| 3 | month (C) | cream | ventana con mensajes en ≥ 60 días distintos de calendario (desde el primero al último ≥ 60) |
| 4 | weekday (D) | coral | ≥ 14 días hablando |
| 5 | hour | coral | siempre |
| 6 | streaks (E) | lime | ≥ 7 días hablando |
| 7 | reply (F) | cream | ≥ 2 personas con ≥ 5 respuestas |
| 8 | talk (emojis/palabras) | dark | siempre |
| 9 | signature (G) | coral | ≥ 2 personas con palabra característica |
| 10 | media (A) | cream | ≥ 10 mensajes multimedia o links |
| 11 | stickers (B) | lime | topStickers.length ≥ 1 |
| 12 | pairs (H) | dark | modo grupo y ≥ 3 personas con mensajes |
| 13 | awards | cream | siempre |
| 14 | end | lime | siempre |

Regla de fondos: tras omitir tarjetas, si dos seguidas quedan con el mismo fondo, la segunda pasa a un fondo alterno (dark ↔ cream, lime ↔ coral), resolviendo de izquierda a derecha. Las tarjetas existentes (cover, who, hour, talk, awards, end) deben poder dibujarse con su fondo alterno sin perder contraste: cada tarjeta recibe el tema (`THEMES.dark|cream|lime|coral`) y usa sus colores fg/accent/surface. Mantener el lenguaje visual de p5–p10: header, pill de año, footer "N / total" + dominio, títulos Inter Tight 800 con tracking negativo, cajas `surface` en fondos oscuros y bordes ink de 3px en fondos claros, radios 26.

Diseño de cada tarjeta nueva (espacio 648×1152):
- **C · Su mes**: "Su mes fue" + mes enorme ("febrero"). Frase: "{n} mensajes, {x} veces más que {mes más callado}" (si el más callado tiene 0: "…y en {mes} casi ni se hablaron"). 12 barras verticales con inicial de mes en el orden de la ventana; la mayor resaltada (crema con borde ink en fondo claro, lima en oscuro).
- **D · Su día**: "Su día es el" + "viernes" enorme. Frase por día (lunes "Arrancan la semana con todo", viernes "Viernes de chisme", domingo "Domingo de ponerse al día", etc., una por día). 7 barras horizontales L M X J V S D con conteo; la mayor resaltada.
- **E · Rachas y silencios**: título. Caja 1: "{n} días seguidos" + "del 3 de marzo al 7 de junio". Caja 2: "El silencio más largo" + "{n} días sin hablar" + "en {mes}" + "…y volvieron como si nada". Si el silencio < 2 días: "Nunca pasaron más de un día sin hablar".
- **F · ¿Quién deja en visto?**: título. Una fila por persona (pareja 2; grupo top 5 por mensajes) con nombre, mediana de respuesta grande ("3 min") y barra proporcional; etiqueta "deja en visto" en el más lento. Pie: "{nombre} responde en menos de 1 min el {p} % de las veces" (el más rápido).
- **G · La palabra de cada uno**: título. Pareja: dos cajas grandes nombre → «amor» + "la dijo 412 veces". Grupo: hasta 4 cajas en grid 2×2.
- **A · Lo que se mandaron**: título. Grid de cajas con número grande + etiqueta + "más: {nombre}": fotos, stickers, audios, videos, GIF, links, documentos (solo > 0, máx. 6, por cantidad). Si > 50 % del multimedia es genérico (Android sin archivos): caja grande "multimedia" + audios/links/eliminados si existen y nota "Android no dice qué era cada archivo".
- **B · Su sticker del año**: título. Sticker #1 grande (~300px) sobre caja, "enviado {n} veces · más que nadie: {nombre}". #2 y #3 pequeños abajo con conteo.
- **H · Los que más se hablan**: título. Par top grande "{A} & {B}" + "{n} respuestas entre ellos". Debajo, siguientes 3 pares en filas. Frase: "Lo de ustedes ya es otro chat."

"Ocultar nombres" aplica a todas las tarjetas nuevas (los stickers se siguen mostrando).

## 6. Calidad
- Fixtures nuevos: Android «Sin archivos» con `<Multimedia omitido>`; iOS con archivos (`<adjunto: …STICKER…webp>`, PHOTO, editado, ubicación, encuesta); Android con archivos (`STK-…webp (archivo adjunto)`); y un **zip generado en el test** con 3 stickers (bytes PNG pequeños guardados como .webp, dos idénticos) para probar hash y conteo.
- Tests de `buildDeck` (chat de 3 días en grupo; pareja de un año sin stickers; grupo de un año con stickers) y de que nunca haya dos fondos iguales seguidos.
- `scripts/gen-sample.mjs`: incluir stickers, fotos, links, editados y eliminados (con marcas iOS «Sin archivos»), y un modo `--group` que genere un grupo de 5 de un año en `public/sample-group.txt`. Añadir `scripts/gen-sample-zip.mjs` que genere `public/sample-with-stickers.zip` (chat iOS con referencias `<adjunto: …STICKER…webp>` + ~6 stickers PNG-como-webp de colores distintos, algunos repetidos).
- `npm run lint`, `npm run test`, `npm run build` en verde.

---

# Fase 3 — modos que cambian la experiencia (pendiente; empezar cuando la fase 2 esté validada)

Hoy `parche` y `familia` solo difieren en el nombre de respaldo ("El parche" / "La familia") y `pareja` se usa para
cualquier chat de 2 personas aunque no sea romántico. Objetivo: que el modo cambie textos y premios.

## 1. Modos
`Mode` pasa a ser `{ size: 'duo' | 'group'; rel: 'pareja' | 'amigos' | 'familia' }` (combinaciones válidas: duo+pareja, duo+amigos, duo+familia, group+amigos, group+familia).
Etiquetas en la UI:
- Duo: **Pareja** (Tu persona) · **Mejor amigo/a** (Tu parcero o parcera) · **Familia** (Mamá, papá, hermano/a…).
- Grupo: **Parche** (Tus amigos) · **Familia** (El grupo de la familia).
El campo `analytics` sigue registrando solo el modo, nunca datos del chat. Migrar todo uso de `mode === 'pareja'` a `mode.size === 'duo'` cuando la lógica sea de tamaño, y a `mode.rel` cuando sea de tono.

## 2. Flujo de elección (pantalla 2)
- Paso 1: "¿Con quién es el chat?" con dos grupos de opciones (2 personas / Grupo) — o bien el usuario sube primero y la app **sugiere** según el número de participantes:
  - Recomendado: mantener el orden actual (modo → subir), pero tras leer el chat, si el tamaño no coincide con el modo elegido, mostrar una hoja: "Este chat tiene 5 personas. ¿Lo armamos como Parche o como Familia?" (y para 2 personas: Pareja / Mejor amigo/a / Familia). Reemplaza los avisos actuales de "lo armamos como grupo, como pediste".
- Modo duo con >2 participantes: igual que hoy (los 2 que más escriben) con aviso.

## 3. Textos por modo (tabla `COPY[rel][size]` en `src/copy.ts`)
Centralizar todos los textos de tarjetas que dependan del tono. Mínimo:
| Clave | Pareja | Mejor amigo/a | Familia (duo) | Parche | Familia (grupo) |
|---|---|---|---|---|---|
| cover.kicker | Nuestro año en el chat | Nuestro año de chisme | Nuestro año en el chat | El año del parche | Así se habló la familia |
| cover.bubble1 / bubble2 | te escribo en 5 / {n} mensajes después… | ¿ya viste? / {n} mensajes después… | ¿ya almorzaste? / {n} mensajes después… | ¿quién se apunta? / {n} mensajes después… | buenos días familia 🌻 / {n} mensajes después… |
| hour.lead | Su hora es la | Su hora es la | Su hora es la | La hora del parche | La hora de la familia |
| end.bubble1 | ¿y el tuyo con quién es? | ¿y el tuyo con quién es? | ¿y el tuyo con quién es? | ¿y tu parche qué? | ¿y tu familia qué? |
Las frases por franja horaria y por día de la semana también varían por `rel` (al menos pareja / amigos / familia).

## 4. Premios por modo
Además del banco general (los 14 de fases 1–2), premios propios que solo compiten en su modo:
- **Familia**: **El de los buenos días** (más mensajes de saludo matutino 5–10 a. m.: "buenos días", "buen día", "bendiciones", 🌻☀️🙏), **El de las cadenas** (mensajes de texto > 300 caracteres o reenvíos largos + imágenes enviadas entre 5 y 9 a. m.), **El que no lee el grupo** (participa con < 3 % de los mensajes pero ≥ 1; "Escribió 4 veces en todo el año") — tono cariñoso, nunca burla.
- **Parche / Mejor amigo/a**: **El que propone y nunca va** (más mensajes con "vamos", "plan", "quién se apunta", "caigan", "parchemos", "hoy qué"), **El chismoso** (más mensajes con "ya supiste", "chisme", "no le digas a nadie", "¿viste lo de…?").
- **Pareja**: **El cursi** (mayor proporción de mensajes con "amor", "te amo", "te quiero", "mi vida", ❤️😍🥰😘), **El de las buenas noches** (más mensajes de "buenas noches"/"descansa"/"que sueñes" entre 9 p. m. y 2 a. m.).
Las listas de palabras clave viven en `src/metrics/keywords.ts`, se comparan sin tildes y en minúsculas, por palabra completa. La selección de 6 sigue la regla de notoriedad, con un empujón (+25 % de notoriedad) a los premios propios del modo para que aparezca al menos uno cuando tenga dato.

## 5. Calidad
- Tests: tabla de copy completa para las 5 combinaciones (sin claves faltantes), detección de cada premio nuevo con fixtures mínimos, y la hoja de sugerencia de modo (lógica pura: participantes → opciones).
- Validación visual de las tarjetas 1, 5 (hora), 13 (premios) y 14 (final) en las 5 combinaciones.

Nota de la validación de fase 3: los premios de conteo exigen un mínimo absoluto (`minCount`, ≥ 3; buenos días y buenas noches ≥ 5) y la notoriedad de conteos se suaviza con +5 (`notorietyOf(…, smooth)`). No quitarlo.

---

# Fase 4 — "El reto" y "Tu año en una tarjeta" (historia gratis)

Orden final del mazo: … → `awards` → **`quiz`** → **`summary`** → `end`. Ambas `available: siempre` (el reto, si hay al menos una pregunta válida). Fondos sugeridos: quiz **coral**, summary **dark**; aplica la regla de fondos alternos existente.

## 1. El reto (`quiz`)
Objetivo viral: la persona comparte la pregunta **sin la respuesta** y el otro tiene que adivinar.

**Banco de preguntas** (`src/metrics/quiz.ts`, función pura `pickQuiz(data): Quiz | null`). Cada pregunta tiene un dato por persona; solo es válida si el ganador tiene ≥ 3 y le saca ≥ 25 % al segundo (para que haya una respuesta clara). Preguntas, según `mode.rel` (las generales valen para todos):
- Generales: ¿Quién manda más stickers? · ¿Quién manda más audios? · ¿Quién responde más rápido? (mediana; gana el menor) · ¿Quién escribe más después de medianoche? · ¿Quién se ríe más? (mensajes con risa) · ¿Quién borra más mensajes? · ¿Quién manda más emojis?
- Pareja: ¿Quién dijo más "te amo"? · ¿Quién dijo más "te extraño"? · ¿Quién pide más "perdón"?
- Amigos: ¿Quién dice más "parce"? · ¿Quién propone más planes?
- Familia: ¿Quién manda más "buenos días"? · ¿Quién da más las gracias?
Selección: entre las válidas, preferir las propias del modo; luego la de mayor margen (ganador / segundo). Determinista (sin aleatoriedad) para que el PNG no cambie al recargar. Conteo de frases con las utilidades de `src/metrics/keywords.ts` (sin tildes, palabra completa); añadir ahí las listas nuevas ("te extraño", "perdón/perdóname/lo siento", "parce/parcero/parcera", "gracias/mil gracias").
**Opciones**: duo → las 2 personas; grupo → top 4 por mensajes (el ganador siempre incluido; si no está en el top 4, reemplaza al 4.º). Orden de opciones fijo por nombre (no delatar al ganador por posición).
`Quiz = { question: string; options: { name: string; value: number }[]; winner: string; unit: string /* "veces", "stickers", "min"… */ }`.

**Dos estados de la misma tarjeta** (cuenta como 1 en el mazo):
- *Pregunta* (por defecto; es lo que se descarga/comparte): kicker "El reto", pregunta enorme (Inter Tight 800, ajustada en varias líneas), opciones como pills/cajas grandes sin ningún dato, y abajo "Mándasela y que adivine 👀". Nada en el PNG debe revelar al ganador.
- *Respuesta*: misma tarjeta con el ganador resaltado (caja `strongBox` + "¡{nombre}!"), cada opción con su dato ("Juana · 214 veces") y barra proporcional.
- En el visor, solo en esta tarjeta, un botón "Ver respuesta" / "Ocultar respuesta" (estilo contorno, sobre el toggle de nombres). Descargar/Compartir usan el estado visible. `opts.reveal?: boolean` en `CardOpts`.
- "Ocultar nombres" aplica a opciones y ganador.

## 2. Tu año en una tarjeta (`summary`)
Una sola imagen 9:16 con lo mejor del Wrapped, pensada para quien solo va a subir una historia.
- Header y footer normales. Título: "Nuestro {año} en el chat" (pareja/duo) o el nombre del grupo en 1–2 líneas (mismo ajuste de nombres largos que la portada).
- Grid tipo collage (cajas `box`/`strongBox` de distintos tamaños, radios 26), con: total de mensajes (caja grande), hora pico, día del año más intenso (fecha), racha máxima, top emoji (grande), palabra top, y el **premio más notorio** (título + ganador). Si hay `topStickers[0]`, el sticker #1 en una caja (con el fondo claro de la tarjeta B) reemplaza a la palabra top.
- Pareja: nombres "Juana & Camilo" en la caja grande junto al total. Grupo: "{n} personas" como dato extra.
- Todo debe caber sin solaparse con nombres largos y números de 6 dígitos (usar `maxWidth`/ajuste).

## 3. Calidad
- Tests: `pickQuiz` (válida/ inválida por margen y mínimo, preferencia por modo, ganador fuera del top 4 en grupo, determinismo, menor-es-mejor para respuesta rápida); que el estado *pregunta* no dibuja ningún número de las opciones ni el texto del ganador destacado (fakeCtx); `buildDeck` incluye quiz y summary antes de `end`; summary con y sin sticker.
- `npm run lint`, `npm run test`, `npm run build` en verde.

Nota de la validación de fase 4: los premios de proporción (jajajero, emojero, cursi) también exigen un mínimo absoluto (`minCount`, 10 emojis, 5 cursis y ≥ 2 %). No quitarlo. Validado con chats reales de 15 MB a 1,19 GB (lectura < 1 s, < 90 MB de heap): no introducir nada que cargue el zip entero ni descomprima fotos/videos/audios.

---

# Fase 5 — Reporte completo (3 tarjetas)

El reporte completo es un **segundo mazo** que se abre desde el visor, separado de la historia gratis (que no cambia).

## 1. Acceso
- `src/config.ts`: añadir `FEATURES.fullReportFree: true` (mientras no haya pagos, el reporte completo se abre gratis). Lógica: si `payments` es true → (futuro) flujo de pago; si `payments` es false y `fullReportFree` es true → abre directo; si ambos false → botón deshabilitado "Reporte completo · Próximamente".
- El botón actual "Reporte completo · Próximamente" pasa a "Ver reporte completo" (contorno lima) cuando se puede abrir. Al tocarlo, el visor cambia al mazo `full` con su propio progreso ("Reporte completo · Tarjeta N de M") y un botón para volver a la historia. Mismo toggle de nombres, descargar y compartir.
- `deck.ts`: `CardDef.tier: 'free' | 'full'`; `buildDeck(data, tier = 'free')`. Las tarjetas full no aparecen en el mazo gratis. Footer de las full: "Reporte completo · N / M" (en vez de "N / M"). Regla de fondos alternos aplicada dentro de cada mazo.
- Analítica: evento `full_report_open` (sin datos del chat).

## 2. Tarjetas del reporte completo (orden)
| # | id | Fondo | Disponible si |
|---|---|---|---|
| 1 | time | dark | ≥ 10 conversaciones |
| 2 | evolution | cream | ventana con ≥ 120 días entre primer y último mensaje |
| 3 | phrases | coral | ≥ 3 expresiones descubiertas (ver 2.3) |
Si ninguna está disponible, el botón muestra "Tu chat es muy corto para el reporte completo" deshabilitado.

### 2.1 Cuánto tiempo hablaron (`time`)
Métricas nuevas (en `computeWrapped`, ventana de 365 días): **conversaciones** = secuencias de mensajes con huecos < 30 min; duración = último − primero (mínimo 1 min por conversación). Totales: horas totales, nº de conversaciones, duración media, conversación más larga (duración, fecha, nº de mensajes), y quién inicia más conversaciones de > 1 h (opcional si da tiempo).
Diseño: kicker "Cuánto tiempo hablaron", número enorme "{h} horas" (si < 1 h total, minutos), equivalencia "= {d} días enteros" (d = h/24 con una cifra decimal; si d < 1, "= {n} películas" con 2 h por película). Caja `strongBox`: "Su charla más larga" + "{5 h 20 min} seguidas" + "el 14 de febrero · 612 mensajes". Fila de dos cajas: "{n} conversaciones" y "{m} min por charla, en promedio".

### 2.2 Antes vs. ahora (`evolution`)
Partir la ventana en dos mitades iguales por tiempo (primer→último mensaje). Por mitad: mensajes, mensajes/día, % de cada persona, mediana de respuesta del chat. **Palabras nuevas**: palabras (mismas exclusiones que el top de palabras) con ≥ 5 usos en la 2.ª mitad y ≤ 1 en la 1.ª; top 3 por uso.
Diseño: título "Antes vs. ahora". Dos columnas "Antes" / "Ahora" con las fechas abreviadas de cada mitad ("ene–jun" / "jul–dic"). Filas: mensajes por día (con flecha ↑/↓ y % de cambio en lima/ink), quién escribe más en cada mitad (nombre + %), respuesta típica ("3 min" → "1 min"). Abajo: "Este año empezaron a decir:" + hasta 3 palabras nuevas como pills; si no hay, ocultar el bloque. Frase resumen según el cambio de mensajes/día: ≥ +20 % "Cada vez hablan más."; ≤ −20 % "Se calmaron un poco… pero siguen aquí."; si no, "Mismo ritmo de siempre." (con variante por `rel` en `copy.ts` si encaja).
En grupo, "quién escribe más" muestra solo el top 1 de cada mitad.

### 2.3 Lo que se dicen (`phrases`) — **expresiones descubiertas del propio chat**
No usar listas fijas como fuente principal: en Colombia (y en general) cada grupo habla distinto — paisa, costeño, rolo, caleño, pastuso, santandereano, jerga propia del parche, apodos, chistes internos. Las expresiones se **descubren** del chat. Módulo puro `src/metrics/phrases.ts` → `discoverPhrases(messages, people, opts): Phrase[]`, O(n) sobre los tokens.

1. **Normalización** (solo mensajes `text`): minúsculas; comparar sin tildes pero guardar la forma de superficie más frecuente para mostrar; colapsar alargamientos ("amoooor" → "amor", "siiii" → "si", "jajajaja"/"jsjsjs"/"jejeje" → token de risa único que **no** compite aquí); quitar URLs, números puros, emojis (ya tienen su tarjeta), marcas de multimedia y nombres/apodos de participantes (tokens de sus nombres). Tokenizar con `\p{L}+` (incluye ñ y tildes).
2. **Candidatos**: n-gramas de 1 a 3 palabras **dentro de un mismo mensaje** (no cruzar mensajes). Descartar n-gramas formados solo por stopwords o que empiecen/terminen en stopword de función pura ("de", "la", "que", "y", "en", "el"…) salvo expresiones de 2–3 palabras que sí tienen sentido como unidad (se resuelve con el puntaje, no con lista). Unigramas: ≥ 3 letras, no stopword. Contar por chat y por persona. Para no explotar memoria en chats de 60 000 mensajes: Map de string → conteo, y podar los n-gramas con conteo 1 cada ~20 000 mensajes si el Map pasa de ~300 000 entradas.
3. **Mínimo**: conteo ≥ max(5, 0,05 % de los mensajes de texto) y usado por ≥ 1 persona en ≥ 3 días distintos (evita una sola conversación que repite algo).
4. **Puntaje** (lo que hace que "qué chimba", "de una", "ome", "nojoda", "sumercé", "mor", "ñero" o "te amo" ganen sobre "voy a"):
   - Bi/trigramas: **cohesión** = conteo(ngrama) / min(conteo de cada palabra que lo forma) (qué tanto aparecen juntas) — exigir ≥ 0,25; puntaje = conteo × cohesión × (1 + 0,3·(n−1)).
   - Unigramas: **distintividad** frente a un español genérico: una lista incluida pequeña (`src/metrics/baseline-es.ts`, ~1 500 palabras muy comunes del español neutro, sin regionalismos; escríbela tú, sin descargar nada) — si la palabra está en la lista, puntaje × 0,15; si no, × 1. Así "pues", "parce", "chimba", "ome", "eche", "mijo", "veci" suben y "casa", "tiempo" bajan.
   - **Semillas por modo** (las listas por `rel` que ya existen en keywords.ts: te amo, te extraño, gracias, bendiciones, ¿ya llegaste?, parce, de una…): solo un empujón ×1,3 si aparecen; **nunca** se muestran si el chat no las usa.
5. **Deduplicar**: si un n-grama está contenido en otro elegido que concentra ≥ 70 % de sus usos, quedarse con el más largo ("qué más" dentro de "qué más pues"); si no, con el de mayor puntaje. No mostrar dos con la misma palabra principal.
6. **Salida**: top 5 por puntaje: `{ text (forma de superficie), count, byPerson: {name, count}[] , seeded: boolean }`. Excluir también las palabras que ya salen en el top de la tarjeta "Así hablan ustedes" (para no repetir) — si eso deja < 3, permitirlas.

Diseño igual al descrito abajo; título "Lo que se dicen" (familia: "Lo que se dicen en familia"); kicker pequeño "Sus expresiones, sacadas de su chat".
Diseño: título "Lo que se dicen" (familia: "Lo que se dicen en familia"). Una fila por frase: la frase grande entre comillas «…», total a la derecha, y debajo una barra partida por persona (duo: dos colores con los nombres y conteos a cada lado; grupo: barra del total + "más: {nombre}"). Pie: frase según la más usada (p. ej. pareja con "te amo" arriba: "Se lo dijeron {n} veces. Una cada {x} días."; si no aplica, "Así suenan ustedes.").

"Ocultar nombres" aplica a las tres.

## 3. Calidad
- Tests de `discoverPhrases`: un chat sintético con regionalismos ("qué chimba", "ome", "de una", "nojoda") los descubre aunque no estén en ninguna lista; "voy a"/"de la" no salen; alargamientos se agrupan; dedupe por inclusión; mínimo de días distintos; semillas solo empujan (no aparecen si no se usan); nombres de participantes excluidos; rendimiento: 60 000 mensajes sintéticos en < 1,5 s en Node.
- Tests: conversaciones (huecos, duración mínima, la más larga), mitades y palabras nuevas, disponibilidad de cada tarjeta, `buildDeck(data,'full')` vs `'free'` (sin mezcla), y la lógica del botón según los flags.
- `npm run lint`, `npm run test`, `npm run build` en verde.
