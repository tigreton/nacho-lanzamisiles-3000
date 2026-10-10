# Reencuadre de los CROPS de src/config.js a partir del arte real de la lámina.
#
# Problema que corrige: los crops actuales se solapan (player[1] invade 4px
# de player[2], fighter hasta 12px), así que cada frame se renderiza con
# virutas del sprite vecino, y varios sprites quedan descentrados dentro de
# su rectángulo (la moneda con 26px de margen derecho frente a 11 izquierdo).
#
# Estrategia SIN tocar píxeles del atlas:
#   - frames animados: se mide el bbox alfa de cada frame y las fronteras
#     entre vecinos se ponen en la columna de mínima densidad (el "valle")
#     de la zona de contacto, con 2px de holgura cuando hay hueco.
#   - sprites estáticos: bbox + 2px de margen simétrico.
#   - AIRSHIP_CROPS (jefe dirijible y globos): bbox + 4px, están aislados.
#
# Imprime los bloques listos para pegar y valida su propia salida:
#   python plans/herramientas/reencuadrar-sprites.py
import io
import re
import subprocess
import sys

import numpy as np
from PIL import Image

PAD = 2
FILAS_ANIMADAS = ("player", "enemyHeli", "drone", "fighter", "explosion")


def hoja_de(ruta):
    datos = subprocess.run(["git", "show", "HEAD:" + ruta], capture_output=True).stdout
    return np.asarray(Image.open(io.BytesIO(datos)).convert("RGBA"))


def bbox_absoluto(hoja, sx, sy, sw, sh):
    """Bbox alfa en coordenadas absolutas de la lámina."""
    ys, xs = np.nonzero(hoja[sy:sy + sh, sx:sx + sw, 3] > 10)
    if len(ys) == 0:
        return None
    return int(xs.min()) + sx, int(ys.min()) + sy, int(xs.max()) + 1 + sx, int(ys.max()) + 1 + sy


def frontera(hoja, y0, y1, izq_x1, der_x0):
    """Columna que separa dos frames contiguos.

    Sin solape: la mitad del hueco (margen simétrico en ambos crops).
    Con solape: la columna con menos píxeles opacos de la zona compartida,
    que es donde menos arte de ninguno de los dos se pierde.
    """
    if der_x0 >= izq_x1:
        return (izq_x1 + der_x0) // 2
    densidad = [(int((hoja[y0:y1, x, 3] > 10).sum()), x) for x in range(der_x0, izq_x1)]
    return min(densidad)[1]


def crops_animados(hoja, nombre, marcos):
    bandas = [bbox_absoluto(hoja, sx, sy, sw, sh) for sx, sy, sw, sh in marcos]
    if any(b is None for b in bandas):
        raise SystemExit(f"{nombre}: frame vacío, revisar a mano")

    # El grupo puede ocupar varias filas físicas (la explosión tiene dos):
    # los valles solo se buscan entre frames cuya banda vertical se cruza.
    filas = []
    for b in bandas:
        for fila in filas:
            if b[1] < fila["y1"] and fila["y0"] < b[3]:
                fila["bandas"].append(b)
                fila["y0"] = min(fila["y0"], b[1])
                fila["y1"] = max(fila["y1"], b[3])
                break
        else:
            filas.append({"bandas": [b], "y0": b[1], "y1": b[3]})

    bordes_por_frame = {}
    for fila in filas:
        grupo = sorted(fila["bandas"], key=lambda b: b[0])
        bordes = [grupo[0][0] - PAD]
        for (a0, _, a1, _), (b0, _, _, _) in zip(grupo, grupo[1:]):
            v = frontera(hoja, fila["y0"] - PAD, fila["y1"] + PAD, a1, b0)
            if b0 < a1:  # arte compartido: informar de lo que se cede al vecino
                cede_izq, cede_der = max(0, a1 - v), max(0, v - b0)
                if max(cede_izq, cede_der) > 3:
                    print(f"// ojo: frontera en x={v} recorta {cede_izq}px del frame izquierdo "
                          f"o {cede_der}px del derecho ({nombre})")
            bordes.append(v)
        bordes.append(grupo[-1][2] + PAD)
        for k, b in enumerate(grupo):
            bordes_por_frame[b] = (bordes[k], bordes[k + 1])

    return [[bordes_por_frame[b][0], b[1] - PAD, bordes_por_frame[b][1] - bordes_por_frame[b][0],
             b[3] + PAD - (b[1] - PAD)] for b in bandas]


def contaminacion(hoja, nombre, marcos):
    """Píxeles opacos de vecinos que quedan dentro del nuevo crop."""
    bandas = [bbox_absoluto(hoja, sx, sy, sw, sh) for sx, sy, sw, sh in marcos]
    total = 0
    for (sx, sy, sw, sh), (bx0, by0, bx1, by1) in zip(marcos, bandas):
        zona = hoja[sy:sy + sh, sx:sx + sw, 3] > 10
        propia = np.zeros_like(zona)
        propia[max(0, by0 - sy):by1 - sy, max(0, bx0 - sx):bx1 - sx] = True
        total += int((zona & ~propia).sum())
    if total:
        print(f"// {nombre}: {total}px de vecinos dentro de los nuevos crops")


def pares_del_config(nombre):
    texto = open("src/config.js", encoding="utf8").read()
    m = re.search(rf"{nombre}\s*=\s*\{{(.*?)\}};", texto, re.S)
    return re.findall(r"(\w+)\s*:\s*(\[[\[\]\d\s,]+\])", m.group(1))


def lista_de(resto):
    return [[[int(n) for n in re.findall(r"\d+", c)]
             for c in re.findall(r"\[\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\]", resto)]][0]


def main():
    atlas = hoja_de("assets/juego-nacho.webp")
    globo = hoja_de("assets/boss-globo-sprites.webp")
    salida = {}

    for titulo, hoja, fuente in [("CROPS", atlas, "CROPS"), ("AIRSHIP_CROPS", globo, "AIRSHIP_CROPS")]:
        bloque = {}
        for clave, resto in pares_del_config(fuente):
            marcos = lista_de(resto)
            if titulo == "CROPS" and clave == "backgrounds":
                bloque[clave] = marcos
            elif titulo == "CROPS" and clave in FILAS_ANIMADAS:
                bloque[clave] = crops_animados(hoja, clave, marcos)
                contaminacion(hoja, clave, bloque[clave])
            else:
                pad = 4 if titulo == "AIRSHIP_CROPS" else PAD
                nuevos = []
                for sx, sy, sw, sh in marcos:
                    x0, y0, x1, y1 = bbox_absoluto(hoja, sx, sy, sw, sh)
                    nuevos.append([x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad])
                bloque[clave] = nuevos
        salida[titulo] = bloque

    # Validación de la salida: cero solapes 2D y todo dentro de la lámina
    problemas = 0
    for titulo, bloque in salida.items():
        hoja = atlas if titulo == "CROPS" else globo
        H, W = hoja.shape[:2]
        todos = [(clave, i, c) for clave, marcos in bloque.items() if clave != "backgrounds"
                 for i, c in enumerate(marcos)]
        for i in range(len(todos)):
            for j in range(i + 1, len(todos)):
                (n1, k1, [x1, y1, w1, h1]), (n2, k2, [x2, y2, w2, h2]) = todos[i], todos[j]
                if not (x1 + w1 <= x2 or x2 + w2 <= x1 or y1 + h1 <= y2 or y2 + h2 <= y1):
                    print(f"!! SOLAPE en la salida: {titulo} {n1}[{k1}] x {n2}[{k2}]")
                    problemas += 1
        for clave, marcos in bloque.items():
            if clave == "backgrounds":
                continue
            for i, (sx, sy, sw, sh) in enumerate(marcos):
                if sx < 0 or sy < 0 or sx + sw > W or sy + sh > H or sw <= 0 or sh <= 0:
                    print(f"!! FUERA DE LA LÁMINA: {titulo} {clave}[{i}] = [{sx}, {sy}, {sw}, {sh}]")
                    problemas += 1
    if problemas:
        raise SystemExit(f"{problemas} problemas; NO pegar la salida")
    print(f"// validado: 0 solapes, todo dentro de la lámina (PAD={PAD})")

    for titulo, bloque in salida.items():
        print(f"\nexport const {titulo} = {{")
        for clave, marcos in bloque.items():
            forma = "[" + ", ".join(f"[{a}, {b}, {c}, {d}]" for a, b, c, d in marcos) + "]"
            if len(marcos) == 1:
                forma = forma[1:-1]
            print(f"  {clave}: {forma},")
        print("};")

    if "--aplicar" in sys.argv:
        config = open("src/config.js", encoding="utf8").read()
        for titulo, bloque in salida.items():
            bloque_js = f"export const {titulo} = {{\n" + "".join(
                f"  {clave}: " + ("[" + ", ".join(f"[{a}, {b}, {c}, {d}]" for a, b, c, d in marcos) + "]"
                                  if len(marcos) > 1 else
                                  f"[{marcos[0][0]}, {marcos[0][1]}, {marcos[0][2]}, {marcos[0][3]}]")
                + ",\n" for clave, marcos in bloque.items()) + "};"
            config = re.sub(rf"export const {titulo} = \{{.*?\}};", lambda _: bloque_js, config, flags=re.S)
        open("src/config.js", "w", encoding="utf8", newline="").write(config)
        print("\n// src/config.js actualizado")


if __name__ == "__main__":
    main()
