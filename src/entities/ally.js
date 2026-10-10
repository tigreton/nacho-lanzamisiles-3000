// Dron aliado: escolta comprada en la armería que acompaña durante una
// oleada completa y dispara al enemigo más cercano por su cuenta.
import { W, H, ALLY_OFFSET_X, ALLY_OFFSET_Y, ALLY_FIRE_INTERVAL, ALLY_BULLET_SPEED } from "../config.js";
import { G } from "../state.js";
import { clamp, lerp } from "../utils.js";
import { tone } from "../audio.js";
import { createBurst } from "./particles.js";


export function spawnAlly() {
  if (!G.player) return;
  G.ally = {
    x: G.player.x + ALLY_OFFSET_X,
    y: G.player.y + ALLY_OFFSET_Y,
    cooldown: 0.6,
    age: 0,
  };
  createBurst(G.ally.x, G.ally.y, "#6cecff", 14, 160);
  tone(520, 0.12, "sine", 0.03, 200);
}


function nearestEnemyTo(x, y, maxDistance) {
  let best = null;
  let bestDistance = maxDistance;
  for (const enemy of G.enemies) {
    if (enemy.dead) continue;
    const distance = Math.hypot(enemy.x - x, enemy.y - y);
    if (distance <= bestDistance) {
      best = enemy;
      bestDistance = distance;
    }
  }
  return best;
}


export function updateAlly(dt) {
  if (!G.ally) return;
  const ally = G.ally;
  ally.age += dt;
  ally.x = lerp(ally.x, G.player.x + ALLY_OFFSET_X, Math.min(1, dt * 5));
  ally.y = lerp(ally.y, G.player.y + ALLY_OFFSET_Y, Math.min(1, dt * 5));
  ally.x = clamp(ally.x, 46, W - 46);
  ally.y = clamp(ally.y, 60, H - 60);
  ally.cooldown -= dt;

  if (ally.cooldown > 0) return;
  const target = nearestEnemyTo(ally.x, ally.y, 980);
  if (!target) {
    ally.cooldown = 0.15;
    return;
  }
  const dx = target.x - ally.x;
  const dy = target.y - ally.y;
  const length = Math.hypot(dx, dy) || 1;
  G.playerBullets.push({
    x: ally.x + 26,
    y: ally.y + 4,
    vx: (dx / length) * ALLY_BULLET_SPEED,
    vy: (dy / length) * ALLY_BULLET_SPEED,
    w: 46,
    h: 18,
    damage: 1,
    fromAlly: true,
  });
  ally.cooldown = ALLY_FIRE_INTERVAL;
  tone(700, 0.03, "square", 0.006, 120);
}
