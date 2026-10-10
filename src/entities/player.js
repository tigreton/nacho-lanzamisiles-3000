// Jugador: movimiento, disparo y dano.
import { W, H, HELICOPTERS } from "../config.js";
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
  let usedExplosive = false;
  spread.forEach((angle) => {
    const speed = 800;
    const explosive = explosiveShots > 0;
    if (explosive) explosiveShots -= 1;
    usedExplosive ||= explosive;
    G.playerBullets.push({
      x: G.player.x + G.player.w * 0.42,
      y: G.player.y + 12,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      w: explosive ? 72 : G.player.rapid > 0 ? 57 : 64,
      h: explosive ? 28 : G.player.rapid > 0 ? 22 : 25,
      damage: explosive ? 2 : 1,
      explosive,
    });
  });
  G.player.explosiveAmmo = explosiveShots;
  G.player.cooldown = (G.player.rapid > 0 ? 0.105 : 0.19) * G.player.fireCooldownMultiplier;
  createBurst(G.player.x + G.player.w * 0.45, G.player.y + 10, usedExplosive ? "#ff8a18" : "#8ef8ff", 3, 45);
  tone(usedExplosive ? 380 : G.player.rapid > 0 ? 640 : 520, 0.035, "square", 0.008, 90);
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
  if (firing && G.player.cooldown <= 0) shootPlayer();
}

