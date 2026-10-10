// Utilidades puras compartidas.


export const rand = (min, max) => min + Math.random() * (max - min);


export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));


export const lerp = (a, b, amount) => a + (b - a) * amount;


export function overlaps(a, b, inset = 0.25) {
  const aw = a.w * (1 - inset);
  const ah = a.h * (1 - inset);
  const bw = b.w * (1 - inset);
  const bh = b.h * (1 - inset);
  return Math.abs(a.x - b.x) * 2 < aw + bw && Math.abs(a.y - b.y) * 2 < ah + bh;
}

export function isBossEnemy(enemy) {
  return enemy.type === "boss" || enemy.type === "airship" || enemy.type === "fortress";
}


// La fortaleza rebota todo mientras le queden torretas: solo cae a base
// de derribarlas una a una.
export function isInvulnerableEnemy(enemy) {
  return enemy.type === "fortress" && (enemy.turretsLeft ?? 0) > 0;
}


// Qué jefe toca en cada oleada de jefe. En campaña rotan cada 4 oleadas
// (4 acorazado, 8 dirigible, 12 fortaleza…); en solo jefes, en cadena.
export function bossKindForWave(wave, gameMode = "campana") {
  const index = gameMode === "jefes" ? (wave - 1) % 3 : (Math.floor(wave / 4) - 1) % 3;
  return ["boss", "airship", "fortress"][((index % 3) + 3) % 3];
}
