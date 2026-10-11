# Tiras de frames para los efectos animados generados con IA.
#
# Los efectos funcionales que antes eran círculos de canvas (pulso del punto
# débil del blindado, brasas del cráter de una torreta derribada, fogonazo
# de aviso del cañón) usan ahora arte IA: .qa-tmp/ia-raw/fx-*.png es el arte
# base y este script construye la tira horizontal de frames modulando ese
# arte (escala/brillo) para que el ciclo respire con curva suave y perfecta
# — la cadencia la marca el juego al avanzar frame, como con el jugador o
# las explosiones del atlas.
#
#   python plans/herramientas/tiras-efectos-ia.py
import math
import os

import numpy as np
from PIL import Image, ImageEnhance

RAW = ".qa-tmp/ia-raw"
DEST = "assets"
CELDA = 128  # px por frame en la tira

# (nombre, frames, curva) — la curva devuelve (escala, brillo) por frame.
# ciclo: fase suave y periódica; crecimiento: rampa para el fogonazo.
EFECTOS = [
    ("fx-debil", 8, lambda i, n: (0.84 + 0.16 * math.sin(2 * math.pi * i / n),
                                  0.88 + 0.12 * math.sin(2 * math.pi * i / n - math.pi / 4))),
    ("fx-crater", 8, lambda i, n: (0.96 + 0.04 * math.sin(2 * math.pi * i / n),
                                   0.78 + 0.22 * math.sin(2 * math.pi * i / n))),
    ("fx-fogonazo", 5, lambda i, n: (0.5 + 0.5 * i / max(1, n - 1), 1.0)),
]


def quitar_fondo(im):
    """Flood-fill de blanco desde bordes, como procesar-sprites-ia.py."""
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
    return Image.fromarray(out, "RGBA")


def recortar(im):
    datos = np.asarray(im)
    ys, xs = np.nonzero(datos[..., 3] > 10)
    return im.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))


def main():
    for nombre, frames, curva in EFECTOS:
        base = recortar(quitar_fondo(Image.open(os.path.join(RAW, nombre + ".png"))))
        base.thumbnail((CELDA, CELDA), Image.LANCZOS)
        tira = Image.new("RGBA", (CELDA * frames, CELDA), (0, 0, 0, 0))
        for i in range(frames):
            escala, brillo = curva(i, frames)
            frame = ImageEnhance.Brightness(base).enhance(brillo)
            lado = max(1, round(max(frame.width, frame.height) * escala))
            frame = frame.resize((max(1, round(frame.width * escala)), max(1, round(frame.height * escala))), Image.LANCZOS)
            x = i * CELDA + (CELDA - frame.width) // 2
            y = (CELDA - frame.height) // 2
            tira.paste(frame, (x, y), frame)
        ruta = os.path.join(DEST, f"ia-{nombre}.webp")
        tira.save(ruta, format="WEBP", quality=90, method=6)
        print(f"{ruta}: {frames} frames de {CELDA}px, {os.path.getsize(ruta) // 1024}KB")


if __name__ == "__main__":
    main()
