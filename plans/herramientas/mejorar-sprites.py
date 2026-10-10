# Mejora offline de las láminas que el juego dibuja ENTERAS.
#
# helicopter-player-v1/v2.webp y airship-gondola.webp se pasan tal cual a
# drawSprite (src/main.js finishLoading), que escala todo el lienzo al
# rectángulo de la entidad: 150x100 el jugador (3:2) y 190x95 la góndola
# (2:1). El sujeto solo llenaba el 27-55% del lienzo, así que en juego
# salía pequeño y descentrado, y en las miniaturas del menú se veía lejano.
#
#   => recorte apretado al bbox alfa + relleno transparente hasta la ratio
#      exacta del rectángulo de dibujo: mismo aspecto de lienzo que antes
#      (el CSS de index.html no cambia) pero con el sprite centrado y al
#      tamaño real del rectángulo.
#
#   python plans/herramientas/mejorar-sprites.py
#
# El resto de sprites se reencuadra sin tocar píxeles con
# plans/herramientas/reencuadrar-sprites.py (regenera los CROPS de
# src/config.js a partir del arte real de la lámina).
import os

import numpy as np
from PIL import Image

# (ruta, ratio del rectángulo donde se dibuja)
LAMINAS = [
    ("assets/helicopter-player-v1.webp", 3 / 2),
    ("assets/helicopter-player-v2.webp", 3 / 2),
    ("assets/airship-gondola.webp", 2 / 1),
]


def bbox_alfa(datos):
    ys, xs = np.nonzero(datos[..., 3] > 10)
    if len(ys) == 0:
        raise SystemExit("lámina vacía")
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def apretar_lamina(im, ratio_objetivo):
    datos = np.asarray(im.convert("RGBA"))
    x0, y0, x1, y1 = bbox_alfa(datos)
    recorte = datos[y0:y1, x0:x1]
    h, w = recorte.shape[:2]
    if w / h < ratio_objetivo:
        w_final, h_final = int(round(h * ratio_objetivo / 2) * 2), h
    else:
        w_final, h_final = w, int(round(w / ratio_objetivo / 2) * 2)
    lienzo = np.zeros((h_final, w_final, 4), dtype=np.uint8)
    lienzo[(h_final - h) // 2:(h_final - h) // 2 + h,
           (w_final - w) // 2:(w_final - w) // 2 + w] = recorte
    return Image.fromarray(lienzo, "RGBA"), (w, h), (w_final, h_final)


def guardar_webp(im, ruta):
    # lossy q92: son láminas generadas con arte ruidoso donde el lossless
    # pesa 3-4x más sin diferencia visible, y los originales ya eran lossy
    im.save(ruta, format="WEBP", quality=92, method=6)
    return os.path.getsize(ruta)


def main():
    for ruta, ratio in LAMINAS:
        im = Image.open(ruta).convert("RGBA")
        antes_opacos = int((np.asarray(im)[..., 3] > 10).sum())
        apretada, antes, despues = apretar_lamina(im, ratio)
        despues_opacos = int((np.asarray(apretada)[..., 3] > 10).sum())
        assert antes_opacos == despues_opacos, "se perdió contenido"
        tam = guardar_webp(apretada, ruta)
        print(f"{ruta}: {antes} -> {despues} (ratio {ratio:.2f}), "
              f"{antes_opacos}px opacos intactos, {tam // 1024}KB")


if __name__ == "__main__":
    main()
