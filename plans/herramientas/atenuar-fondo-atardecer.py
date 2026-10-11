# Atenuación del resplandor naranja del fondo de atardecer (backgrounds[2])
# del atlas assets/juego-nacho.webp.
#
# Problema que corrige: en las oleadas 11-12 (las de la fortaleza voladora)
# el cielo anaranjado y saturado de ese fondo, estirado a pantalla completa,
# domina la zona de juego y se percibe como "un círculo rojo gigante que va
# creciendo" pegado al jefe y a los enemigos que vuelan delante (QA del
# 2026-10-11). Además la transición es brusca: el fondo anterior casi no
# tiene naranja y este lo inunda.
#
# Estrategia: sobre el crop de backgrounds[2] se detectan los píxeles
# naranjas (rojo alto, azul bajo) y se mezclan hacia una versión
# desaturada y oscurecida de sí mismos, con caída suave según la
# intensidad. Los silueteados oscuros de la ciudad no se tocan.
#
#   python plans/herramientas/atenuar-fondo-atardecer.py
import numpy as np
from PIL import Image

RUTA = "assets/juego-nacho.webp"
BG2 = (1288, 754, 234, 149)  # CROPS.backgrounds[2]
FUERZA = 0.62  # cuánto se acerca cada píxel naranja a su versión apagada


def main():
    im = Image.open(RUTA).convert("RGBA")
    hoja = np.asarray(im).copy()
    x, y, w, h = BG2
    reg = hoja[y:y + h, x:x + w].astype(np.float64)

    r, g, b = reg[..., 0], reg[..., 1], reg[..., 2]
    # máscara naranja con margen: rojo dominante y azul caído
    intensidad = np.clip((r - b - 40) / 120.0, 0, 1) * np.clip((r - 140) / 80.0, 0, 1)
    apagado = np.stack([
        r * 0.55 + 20,
        g * 0.72 + 6,
        b * 0.9 + 14,
        reg[..., 3],
    ], axis=-1)
    reg = reg * (1 - intensidad[..., None] * FUERZA) + apagado * (intensidad[..., None] * FUERZA)

    hoja[y:y + h, x:x + w] = np.clip(reg, 0, 255).astype(np.uint8)
    Image.fromarray(hoja, "RGBA").save(RUTA, format="WEBP", quality=90, method=6)

    # métrica: píxeles naranja antes y después del crop
    antes = int((intensidad > 0.35).sum())
    despues_datos = np.asarray(Image.open(RUTA).convert("RGBA"))[y:y + h, x:x + w]
    rr, gg, bb = despues_datos[..., 0].astype(int), despues_datos[..., 1].astype(int), despues_datos[..., 2].astype(int)
    despues = int(((rr > 190) & (gg > 60) & (gg < 190) & (bb < 90) & (rr - bb > 110)).sum())
    print(f"bg2: naranja intenso {antes}px -> {despues}px tras atenuar (fuerza {FUERZA})")


if __name__ == "__main__":
    main()
