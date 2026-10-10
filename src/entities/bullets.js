// Proyectiles: trayectorias, rebotes del escudo y balas explosivas.
import {
  W,
  H,
  SHIELD_RADIUS,
  NEAR_MISS_RADIUS,
  NEAR_MISS_POINTS,
  HOMING_TURN_RATE,
} from "../config.js";
import { G } from "../state.js";
import { rand, clamp, overlaps, isInvulnerableEnemy } from "../utils.js";
import { tone } from "../audio.js";
import { createBurst, createExplosion, createFloater } from "./particles.js";
import { killEnemy } from "./enemies.js";
import { hurtPlayer } from "./player.js";
import { notifyNearMiss } from "../systems/achievements.js";

// El tono de esquiva se limita en densidad para no ametrallar el oído
// cuando varios proyectiles rozan en el mismo fotograma.
let ultimoTonoEsquiva = -1;


// Puntos de esquiva de milagro: lo cobran los proyectiles rozados y también
// los kamikazes cuyo piqué pasa de largo (véase enemies.js).
export function awardNearMiss(x, y) {
  const puntos = Math.round(NEAR_MISS_POINTS * G.state.difficulty.scoreMultiplier);
  G.state.score += puntos;
  G.state.nearMisses += 1;
  createFloater(x, y - 20, `¡ESQUIVA +${puntos}!`, "#9ff3ff");
  if (G.state.elapsed - ultimoTonoEsquiva > 0.12) {
    ultimoTonoEsquiva = G.state.elapsed;
    tone(940, 0.07, "sine", 0.022, 240);
  }
  notifyNearMiss();
}


export function detonateExplosiveBullet(bullet, directHit) {
  const radius = 118;
  for (const enemy of G.enemies) {
    if (enemy.dead || isInvulnerableEnemy(enemy)) continue;
    const distance = Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y);
    if (enemy === directHit || distance <= radius) {
      enemy.hp -= enemy === directHit ? bullet.damage : 1;
      enemy.flash = 0.12;
      createBurst(enemy.x, enemy.y, "#ffcf52", 5, 120);
      if (enemy.hp <= 0) killEnemy(enemy);
    }
  }
  createExplosion(bullet.x, bullet.y, 145);
  tone(180, 0.18, "sawtooth", 0.03, 160);
}


// Misil cargado: daño directo según el tiempo de carga y una onda
// expansiva proporcional alrededor del impacto.
export function detonateChargedBullet(bullet, directHit) {
  for (const enemy of G.enemies) {
    // Igual que el explosivo: la onda alcanza a las torretas pero el
    // casco de la fortaleza sigue blindado mientras quede alguna.
    if (enemy.dead || isInvulnerableEnemy(enemy)) continue;
    const distance = Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y);
    if (enemy === directHit || distance <= bullet.blastRadius) {
      enemy.hp -= enemy === directHit ? bullet.damage : bullet.splashDamage;
      enemy.flash = 0.12;
      createBurst(enemy.x, enemy.y, "#ffb02e", 5, 130);
      if (enemy.hp <= 0) killEnemy(enemy);
    }
  }
  createExplosion(bullet.x, bullet.y, bullet.blastRadius * 1.35);
  tone(150, 0.26, "sawtooth", 0.038, 120);
}


function nearestEnemyTo(x, y) {
  let best = null;
  let bestDistance = Infinity;
  for (const enemy of G.enemies) {
    if (enemy.dead) continue;
    const distance = Math.hypot(enemy.x - x, enemy.y - y);
    if (distance < bestDistance) {
      best = enemy;
      bestDistance = distance;
    }
  }
  return best;
}


function steerHoming(bullet, dt) {
  const target = nearestEnemyTo(bullet.x, bullet.y);
  if (!target) return;
  const heading = Math.atan2(bullet.vy, bullet.vx);
  const desired = Math.atan2(target.y - bullet.y, target.x - bullet.x);
  let delta = desired - heading;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  const step = clamp(delta, -HOMING_TURN_RATE * dt, HOMING_TURN_RATE * dt);
  const speed = Math.hypot(bullet.vx, bullet.vy) || 1;
  bullet.vx = Math.cos(heading + step) * speed;
  bullet.vy = Math.sin(heading + step) * speed;
}


export function updateProjectiles(dt) {
  for (const bullet of G.playerBullets) {
    if (bullet.homing) steerHoming(bullet, dt);
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    // Estela de los misiles especiales: teledirigidos en verde, cargado en ámbar.
    if ((bullet.homing || bullet.charged) && Math.random() < dt * 30) {
      G.particles.push({
        x: bullet.x - Math.sign(bullet.vx) * bullet.w * 0.45,
        y: bullet.y,
        vx: -rand(50, 130),
        vy: rand(-22, 22),
        life: rand(0.12, 0.22),
        maxLife: 0.22,
        size: rand(2, 4),
        color: bullet.homing ? "#b6ff3c" : "#ffb02e",
      });
    }
    if (bullet.x > W + 120 || bullet.y < -40 || bullet.y > H + 40) bullet.dead = true;
  }

  for (const bullet of G.enemyBullets) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.age += dt;
    if (!bullet.dead && !bullet.reflected && G.player.shield > 0) {
      const dx = bullet.x - G.player.x;
      const dy = bullet.y - G.player.y;
      const distance = Math.hypot(dx, dy) || 1;
      const bulletRadius = Math.max(bullet.w, bullet.h) * 0.42;
      if (distance <= SHIELD_RADIUS + bulletRadius) {
        const nx = dx / distance;
        const ny = dy / distance;
        const speed = Math.hypot(bullet.vx, bullet.vy) || 1;
        const dot = bullet.vx * nx + bullet.vy * ny;
        const reflectedVx = bullet.vx - 2 * dot * nx;
        const reflectedVy = bullet.vy - 2 * dot * ny;
        const reflectedSpeed = Math.hypot(reflectedVx, reflectedVy) || speed;
        const reboundSpeed = Math.max(speed * 1.08, 260);

        bullet.reflected = true;
        bullet.x = G.player.x + nx * (SHIELD_RADIUS + bulletRadius + 2);
        bullet.y = G.player.y + ny * (SHIELD_RADIUS + bulletRadius + 2);
        bullet.vx = (reflectedVx / reflectedSpeed) * reboundSpeed;
        bullet.vy = (reflectedVy / reflectedSpeed) * reboundSpeed;
        bullet.damage = Math.max(2, bullet.damage * 2);
        bullet.age = 0;
        createBurst(bullet.x, bullet.y, "#68d8ff", 10, 180);
        tone(760, 0.1, "sine", 0.03, -260);
      }
    }
    const bulletHitbox = clamp(
      G.state.difficulty.enemyBulletHitboxInset + G.player.hitboxBonus,
      0,
      0.8,
    );
    // Esquiva de milagro: el proyectil roza al helicóptero sin tocarlo.
    // Se premia una vez por proyectil, solo si no lo está impactando y el
    // jugador no está en el período de invulnerabilidad tras un golpe.
    if (
      !bullet.dead &&
      !bullet.reflected &&
      !bullet.grazed &&
      G.player.invulnerable <= 0 &&
      Math.hypot(bullet.x - G.player.x, bullet.y - G.player.y) <= NEAR_MISS_RADIUS &&
      !overlaps(G.player, bullet, bulletHitbox)
    ) {
      bullet.grazed = true;
      awardNearMiss(bullet.x, bullet.y);
    }
    if (!bullet.dead && !bullet.reflected && overlaps(G.player, bullet, bulletHitbox)) {
      bullet.dead = true;
      hurtPlayer(bullet.damage);
    }
    if (!bullet.dead && bullet.reflected) {
      for (const enemy of G.enemies) {
        if (!enemy.dead && overlaps(bullet, enemy, 0.2)) {
          bullet.dead = true;
          if (isInvulnerableEnemy(enemy)) {
            createBurst(bullet.x, bullet.y, "#c9d6dc", 5, 95);
          } else {
            enemy.hp -= bullet.damage;
            enemy.flash = 0.1;
            createBurst(bullet.x, bullet.y, "#68d8ff", 7, 125);
            if (enemy.hp <= 0) killEnemy(enemy);
          }
          break;
        }
      }
    }
    if (bullet.x < -60 || bullet.x > W + 60 || bullet.y < -60 || bullet.y > H + 60) {
      bullet.dead = true;
    }
  }

  G.playerBullets = G.playerBullets.filter((bullet) => !bullet.dead);
  G.enemyBullets = G.enemyBullets.filter((bullet) => !bullet.dead);
}

