// Recorte de la lamina de sprites (fondo limpio offline desde la fase 2) y glows horneados.
import { CROPS, AIRSHIP_CROPS } from "./config.js";
import { G } from "./state.js";


export function cutSprite(crop) {
  // La lámina assets/juego-nacho.webp ya viene con transparencia real:
  // el fondo se eliminó offline (plans/herramientas/limpiar-lamina.py).
  const [sx, sy, sw, sh] = crop;
  const output = document.createElement("canvas");
  output.width = sw;
  output.height = sh;
  output.getContext("2d").drawImage(G.sheet, sx, sy, sw, sh, 0, 0, sw, sh);
  return output;
}


export function prepareSprites() {
  G.sprites.player = CROPS.player.map(cutSprite);
  G.sprites.face = cutSprite(CROPS.face);
  G.sprites.missile = cutSprite(CROPS.missile);
  G.sprites.enemyHeli = CROPS.enemyHeli.map(cutSprite);
  G.sprites.drone = CROPS.drone.map(cutSprite);
  G.sprites.fighter = CROPS.fighter.map(cutSprite);
  G.sprites.boss = cutSprite(CROPS.boss);
  G.sprites.explosion = CROPS.explosion.map(cutSprite);
  G.sprites.enemyBullet = cutSprite(CROPS.enemyBullet);
  G.sprites.playerBullet = cutSprite(CROPS.playerBullet);
  G.sprites.coin = cutSprite(CROPS.coin);
  G.sprites.powerups = CROPS.powerups.map(cutSprite);
}


export function cutAirshipSprite(crop) {
  const [sx, sy, sw, sh] = crop;
  const output = document.createElement("canvas");
  output.width = sw;
  output.height = sh;
  output.getContext("2d").drawImage(G.airshipSheet, sx, sy, sw, sh, 0, 0, sw, sh);
  return output;
}


// Corta una tira horizontal de frames iguales (efectos IA) en canvases.
export function cutStrip(image, frames) {
  const salida = [];
  for (let i = 0; i < frames; i += 1) {
    const x0 = Math.round((image.width / frames) * i);
    const x1 = Math.round((image.width / frames) * (i + 1));
    const output = document.createElement("canvas");
    output.width = x1 - x0;
    output.height = image.height;
    output.getContext("2d").drawImage(image, x0, 0, x1 - x0, image.height, 0, 0, x1 - x0, image.height);
    salida.push(output);
  }
  return salida;
}


export function prepareAirshipSprites() {
  G.sprites.airshipBoss = cutAirshipSprite(AIRSHIP_CROPS.boss);
  G.sprites.balloons = AIRSHIP_CROPS.balloons.map(cutAirshipSprite);
}


export const glowCache = new Map();


export function bakedGlow(image, glow, blur) {
  let porSprite = glowCache.get(image);
  if (!porSprite) {
    porSprite = new Map();
    glowCache.set(image, porSprite);
  }
  const clave = `${glow}|${blur}`;
  let horneado = porSprite.get(clave);
  if (!horneado) {
    const margen = Math.ceil(blur * 1.6) + 2;
    horneado = document.createElement("canvas");
    horneado.width = image.width + margen * 2;
    horneado.height = image.height + margen * 2;
    const hctx = horneado.getContext("2d");
    hctx.shadowColor = glow;
    hctx.shadowBlur = blur;
    hctx.drawImage(image, margen, margen);
    porSprite.set(clave, horneado);
  }
  return horneado;
}

