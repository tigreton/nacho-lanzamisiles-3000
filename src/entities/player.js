// Jugador: movimiento, disparo, carga y dano.
import { W, H, HELICOPTERS, CHARGE_TIME, CHARGE_MIN, CHARGE_COOLDOWN } from "../config.js";
import { G } from "../state.js";
import { clamp, lerp } from "../utils.js";
import { tone } from "../audio.js";
import { createBurst, createExplosion } from "./particles.js";
import { endGame } from "../systems/gameover.js";


export function applyHelicopterStats(id) {
  const stats = HELICOPTERS[id];
  if (!stats || !G.player || !G.state) return;
  const previousHp = G.player.hp;
  G.player.helicopter = id;
  G.player.maxHp = G.state.difficulty.playerHp + stats.maxHpBonus;
  G.player.hp = Math.min(previousHp, G.player.maxHp);
  G.player.speedMultiplier = stats.speedMultiplier;
  G.player.fireCooldownMultiplier = stats.fireCooldownMultiplier;
  G.player.damageReduction = stats.damageReduction;
  G.player.hitboxBonus = stats.hitboxBonus;
}


export function shootPlayer() {
  const spread = G.player.rapid > 0 ? [-0.07, 0.07] : [0];
  let explosiveShots = G.player.explosiveAmmo;
  let homingShots = G.player.homingAmmo;
  let usedExplosive = false;
  let usedHoming = false;
  spread.forEach((angle) => {
    const speed = 800;
    const explosive = explosiveShots > 0;
    const homing = !explosive && homingShots > 0;
    if (explosive) explosiveShots -= 1;
    if (homing) homingShots -= 1;
    usedExplosive ||= explosive;
    usedHoming ||= homing;
    G.playerBullets.push({
      x: G.player.x + G.player.w * 0.42,
      y: G.player.y + 12,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      w: explosive ? 72 : homing ? 58 : G.player.rapid > 0 ? 57 : 64,
      h: explosive ? 28 : homing ? 24 : G.player.rapid > 0 ? 22 : 25,
      damage: explosive || homing ? 2 : 1,
      explosive,
      homing,
      ignoresArmor: explosive || homing,
    });
  });
  G.player.explosiveAmmo = explosiveShots;
  G.player.homingAmmo = homingShots;
  G.player.cooldown = (G.player.rapid > 0 ? 0.105 : 0.19) * G.player.fireCooldownMultiplier;
  const flashColor = usedExplosive ? "#ff8a18" : usedHoming ? "#b6ff3c" : "#8ef8ff";
  createBurst(G.player.x + G.player.w * 0.45, G.player.y + 10, flashColor, 3, 45);
  tone(usedExplosive ? 380 : usedHoming ? 460 : G.player.rapid > 0 ? 640 : 520, 0.035, "square", 0.008, 90);
}


// Misil cargado: daño y radio de la onda expansiva crecen con la carga.
export function fireChargedShot() {
  const charge01 = clamp(G.player.charge / CHARGE_TIME, 0, 1);
  G.playerBullets.push({
    x: G.player.x + G.player.w * 0.42,
    y: G.player.y + 12,
    vx: 640,
    vy: 0,
    w: 122,
    h: 46,
    damage: 2 + Math.floor(charge01 * 3),
    splashDamage: 1,
    blastRadius: 70 + charge01 * 70,
    charged: true,
    ignoresArmor: true,
  });
  G.player.cooldown = CHARGE_COOLDOWN * G.player.fireCooldownMultiplier;
  G.state.shake = Math.max(G.state.shake, 5);
  createBurst(G.player.x + G.player.w * 0.45, G.player.y + 10, "#ffb02e", 8, 130);
  tone(240, 0.16, "sawtooth", 0.03, 60);
}


export function hurtPlayer(damage) {
  if (G.player.invulnerable > 0) return;
  if (G.player.shield > 0) {
    G.player.invulnerable = 0.28;
    G.player.shield = Math.max(0, G.player.shield - 0.7);
    createBurst(G.player.x, G.player.y, "#68cfff", 12, 190);
    tone(710, 0.1, "sine", 0.03, -250);
    return;
  }

  const actualDamage = damage * (1 - G.player.damageReduction);
  G.player.hp -= actualDamage;
  G.player.invulnerable = 1.05;
  // Recibir un daño rompe el combo y la oleada deja de ser "intocable".
  G.state.combo.kills = 0;
  G.state.combo.timer = 0;
  G.state.waveDamageTaken = true;
  G.state.shake = 12;
  G.state.flash = 0.16;
  createExplosion(G.player.x + 18, G.player.y, 72);
  tone(140, 0.22, "sawtooth", 0.035, -90);
  if (G.player.hp <= 0) endGame();
}


export function updatePlayer(dt) {
  let dx = 0;
  let dy = 0;
  if (G.keys.has("ArrowLeft") || G.keys.has("KeyA")) dx -= 1;
  if (G.keys.has("ArrowRight") || G.keys.has("KeyD")) dx += 1;
  if (G.keys.has("ArrowUp") || G.keys.has("KeyW")) dy -= 1;
  if (G.keys.has("ArrowDown") || G.keys.has("KeyS")) dy += 1;

  if (dx || dy) {
    const length = Math.hypot(dx, dy);
    const movementSpeed = 390 * G.player.speedMultiplier;
    G.player.x += (dx / length) * movementSpeed * dt;
    G.player.y += (dy / length) * movementSpeed * dt;
    G.player.tilt = lerp(G.player.tilt, (dy / length) * 0.11, dt * 9);
  } else if (G.pointer.active) {
    const pointerSpeed = G.player.speedMultiplier * 8;
    G.player.x = lerp(G.player.x, G.pointer.x, Math.min(1, dt * pointerSpeed));
    G.player.y = lerp(G.player.y, G.pointer.y, Math.min(1, dt * pointerSpeed));
    G.player.tilt = lerp(G.player.tilt, clamp((G.pointer.y - G.player.y) / 260, -0.11, 0.11), dt * pointerSpeed);
  } else {
    G.player.tilt = lerp(G.player.tilt, 0, dt * 6);
  }

  G.player.x = clamp(G.player.x, 68, W - 80);
  G.player.y = clamp(G.player.y, 70, H - 68);
  G.player.cooldown = Math.max(0, G.player.cooldown - dt);
  G.player.invulnerable = Math.max(0, G.player.invulnerable - dt);
  G.player.shield = Math.max(0, G.player.shield - dt);
  G.player.rapid = Math.max(0, G.player.rapid - dt);
  G.player.frame = Math.floor(G.state.elapsed * 8) % G.sprites.player.length;

  const firing = G.keys.has("Space") || G.keys.has("KeyJ") || G.pointer.active;
  // Carga de disparo: mantener pulsado sigue disparando y además carga el
  // misil grande; al soltar, si la carga pasó el mínimo, se dispara.
  if (firing) {
    G.player.charge = Math.min(CHARGE_TIME, G.player.charge + dt);
    if (G.player.charge >= CHARGE_TIME && !G.player.chargeFull) {
      G.player.chargeFull = true;
      tone(980, 0.09, "square", 0.026, 120);
    }
    if (G.player.cooldown <= 0) shootPlayer();
  } else if (G.player.charge > 0) {
    if (G.player.charge >= CHARGE_MIN) fireChargedShot();
    G.player.charge = 0;
    G.player.chargeFull = false;
  }
}

