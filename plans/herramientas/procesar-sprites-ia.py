# Procesado offline de los diseños generados con IA (.qa-tmp/ia-raw/*.png)
# hacia láminas WebP individuales con transparencia real (assets/*.webp).
#
# Pipeline por lámina (mismas ideas que limpiar-lamina.py y mejorar-sprites.py):
#   1. Flood-fill de fondo blanco desde los bordes + islas pequeñas que tocan
#      borde (réplica del detector de fondo que usaba el juego en runtime).
#   2. Recorte apretado al bbox alfa.
#   3. Volteo horizontal si el diseño salió mirando al lado contrario.
#   4. Relleno transparente centrado hasta la ratio EXACTA del rectángulo
#      donde el juego dibuja la entidad (como mejorar-sprites.py).
#   5. Escalado a ~3x el tamaño de dibujo (margen para DPR 2) y WebP q92.
#
#   python plans/herramientas/procesar-sprites-ia.py
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

RAW = ".qa-tmp/ia-raw"
DEST = "assets"

# (nombre, ratio w/h del rect de dibujo, ancho final objetivo, flip_x)
LAMINAS = [
    ("kamikaze", 82 / 74, 410, False),
    ("gunship", 152 / 106, 610, False),
    ("ally", 64 / 74, 320, False),
    ("homing", 58 / 24, 350, False),
    ("charged", 122 / 46, 610, False),
    ("fortress", 440 / 264, 1320, False),
    ("turret-aim", 64 / 56, 320, False),
    ("turret-spread", 64 / 56, 320, False),
    ("basket", 34 / 28, 170, False),
    ("airbase", 250 / 96, 1000, False),
    ("shield", 1.0, 430, False),
]


def quitar_fondo(im):
    """Flood-fill de blanco desde bordes + islas pequeñas (como cutSprite)."""
    out = np.asarray(im.convert("RGBA")).copy()
    h, w = out.shape[:2]
    r = out[..., 0].astype(np.int64)
    g = out[..., 1].astype(np.int64)
    b = out[..., 2].astype(np.int64)
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    bg = ((mx - mn) < 19) & (((r + g + b) / 3.0) > 204.0)

    reach = np.zeros((h, w), dtype=bool)
    reach[0, :] = bg[0, :]
    reach[-1, :] = bg[-1, :]
    reach[:, 0] |= bg[:, 0]
    reach[:, -1] |= bg[:, -1]
    while True:
        grow = reach.copy()
        grow[1:, :] |= reach[:-1, :]
        grow[:-1, :] |= reach[1:, :]
        grow[:, 1:] |= reach[:, :-1]
        grow[:, :-1] |= reach[:, 1:]
        grow &= bg
        if np.array_equal(grow, reach):
            break
        reach = grow
    out[..., 3][reach] = 0

    limite = w * h * 0.075
    fg = out[..., 3] > 0
    etiquetas, n = ndimage.label(fg)
    for i in range(1, n + 1):
        comp = etiquetas == i
        tam = int(comp.sum())
        toca = bool(comp[0, :].any() or comp[-1, :].any() or comp[:, 0].any() or comp[:, -1].any())
        if toca and tam < limite:
            out[..., 3][comp] = 0
    return out


def procesar(nombre, ratio, ancho_final, flip):
    datos = quitar_fondo(Image.open(os.path.join(RAW, nombre + ".png")))
    if flip:
        datos = datos[:, ::-1].copy()
    ys, xs = np.nonzero(datos[..., 3] > 10)
    if len(ys) == 0:
        raise SystemExit(f"{nombre}: sin contenido tras limpiar el fondo")
    recorte = datos[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    h, w = recorte.shape[:2]
    if w / h < ratio:
        wf, hf = int(round(h * ratio / 2) * 2), h
    else:
        wf, hf = w, int(round(w / ratio / 2) * 2)
    lienzo = np.zeros((hf, wf, 4), dtype=np.uint8)
    lienzo[(hf - h) // 2:(hf - h) // 2 + h, (wf - w) // 2:(wf - w) // 2 + w] = recorte
    im = Image.fromarray(lienzo, "RGBA")
    if im.width > ancho_final:
        im = im.resize((ancho_final, round(im.height * ancho_final / im.width)), Image.LANCZOS)
    ruta = os.path.join(DEST, f"ia-{nombre}.webp")
    im.save(ruta, format="WEBP", quality=92, method=6)
    opacos = int((np.asarray(im)[..., 3] > 10).sum())
    print(f"{ruta}: {im.width}x{im.height} (ratio {im.width / im.height:.3f} vs {ratio:.3f}), "
          f"sujeto {w}x{h}px, {opacos}px opacos, {os.path.getsize(ruta) // 1024}KB")


def main():
    seleccion = sys.argv[1:] or [n for n, *_ in LAMINAS]
    for nombre, ratio, ancho, flip in LAMINAS:
        if nombre in seleccion:
            procesar(nombre, ratio, ancho, flip)


if __name__ == "__main__":
    main()
