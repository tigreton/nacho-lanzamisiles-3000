# Auditoría offline de assets — detecta fondos blancos, halos, márgenes
# muertos y sprites duplicados sin abrir el juego.
#
#   python plans/herramientas/auditar-sprites.py
#
# Comprueba:
#   1. juego-nacho.webp recortando con CROPS de src/config.js
#   2. boss-globo-sprites.webp recortando con AIRSHIP_CROPS de src/config.js
#   3. helicopter-player-v1/v2.webp y airship-gondola.webp (se usan enteras):
#      componentes conexas opacas = sprites sueltos dentro de la imagen
import re
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

UMBRAL_BLANCO = 235  # canal medio >= esto cuenta como blanco
MIN_AREA_BLOB = 400  # px opacos para considerar un blob un sprite


def cargar_crops(ruta_config):
    texto = open(ruta_config, encoding="utf8").read()

    def bloque(nombre):
        m = re.search(rf"{nombre}\s*=\s*\{{(.*?)\}};", texto, re.S)
        cuerpo = m.group(1)
        resultado = {}
        for clave, resto in re.findall(r"(\w+)\s*:\s*(\[[\[\]\d\s,]+\])", cuerpo):
            marcos = re.findall(r"\[\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\]", resto)
            if clave == "backgrounds":
                continue
            resultado[clave] = [[int(n) for n in re.findall(r"\d+", c)] for c in marcos]
        return resultado

    return bloque("CROPS"), bloque("AIRSHIP_CROPS")


def estadisticas(region):
    """Métricas de un recorte RGBA ya troceado."""
    a = region[..., 3]
    opaco = a > 200
    semitransp = (a > 10) & (a <= 200)
    total = a.size
    n_op = int(opaco.sum())
    if n_op == 0:
        return {"vacio": True}
    rgb = region[..., :3].astype(np.int16)
    blanco = opaco & (rgb.mean(axis=2) >= UMBRAL_BLANCO)
    ys, xs = np.nonzero(a > 10)
    h, w = a.shape
    return {
        "vacio": False,
        "opaco_pct": 100 * n_op / total,
        "blanco_pct": 100 * int(blanco.sum()) / total,
        "halo_pct": 100 * int(semitransp.sum()) / total,
        "bbox": (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1),
        "dim": (w, h),
    }


def son_duplicados(r1, r2):
    """True si dos recortes alineados por su bbox de alfa son prácticamente iguales."""
    def recortar(r):
        est = estadisticas(r)
        if est.get("vacio"):
            return None
        x0, y0, x1, y1 = est["bbox"]
        return r[y0:y1, x0:x1]

    c1, c2 = recortar(r1), recortar(r2)
    if c1 is None or c2 is None or c1.shape != c2.shape:
        return False
    dif = np.abs(c1.astype(np.int16) - c2.astype(np.int16)).mean()
    return dif < 2.0


def auditar_grupo(nombre, hoja, marcos):
    print(f"\n== {nombre} ==")
    for k, (sx, sy, sw, sh) in enumerate(marcos):
        est = estadisticas(hoja[sy:sy + sh, sx:sx + sw])
        if est.get("vacio"):
            print(f"  {nombre}[{k}]: VACÍO ({sw}x{sh} en {sx},{sy})")
            continue
        x0, y0, x1, y1 = est["bbox"]
        margenes = (x0, y0, sw - x1, sh - y1)
        avisos = []
        if est["blanco_pct"] > 3:
            avisos.append(f"BLANCO {est['blanco_pct']:.0f}%")
        if est["halo_pct"] > 6:
            avisos.append(f"HALO {est['halo_pct']:.0f}%")
        if max(margenes) > 12:
            avisos.append(f"MARGEN {margenes}")
        etiqueta = "  " + (" ; ".join(avisos) if avisos else "ok")
        print(f"  {nombre}[{k}] {sw}x{sh}: {etiqueta}")
    for i in range(len(marcos)):
        for j in range(i + 1, len(marcos)):
            sx, sy, sw, sh = marcos[i]
            r1 = hoja[sy:sy + sh, sx:sx + sw]
            sx, sy, sw, sh = marcos[j]
            r2 = hoja[sy:sy + sh, sx:sx + sw]
            if son_duplicados(r1, r2):
                print(f"  DUPLICADO: {nombre}[{i}] == {nombre}[{j}]")


def auditar_entera(nombre, ruta):
    print(f"\n== {nombre} (lámina entera: {ruta}) ==")
    hoja = np.asarray(Image.open(ruta).convert("RGBA"))
    h, w = hoja.shape[:2]
    a = hoja[..., 3]
    opaco = a > 30
    etiquetas, n = ndimage.label(opaco)
    print(f"  lienzo {w}x{h}, blobs opacos: {n}")
    blobs = []
    for i in range(1, n + 1):
        comp = etiquetas == i
        area = int(comp.sum())
        if area < MIN_AREA_BLOB:
            continue
        ys, xs = np.nonzero(comp)
        blobs.append((i, area, (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)))
    for i, area, (x0, y0, x1, y1) in blobs:
        region = hoja[y0:y1, x0:x1]
        est = estadisticas(region)
        avisos = []
        if est["blanco_pct"] > 3:
            avisos.append(f"BLANCO {est['blanco_pct']:.0f}%")
        if est["halo_pct"] > 6:
            avisos.append(f"HALO {est['halo_pct']:.0f}%")
        rel_area = 100 * area / (w * h)
        etiqueta = " ; ".join(avisos) if avisos else "ok"
        print(f"  blob#{i}: {x1-x0}x{y1-y0} en ({x0},{y0}), {rel_area:.0f}% del lienzo, {area}px — {etiqueta}")
        blobs_reg.append((i, region))
    for idx in range(len(blobs_reg)):
        for jdx in range(idx + 1, len(blobs_reg)):
            if son_duplicados(blobs_reg[idx][1], blobs_reg[jdx][1]):
                print(f"  DUPLICADO: blob#{blobs_reg[idx][0]} == blob#{blobs_reg[jdx][0]}")


blobs_reg = []

crops, airship_crops = cargar_crops("src/config.js")
atlas = np.asarray(Image.open("assets/juego-nacho.webp").convert("RGBA"))
for nombre, marcos in crops.items():
    auditar_grupo(nombre, atlas, marcos)

globo = np.asarray(Image.open("assets/boss-globo-sprites.webp").convert("RGBA"))
for nombre, marcos in airship_crops.items():
    auditar_grupo(nombre, globo, marcos)

for nombre, ruta in [
    ("helicopter-player-v1", "assets/helicopter-player-v1.webp"),
    ("helicopter-player-v2", "assets/helicopter-player-v2.webp"),
    ("airship-gondola", "assets/airship-gondola.webp"),
]:
    auditar_entera(nombre, ruta)
