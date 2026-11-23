# Promo vertical v2 — spec

Composición HyperFrames 1080×1920, 43 s, `index.html` (root `main`). Reescribir la composición actual con tres objetivos:

1. **Nada se sale del encuadre.** Todo contenido con información (texto, teléfono, tarjetas, burbujas) debe quedar
   COMPLETO dentro de la zona segura **x 48–1032, y 120–1800** en su pose de reposo. Solo se permite salir del cuadro
   durante movimientos de entrada/salida (≤ 0.45 s). Prohibido hacer zoom que recorte la pantalla del teléfono o una
   tarjeta (nada de `scale > 1` sobre las imágenes de pantalla; el teléfono tampoco pasa de `scale: 1`).
   Todo centrado horizontalmente (eje x = 540).
2. **Pantallas reales de la app.** Usar `assets/screens/*.png` (capturas completas del navegador móvil, 1290×2796,
   relación 0.4614). Se elimina el marco falso de "historias" (`#L_story`, `#segs`, `.st-head`, `.st-reply`, `#cardBox`,
   `#qMark`, `#barBox`/barra de progreso falsa, `#dzGlow` se puede conservar como resplandor sobre la zona real).
   El mock de chat de WhatsApp (`#L_chat` con menús) se conserva porque representa WhatsApp, no la app.
3. **Sincronía con la música.** Todos los tiempos salen de `window.CUE` (generado). Los "golpes" visuales deben
   **aterrizar en el beat**: usar entradas muy cortas (0.12–0.2 s, `power4.out`/`expo.out`) que arrancan en el cue, o
   pre-roll (arrancar la animación `d` segundos antes para que el impacto caiga en el cue). Nada de shakes largos;
   shake máximo 0.2 s y amplitud ≤ 8 px.

## Fuentes de verdad
- `tools/retime.py` → genera `cues.json` y reescribe `data-start/data-duration` de los clips (dict `clips` al final).
  **La lista de cues ya está escrita (no la cambies salvo para añadir cues solo-visuales que necesites).** Sí debes
  actualizar el dict `clips` para que coincida con los ids de clip que dejes en index.html.
- `node tools/build-cues.mjs` → inyecta `window.CUE` y el bloque `<audio>` en index.html (entre marcadores CUE/AUDIO).
- Flujo: `python tools/retime.py && node tools/build-cues.mjs` después de cualquier cambio a clips/cues.
- Cues disponibles (nombre → uso): ver `cues.json` tras correr retime. Nombres: boom1, w_line2, w_line3, slam73, sub73,
  swipe_s2, cap1, tap1, menu1, tap2, menu2, tap3, zipPop, cap2, zipFly, swipe_s3, cap3, tapStart, uploadIn, zipDrop,
  zipLand, procIn, lockHit, swipe_s4, c_who, c_hour, c_talk, c_stick, c_awards, c_quiz, tapQuiz, reveal, c_sum, c_end,
  tapFull, gridIn, g1..g8, plus8, swipe_s5, tapShare, f1, f2, f3, sent, tapZip, zipSlam, zipBig1, zipText, swipe_s6,
  logo, cta1, cta2, cta3, final.

## Teléfono
- Pantalla `#scr`: 700 × 1517 (= 700 / 0.4614), radio 86, `overflow:hidden`. Marco `#pg`: 728 × 1545, radio 98.
- Imágenes de pantalla: `<img class="lay" src="assets/screens/....png">` a 700×1517 exactos, `object-fit: fill`. Sin zoom.
- Posición de reposo por escena (usar `transformOrigin: "50% 50%"`, `left:176px`, `top:187px` para centrado exacto;
  mover solo con `y` y `scale`):
  - **Full** (escena visor S4): scale 1, y 0 → ocupa y 187–1732.
  - **Con título arriba** (S2, S3, S5): scale 0.74, y +130 → caja visual ≈ x 271–809, y 518–1662; el título va en
    y 190–470, centrado, máx. 2 líneas, `font: 800 92px` aprox. (ajusta para que quepa en 960 px de ancho).
- Coordenadas de elementos reales DENTRO de `#scr` (px de pantalla de 700 de ancho), medidas en la app:
  - Landing, botón "Hacer mi Chat Wrapped": (350, 1365)
  - Subir, zona "Sube el chat exportado": centro (350, 1232), 622×358
  - Visor, chip "Reporte completo": (402, 73)
  - Visor, botón "Compartir": (249, 1455); botón ".zip": (638, 1455)
  - Visor, chip "Ver respuesta" (tarjeta del reto): (579, 1367)
  - Visor, zona "siguiente" (toque derecho sobre la tarjeta): (619, 733)
- Dedo `#finger` + onda `#rip` como ahora (función `tap(x,y,t)`), coordenadas en el sistema de `#scr`.

## Escenas (inicio → fin por cue)
**S1 Hook (0 → swipe_s2)** — conservar idea (avalancha de burbujas + contador 31.871 → corte en boom1 →
"Tu chat sabe / quién quiere / más." en boom1/w_line2/w_line3 → "73%" en slam73 → subtítulo en sub73).
- Burbujas: tras crear cada una, medir `offsetWidth/offsetHeight` y colocarla con `left` calculado para que quede
  ENTERA dentro de x 48–1032 e y 120–1800 (si el ancho > 960, reducir `font-size` hasta caber). Determinista (rng con semilla).
  Rotación ≤ 5°.
- "73%": tamaño tal que el ancho ≤ 940 px (≈ 380–400 px de fuente). Todo el bloque hook centrado vertical
  (aprox. título y 330–800, 73% y 860–1240, subtítulo ~1300).
- Quitar los shakes largos; un único punch de escala (1.06 → 1) de 0.15 s en boom1 y en slam73.

**S2 Exporta (swipe_s2 → swipe_s3)** — teléfono "con título arriba" con el mock de WhatsApp a 700×1517.
Título `cap1`: "① Exporta tu chat" (círculo mango con 1). tap1 en los 3 puntos (abre menu1), tap2 en "Más" (menu2),
tap3 en "Exportar chat". En `zipPop`/`cap2` el título cambia a "Te llega un .zip" y el ícono zip aparece en el centro
de la pantalla del teléfono (dentro del cuadro). En `zipFly` el zip sale volando (salida, se permite salir del cuadro).
Ajustar posiciones de mensajes/menús del mock al nuevo alto 1517 (repartir mensajes hasta ~1300; input abajo).

**S3 App real (swipe_s3 → swipe_s4)** — teléfono "con título arriba". Título `cap3`: "② Súbelo a la app".
`landing.png` → tapStart en el botón real (350,1365) → `uploadIn` cambia a `upload.png` → zip cae (zipDrop) y aterriza
(zipLand) en el centro de la zona real (350,1232), con `#dzGlow` del tamaño de esa zona → `procIn` cambia a
`processing.png` (real: "Leyendo tu chat…") SIN barra falsa. En `lockHit` overlay de privacidad a pantalla completa
(conservar `#lockOv`, verificar que el texto cabe en 940 px) hasta swipe_s4.

**S4 Visor real (swipe_s4 → gridIn)** — teléfono Full (scale 1, centrado). Pantallas en orden:
c_who `v02`, c_hour `v04`, c_talk `v05`, c_stick `v06`, c_awards `v07`, c_quiz `v08`, reveal `v08-answer`,
c_sum `v09`, c_end `v10`. En cada cambio (excepto el primero y reveal): toque rápido en la zona "siguiente" 0.08 s antes
del cue y la pantalla nueva entra con un desliz corto (x 40 → 0 + opacity, 0.16 s) que aterriza en el cue. Fondo
detrás del teléfono: glows + palabra fantasma gigante (opcional) — si se usa, auto-ajustar a ancho ≤ 1000 px y opacidad
baja; nunca recortada a medias. En tapQuiz: toque en "Ver respuesta" (579,1367); en reveal flash corto + v08-answer.
En tapFull: toque en "Reporte completo" (402,73).

**Grid (gridIn → swipe_s5)** — 8 tarjetas del reporte completo `assets/full/01..08.png` en rejilla 4×2 (225×400,
gap 20, x 60–1020) centrada verticalmente con "+8" y "tarjetas en el reporte completo" debajo; todo dentro de
y 120–1800. Cada tarjeta entra en g1..g8 (entrada corta desde abajo/escala, aterriza en su cue). Rotación final ≤ 2°.

**S5 Compartir (swipe_s5 → swipe_s6)** — título "Compártelas en tus historias"; teléfono "con título arriba"
mostrando `v09`. tapShare en "Compartir" (249,1455); en f1/f2/f3 salen del teléfono 3 tarjetas
(`assets/cards/02-who.png`, `06-stickers.png`, `08-quiz-answer.png`, 300×533) volando hacia arriba-afuera (salida).
En `sent` píldora "Enviado ✓" centrada bajo el teléfono (dentro del cuadro). tapZip en el botón ".zip" (638,1455).
En zipSlam el teléfono se encoge/desvanece y aparece el ícono zip grande centrado; zipBig1 "1 toque" y zipText
"todas en .zip" debajo, todo dentro del cuadro.

**S6 CTA (swipe_s6 → 43)** — conservar (logo "chat wrapped", 2026, "Hazlo con tu chat", píldora URL, "Gratis · sin subir
nada"), centrado vertical alrededor de y ≈ 960, punch corto en logo; cta1/cta2/cta3 entran en sus cues; brillo en final.
Mantener todo visible hasta el final (no fade a negro antes de 43 s; el último frame no debe ser negro).

## Transiciones entre escenas
En cada swipe_sN: corte limpio en el beat con un desliz corto (la escena nueva entra 0.18 s, la anterior se va).
Nada de rotaciones grandes; ≤ 3°.

## Reglas HyperFrames (obligatorias)
Ver `CLAUDE.md` del proyecto. Un timeline pausado registrado en `window.__timelines["main"]`; elementos temporizados con
`data-start` + `data-duration` + `class="clip"`; determinista (sin Math.random/Date). Usa `immediateRender:false` en fromTo
programados después del inicio (helper `FT` existente).

## Verificación (hazla tú antes de terminar)
1. `python tools/retime.py && node tools/build-cues.mjs`
2. `npx --yes hyperframes@0.9.81 check` sin errores.
3. Script de verificación de encuadre: con puppeteer-core + chrome de `~/.cache/hyperframes` (ver `tools/capture.mjs`),
   abrir index.html servido (p. ej. `npx --yes hyperframes@0.9.81 preview --background` o un server estático), y para
   t = 0.5..42.5 cada 0.25 s: `window.__timelines.main.seek(t)` y listar todo elemento visible (opacity efectiva > 0.05,
   visibility visible, dentro de un clip activo) que tenga texto o sea img/.zipic/#pg cuyo `getBoundingClientRect()`
   salga de x 0–1080 / y 0–1920 **fuera de ventanas de entrada/salida**. Guárdalo como `tools/check-frame.mjs`
   y deja la salida limpia (o solo violaciones justificadas durante salidas).
4. `npx --yes hyperframes@0.9.81 snapshot --at 1,2.5,4,7,9,12,14.5,17,22,24.5,27,31,33,35.5,37,40,42.5` y revisa los PNG.
No renderices el MP4 (lo hago yo).
