// Botin: monedas y mejoras que sueltan los enemigos.
import { SHIELD_DURATION } from "../config.js";
import { G } from "../state.js";
import { lerp, overlaps } from "../utils.js";
import { tone } from "../audio.js";
import { createBurst } from "./particles.js";


export function collectPickup(pickup) {
  if (pickup.type === "coin") {
    G.state.coins += 1;
    G.state.score += 100;
    tone(740, 0.065, "square", 0.024, 180);
  } else if (pickup.type === "heart") {
    G.player.hp = Math.min(G.player.maxHp, G.player.hp + 2);
    tone(430, 0.15, "sine", 0.028, 220);
  } else if (pickup.type === "shield") {
    G.player.shield = Math.max(G.player.shield, SHIELD_DURATION);
    tone(520, 0.2, "sine", 0.028, 260);
  } else if (pickup.type === "rapid") {
    // Misma duración que la ráfaga de la tienda (10 s): un solo valor documentado.
    G.player.rapid = Math.max(G.player.rapid, 10);
    tone(300, 0.2, "square", 0.025, 450);
  } else {
    G.state.score += 1500;
    G.player.hp = Math.min(G.player.maxHp, G.player.hp + 1);
    G.player.shield = Math.max(G.player.shield, SHIELD_DURATION);
    tone(320, 0.32, "square", 0.03, 520);
  }
  createBurst(pickup.x, pickup.y, "#ffe653", 12, 150);
  pickup.collected = true;
}


export function updatePickups(dt) {
  for (const pickup of G.pickups) {
    pickup.age += dt;
    pickup.x += pickup.vx * dt;
    pickup.y += pickup.vy * dt;
    pickup.y += Math.sin(pickup.age * 4) * 18 * dt;
    pickup.vx = lerp(pickup.vx, -55, dt);
    pickup.vy *= Math.pow(0.985, dt * 60);
    if (!pickup.collected && overlaps(G.player, pickup, 0.05)) collectPickup(pickup);
    if (pickup.x < -70) pickup.collected = true;
  }
  G.pickups = G.pickups.filter((pickup) => !pickup.collected);
}

