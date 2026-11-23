#!/usr/bin/env python
"""Re-sincroniza cues.json y los clips de index.html con la cuadrícula de beats de la canción.
   Canción NUEVAYoL: el drop está en 22.74 s de la canción; se arranca en SONG_START=21.14 s para que caiga en el video a 1.60 s.
   B(k) = tiempo de video del beat k contado desde el primer beat tras el drop (canción 22.80 s -> video 1.66 s).
   Los compases (4 beats) empiezan en k múltiplo de 4.
   Uso: python tools/retime.py   (luego: node tools/build-cues.mjs)"""
import json, re, os
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..')
SONG_START = 21.14
t = open(os.path.join(ROOT, 'assets/_work/beats.json'), encoding='utf8').read()
bs = json.loads(t[t.find('{'):])['beatTimes']
i0 = min(range(len(bs)), key=lambda i: abs(bs[i] - 22.80))

# La cuadrícula del detector llega ~30 ms tarde respecto al ataque real del bombo (medido con flujo espectral).
GRID_OFFSET = -0.03

def B(k):
    a = int(k // 1); f = k - a
    s = bs[i0 + a] + (bs[i0 + a + 1] - bs[i0 + a]) * f
    return round(s - SONG_START + GRID_OFFSET, 3)

# (nombre, tiempo, wav o None (solo visual), volumen)
# Efectos: pocos y suaves. La música marca el pulso; los efectos solo subrayan acciones (toques, zip, candado, revelación).
C = [
 ('boom1', 1.60, 'boom_small', .35),
 ('w_line2', B(1), None, 0), ('w_line3', B(2), None, 0),
 ('slam73', B(3), 'pop_big', .45), ('sub73', B(4), None, 0),
 # --- export (mock de WhatsApp)
 ('swipe_s2', B(8), None, 0), ('swipe2a', B(8) - .15, 'swipe', .3), ('cap1', B(8), None, 0),
 ('tap1', B(9), 'click', .4), ('menu1', B(9) + .08, None, 0),
 ('tap2', B(11), 'click', .4), ('menu2', B(11) + .08, None, 0),
 ('tap3', B(13), 'click', .4), ('zipPop', B(14), 'pop_big', .45), ('cap2', B(14), None, 0), ('zipFly', B(17), 'whoosh_up', .3),
 # --- app real: landing -> subir -> leyendo -> privacidad
 ('swipe_s3', B(18), None, 0), ('swipe3a', B(18) - .15, 'swipe', .3), ('cap3', B(18), None, 0),
 ('tapStart', B(19), 'click', .4), ('uploadIn', B(19) + .08, None, 0),
 ('zipDrop', B(20) - .4, 'whoosh_down', .3), ('zipLand', B(20), 'thud', .4),
 ('procIn', B(21), None, 0),
 ('lockHit', B(24), 'lock', .45),
 # --- visor real (cada corte en beat; toque a la derecha = siguiente)
 ('swipe_s4', B(28), None, 0), ('swipe4a', B(28) - .15, 'swipe', .3),
 ('c_who', B(28), None, 0), ('c_hour', B(30), None, 0), ('c_talk', B(32), None, 0),
 ('c_stick', B(35), None, 0), ('c_awards', B(37), None, 0),
 ('c_quiz', B(40), None, 0), ('quizRiser', B(40), 'riser', .25),
 ('tapQuiz', B(43), 'click', .4),
 ('reveal', B(44), 'sting_reveal', .4),
 ('c_sum', B(48), None, 0), ('c_end', B(52), None, 0),
 ('tapFull', B(55), 'click', .4),
 # --- reporte completo
 ('gridIn', B(56), None, 0),
] + [('g%d' % (j + 1), B(56 + .5 * j), None, 0) for j in range(8)] + [
 ('plus8', B(60), 'pop_big', .4),
 # --- compartir (visor real)
 ('swipe_s5', B(64), None, 0), ('swipe5a', B(64) - .15, 'swipe', .3),
 ('tapShare', B(65), 'click', .4),
 ('f1', B(65.5), None, 0), ('f2', B(66), None, 0), ('f3', B(66.5), None, 0),
 ('sent', B(66.5), 'ding', .3),
 ('tapZip', B(67.5), 'click', .4), ('zipSlam', B(68), 'pop_big', .45), ('zipBig1', B(68.5), None, 0), ('zipText', B(69), None, 0),
 # --- CTA
 ('swipe_s6', B(72), None, 0), ('swipe6a', B(72) - .15, 'swipe', .3),
 ('logo', B(72), 'pop_big', .45),
 ('cta1', B(74), None, 0), ('cta2', B(75), None, 0), ('cta3', B(76), None, 0),
 ('final', B(77), 'sparkle', .35),
]
cues = [{'n': n, 't': t_, **({'f': f, 'v': v} if f else {})} for n, t_, f, v in C]
json.dump({'_doc': 'Fuente única de la sincronía (generado por tools/retime.py desde la cuadrícula de beats). Sin "f" = solo evento visual.',
           'song_start': SONG_START, 'cues': cues}, open(os.path.join(ROOT, 'cues.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)

# clips en index.html: id -> (inicio, fin)
END = 43.0
clips = {
 's1': (0.0, B(8) + .08), 'bgGlow': (B(8), B(72)), 'pg': (B(8), B(72)),
 'capS2': (B(8), B(18)), 'capS3': (B(18), B(24)), 'lockOv': (B(24), B(28)), 'gridOv': (B(56), B(64)),
 's5': (B(64), B(72)), 's6': (B(72), END),
}
p = os.path.join(ROOT, 'index.html'); h = open(p, encoding='utf8').read()
for cid, (a, b) in clips.items():
    h, n = re.subn(r'(<div id="%s"[^>]*?)data-start="[^"]*" data-duration="[^"]*"' % cid,
                   lambda m: '%sdata-start="%s" data-duration="%s"' % (m.group(1), round(a, 3), round(b - a, 3)), h, count=1)
    assert n == 1, cid
open(p, 'w', encoding='utf8').write(h)
print('bars:', {k: B(k) for k in (0, 4, 8, 16, 24, 28, 32, 40, 44, 48, 52, 56, 60, 64, 68, 72, 76)})
