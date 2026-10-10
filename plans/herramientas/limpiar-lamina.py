# QA 2.4 — Limpieza offline de juego-nacho.png
# Replica exactamente cutSprite de game.js: flood-fill de fondo desde bordes
# + eliminación de islas pequeñas que tocan borde (<7.5% del área del crop).
# Las regiones de fondo (paisajes, dibujadas en crudo por drawBackground) se
# conservan byte a byte; el resto de la lámina queda transparente.
import json
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

# Crops actuales de game.js (post fase 1)
CROPS_PROCESADOS = {
    "player": [[18, 47, 101, 99], [119, 47, 103, 99], [218, 47, 102, 99], [310, 47, 99, 99],
               [402, 47, 99, 99], [492, 47, 96, 99], [579, 47, 98, 99], [667, 47, 83, 99]],
    "face": [[796, 49, 95, 101]],
    "missile": [[519, 229, 140, 82]],
    "enemyHeli": [[18, 380, 105, 95], [118, 380, 106, 95], [216, 380, 101, 95],
                  [311, 380, 103, 95], [407, 380, 103, 95]],
    "drone": [[533, 380, 83, 96], [615, 380, 84, 96], [696, 380, 81, 96],
              [772, 380, 81, 96], [849, 380, 80, 96], [925, 380, 82, 96]],
    "fighter": [[1033, 383, 116, 88], [1138, 383, 112, 88], [1238, 383, 108, 88],
                [1337, 383, 109, 88], [1437, 383, 82, 88]],
    "boss": [[31, 543, 337, 166]],
    "explosion": [[397, 541, 67, 68], [467, 541, 67, 68], [538, 541, 68, 68], [611, 541, 68, 68],
                  [683, 541, 69, 68], [754, 541, 69, 68], [824, 541, 69, 68], [893, 541, 68, 68],
                  [397, 615, 68, 76], [467, 615, 68, 76], [538, 615, 69, 76], [610, 615, 69, 76],
                  [682, 615, 70, 76], [753, 615, 70, 76], [824, 615, 70, 76], [893, 615, 69, 76]],
    "enemyBullet": [[706, 943, 61, 67]],
    "playerBullet": [[1057, 945, 76, 67]],
    "coin": [[1245, 942, 90, 81]],
    "powerups": [[35, 942, 84, 80], [120, 942, 85, 80], [205, 942, 85, 80], [377, 942, 88, 80]],
}
CROPS_CRUDOS = {
    "backgrounds": [[743, 755, 248, 148], [1021, 754, 238, 149], [1288, 754, 234, 149]],
}


def djb2(data: bytes) -> int:
    h = 5381
    for byte in data:
        h = ((h * 33) + byte) & 0xFFFFFFFF
    return h


def processar_crop(region: np.ndarray) -> np.ndarray:
    """Replica exacta de cutSprite (flood-fill + islas pequeñas)."""
    out = region.copy()
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
    etiquetas, n = ndimage.label(fg)  # 4-conectividad por defecto, como el BFS del JS
    for i in range(1, n + 1):
        comp = etiquetas == i
        tam = int(comp.sum())
        toca = bool(comp[0, :].any() or comp[-1, :].any() or comp[:, 0].any() or comp[:, -1].any())
        if toca and tam < limite:
            out[..., 3][comp] = 0
    return out


def main():
    origen = sys.argv[1] if len(sys.argv) > 1 else "assets/juego-nacho.png"
    destino = sys.argv[2] if len(sys.argv) > 2 else ".qa-opt/juego-nacho-limpio.png"
    hoja = np.asarray(Image.open(origen).convert("RGBA")).copy()
    limpia = np.zeros_like(hoja)  # todo transparente
    hashes = {}
    solapados = 0

    def solapa(c1, c2):
        x1, y1, w1, h1 = c1
        x2, y2, w2, h2 = c2
        return not (x1 + w1 <= x2 or x2 + w2 <= x1 or y1 + h1 <= y2 or y2 + h2 <= y1)

    todos_los_crops = [c for lista in CROPS_PROCESADOS.values() for c in lista]
    for i in range(len(todos_los_crops)):
        for j in range(i + 1, len(todos_los_crops)):
            if solapa(todos_los_crops[i], todos_los_crops[j]):
                solapados += 1

    for nombre, lista in CROPS_PROCESADOS.items():
        for k, (sx, sy, sw, sh) in enumerate(lista):
            region = hoja[sy:sy + sh, sx:sx + sw]
            procesada = processar_crop(region)
            limpia[sy:sy + sh, sx:sx + sw] = procesada
            hashes[f"{nombre}[{k}]"] = djb2(procesada.tobytes())

    for nombre, lista in CROPS_CRUDOS.items():
        for k, (sx, sy, sw, sh) in enumerate(lista):
            limpia[sy:sy + sh, sx:sx + sw] = hoja[sy:sy + sh, sx:sx + sw]
            hashes[f"{nombre}[{k}]"] = djb2(hoja[sy:sy + sh, sx:sx + sw].tobytes())

    Image.fromarray(limpia, "RGBA").save(destino, optimize=True)
    with open(".qa-opt/hashes-python.json", "w") as fh:
        json.dump(hashes, fh, indent=1)
    print(f"crops solapados: {solapados} (debe ser 0)")
    print(f"lámina limpia: {destino}")
    print(f"hashes: {len(hashes)} -> .qa-opt/hashes-python.json")


if __name__ == "__main__":
    main()
