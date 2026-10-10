// Enemigos y jefes: aparicion, disparo, muerte y desprendimientos.
import { W, H, COMBO_TIMEOUT } from "../config.js";
import { G, showToast, comboMultiplier } from "../state.js";
import { rand, clamp, lerp, overlaps, isBossEnemy } from "../utils.js";
import { tone } from "../audio.js";
import { createBurst, createExplosion } from "./particles.js";
import { hurtPlayer } from "./player.js";
import { detonateExplosiveBullet } from "./bullets.js";
import { announceWave } from "../systems/waves.js";
import { unlock, notifyKill } from "../systems/achievements.js";


export function spawnEnemy(forcedType) {
  const difficulty = G.state.difficulty;
  const roll = Math.random();
  let type = forcedType;
  if (!type) {
    if (G.state.wave >= 3 && roll < 0.25) type = "fighter";
    else if (G.state.wave >= 2 && roll < 0.58) type = "drone";
    else type = "heli";
  }

  const base = {
    type,
    x: W + 100,
    y: rand(92, H - 88),
    age: 0,
    phase: rand(0, Math.PI * 2),
    fireTimer: rand(0.7, 2.2) * difficulty.enemyFireIntervalMultiplier,
    dead: false,
    flash: 0,
  };

  if (type === "drone") {
    const hp = Math.max(1, Math.ceil((2 + Math.floor(G.state.wave / 4)) * difficulty.enemyHpMultiplier));
    G.enemies.push({
      ...base,
      w: 76,
      h: 76,
      hp,
      maxHp: hp,
      vx: (rand(190, 245) + G.state.wave * 4) * difficulty.enemySpeedMultiplier,
      score: 180,
      amplitude: rand(38, 82),
    });
  } else if (type === "fighter") {
    const hp = Math.max(1, Math.ceil((3 + Math.floor(G.state.wave / 4)) * difficulty.enemyHpMultiplier));
    G.enemies.push({
      ...base,
      w: 132,
      h: 77,
      hp,
      maxHp: hp,
      vx: (rand(260, 340) + G.state.wave * 5) * difficulty.enemySpeedMultiplier,
      score: 260,
      amplitude: rand(18, 45),
    });
  } else {
    const hp = Math.max(1, Math.ceil((4 + Math.floor(G.state.wave / 3)) * difficulty.enemyHpMultiplier));
    G.enemies.push({
      ...base,
      w: 130,
      h: 98,
      hp,
      maxHp: hp,
      vx: (rand(105, 145) + G.state.wave * 4) * difficulty.enemySpeedMultiplier,
      score: 220,
      amplitude: rand(24, 55),
    });
  }
}


export function spawnBoss() {
  const difficulty = G.state.difficulty;
  const airship = G.state.wave % 8 === 0;
  const hp = Math.ceil((65 + G.state.wave * 8) * difficulty.bossHpMultiplier);
  G.enemies.push({
    type: airship ? "airship" : "boss",
    x: W + (airship ? 230 : 260),
    y: airship ? H * 0.32 : H * 0.5,
    w: airship ? 350 : 350,
    h: airship ? 342 : 182,
    hp,
    maxHp: hp,
    vx: (airship ? 52 : 68) * difficulty.enemySpeedMultiplier,
    age: 0,
    phase: 0,
    fireTimer: airship ? 1.8 : 1.1,
    dead: false,
    flash: 0,
    score: airship ? 6500 : 5000,
    targetX: W - (airship ? 285 : 220),
  });
  G.state.bossSpawned = true;
  G.state.bossActive = true;
  announceWave(airship ? "¡DIRIGIBLE DE GLOBOS!" : "¡ACORAZADO ENEMIGO!");
  tone(airship ? 170 : 92, 0.55, "sawtooth", 0.05, airship ? 80 : -28);
}


function spawnBalloon(airship, offsetY = 0) {
  const difficulty = G.state.difficulty;
  const hp = Math.max(1, Math.ceil(1.2 * difficulty.enemyHpMultiplier));
  G.enemies.push({
    type: "balloon",
    x: airship.x - airship.w * 0.4,
    y: clamp(airship.y + offsetY, 90, H - 90),
    w: 62,
    h: 102,
    hp,
    maxHp: hp,
    vx: (145 + G.state.wave * 4) * difficulty.enemySpeedMultiplier,
    vy: rand(-14, 14),
    age: rand(0, 0.8),
    phase: rand(0, Math.PI * 2),
    fireTimer: Infinity,
    amplitude: rand(28, 54),
    spriteVariant: Math.random() < 0.5 ? 0 : 1,
    dead: false,
    flash: 0,
    score: 340,
  });
}


function releaseBalloonBasket(balloon) {
  const x = balloon.x;
  const y = balloon.y + balloon.h * 0.4;
  const dx = G.player.x - x;
  const dy = G.player.y - y;
  const distance = Math.hypot(dx, dy) || 1;
  G.balloonBaskets.push({
    type: "balloon-basket",
    x,
    y,
    w: 34,
    h: 28,
    vx: (dx / distance) * 180,
    vy: 92,
    age: 0,
    dead: false,
    phase: rand(0, Math.PI * 2),
  });
  createBurst(x, y, "#f3bc55", 9, 115);
  tone(250, 0.08, "triangle", 0.018, -70);
}


function releaseAirshipGondola(airship) {
  const x = airship.x;
  const y = airship.y + airship.h * 0.18;
  G.airshipGondolas.push({
    type: "airship-gondola",
    x,
    y,
    w: 190,
    h: 95,
    vx: -110,
    vy: 82,
    age: 0,
    phase: rand(0, Math.PI * 2),
    dead: false,
  });
  G.state.banner = 1.8;
  G.state.bannerText = "¡GÓNDOLA AL ACECHO!";
  createBurst(x, y, "#ff5b26", 16, 190);
  tone(150, 0.28, "sawtooth", 0.035, -90);
}


function detonateBalloonBasket(basket) {
  if (basket.dead) return;
  basket.dead = true;
  createExplosion(basket.x, basket.y, 78);
  createBurst(basket.x, basket.y, "#f3bc55", 12, 170);
  tone(190, 0.15, "sawtooth", 0.026, 120);

  // The blast is avoidable, but still dangerous if the helicopter stays close.
  if (Math.hypot(G.player.x - basket.x, G.player.y - basket.y) <= 118) {
    hurtPlayer(1);
  }
}


function detonateAirshipGondola(gondola) {
  if (gondola.dead) return;
  gondola.dead = true;
  createExplosion(gondola.x, gondola.y, 112);
  createBurst(gondola.x, gondola.y, "#ff642c", 20, 220);
  tone(125, 0.22, "sawtooth", 0.032, 180);

  if (Math.hypot(G.player.x - gondola.x, G.player.y - gondola.y) <= 142) {
    hurtPlayer(2);
  }
}


function shootEnemy(enemy) {
  const difficulty = G.state.difficulty;
  if (enemy.type === "airship") {
    spawnBalloon(enemy, -30);
    spawnBalloon(enemy, 30);
    enemy.fireTimer = rand(1.7, 2.45) * difficulty.enemyFireIntervalMultiplier;
    tone(280, 0.16, "triangle", 0.022, -80);
    return;
  }
  if (enemy.type === "boss") {
    const angles = [-0.34, -0.17, 0.17, 0.34];
    angles.forEach((angle) => {
      const speed = (230 + G.state.wave * 3) * difficulty.enemySpeedMultiplier;
      G.enemyBullets.push({
        x: enemy.x - enemy.w * 0.38,
        y: enemy.y + 12,
        vx: -Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        w: 35,
        h: 35,
        damage: 1,
        age: 0,
      });
    });
    enemy.fireTimer = rand(1.1, 1.55) * difficulty.enemyFireIntervalMultiplier;
    tone(125, 0.12, "sawtooth", 0.018, -30);
    return;
  }

  const dx = G.player.x - enemy.x;
  const dy = G.player.y - enemy.y;
  const length = Math.hypot(dx, dy) || 1;
  const speed = (enemy.type === "fighter" ? 340 : 250) * difficulty.enemySpeedMultiplier;
  G.enemyBullets.push({
    x: enemy.x - enemy.w * 0.35,
    y: enemy.y + 8,
    vx: (dx / length) * speed,
    vy: (dy / length) * speed,
    w: enemy.type === "drone" ? 27 : 31,
    h: enemy.type === "drone" ? 27 : 31,
    damage: 1,
    age: 0,
  });
  enemy.fireTimer =
    rand(1.5, 2.8) * difficulty.enemyFireIntervalMultiplier * Math.max(0.55, 1 - G.state.wave * 0.025);
}


function dropReward(enemy) {
  const chance = isBossEnemy(enemy) ? 1 : Math.random();
  if (isBossEnemy(enemy)) {
    for (let i = 0; i < 8; i += 1) {
      G.pickups.push({
        type: "coin",
        x: enemy.x + rand(-100, 100),
        y: enemy.y + rand(-70, 70),
        vx: rand(-90, 30),
        vy: rand(-120, 120),
        age: 0,
        w: 44,
        h: 44,
      });
    }
    G.pickups.push({
      type: "star",
      x: enemy.x,
      y: enemy.y,
      vx: -80,
      vy: -30,
      age: 0,
      w: 54,
      h: 54,
    });
  } else if (chance < 0.34) {
    G.pickups.push({
      type: "coin",
      x: enemy.x,
      y: enemy.y,
      vx: -80,
      vy: rand(-35, 35),
      age: 0,
      w: 42,
      h: 42,
    });
  } else if (chance > 0.93) {
    const options = ["rapid", "shield", "heart"];
    G.pickups.push({
      type: options[Math.floor(Math.random() * options.length)],
      x: enemy.x,
      y: enemy.y,
      vx: -65,
      vy: 0,
      age: 0,
      w: 48,
      h: 48,
    });
  }
}


export function killEnemy(enemy) {
  if (enemy.dead) return;
  enemy.dead = true;
  if (enemy.type === "balloon") releaseBalloonBasket(enemy);
  if (enemy.type === "airship") releaseAirshipGondola(enemy);

  // Cada baja seguida alimenta el combo: sube el multiplicador de puntos y
  // se anuncia la racha cada 5 derribos.
  G.state.combo.kills += 1;
  G.state.combo.timer = COMBO_TIMEOUT;
  G.state.combo.best = Math.max(G.state.combo.best, G.state.combo.kills);
  if (G.state.combo.kills >= 15) unlock("imparable");
  if (G.state.combo.kills % 5 === 0) {
    showToast(`¡RACHA x${G.state.combo.kills}!`, "#ffb02e", 1.2);
    tone(420 + G.state.combo.kills * 12, 0.1, "square", 0.03, 150);
  }
  G.state.score += Math.round(enemy.score * G.state.difficulty.scoreMultiplier * comboMultiplier());
  createExplosion(enemy.x, enemy.y, isBossEnemy(enemy) ? (enemy.type === "airship" ? 210 : 240) : enemy.w * 0.88);
  dropReward(enemy);
  notifyKill(enemy);

  if (isBossEnemy(enemy)) {
    G.state.bossActive = false;
    G.state.bossClearTimer = 3.3;
    G.state.flash = 0.35;
    announceWave(enemy.type === "airship" ? "¡DIRIGIBLE DERRIBADO!" : "¡JEFE DERRIBADO!");
    tone(enemy.type === "airship" ? 180 : 120, 0.42, "sawtooth", 0.045, 420);
  } else {
    tone(105, 0.12, "sawtooth", 0.018, -40);
  }
}


export function updateEnemies(dt) {
  for (const enemy of G.enemies) {
    if (enemy.dead) continue;
    enemy.age += dt;
    enemy.flash = Math.max(0, enemy.flash - dt);
    enemy.fireTimer -= dt;

    if (isBossEnemy(enemy)) {
      if (enemy.x > enemy.targetX) enemy.x -= enemy.vx * dt;
      enemy.y = (enemy.type === "airship" ? H * 0.32 : H * 0.5) +
        Math.sin(enemy.age * (enemy.type === "airship" ? 0.65 : 0.9)) *
        (enemy.type === "airship" ? 92 : 145);
    } else if (enemy.type === "balloon") {
      enemy.x -= enemy.vx * dt;
      enemy.y += enemy.vy * dt;
      enemy.y += Math.sin(enemy.age * 3.2 + enemy.phase) * enemy.amplitude * dt;
    } else {
      enemy.x -= enemy.vx * dt;
      enemy.y += Math.sin(enemy.age * (enemy.type === "drone" ? 4 : 2.2) + enemy.phase) *
        enemy.amplitude *
        dt;
    }

    if (
      enemy.type !== "balloon" &&
      enemy.fireTimer <= 0 &&
      enemy.x < W - 70 &&
      enemy.x > G.player.x + 120
    ) {
      shootEnemy(enemy);
    }
    if (enemy.x < -enemy.w) enemy.dead = true;

    const hitboxInset = isBossEnemy(enemy) ? 0.42 : enemy.type === "balloon" ? 0.18 : 0.34;
    const playerEnemyHitbox = clamp(hitboxInset + G.player.hitboxBonus, 0, 0.8);
    if (!enemy.dead && overlaps(G.player, enemy, playerEnemyHitbox)) {
      hurtPlayer(isBossEnemy(enemy) ? 2 : 1);
      if (!isBossEnemy(enemy)) killEnemy(enemy);
    }
  }

  for (const bullet of G.playerBullets) {
    for (const enemy of G.enemies) {
      const hitboxInset = isBossEnemy(enemy) ? 0.25 : enemy.type === "balloon" ? 0.18 : 0.16;
      if (!bullet.dead && !enemy.dead && overlaps(bullet, enemy, hitboxInset)) {
        bullet.dead = true;
        if (bullet.explosive) {
          detonateExplosiveBullet(bullet, enemy);
        } else {
          enemy.hp -= bullet.damage;
          enemy.flash = 0.07;
          createBurst(bullet.x, bullet.y, "#bdfcff", 4, 90);
          if (enemy.hp <= 0) killEnemy(enemy);
        }
      }
    }
  }

  G.enemies = G.enemies.filter((enemy) => !enemy.dead);
}


export function updateBalloonBaskets(dt) {
  for (const basket of G.balloonBaskets) {
    if (basket.dead) continue;
    basket.age += dt;

    // The basket keeps falling, but corrects its horizontal and vertical
    // course toward the helicopter so it remains a dodgeable threat.
    const dx = G.player.x - basket.x;
    const dy = G.player.y - basket.y;
    const desiredVx = clamp(dx * 1.7, -300, 300);
    const desiredVy = clamp(dy * 1.4 + 105, -120, 300);
    basket.vx = lerp(basket.vx, desiredVx, Math.min(1, dt * 2.2));
    basket.vy = lerp(basket.vy, desiredVy, Math.min(1, dt * 1.35));
    basket.x += basket.vx * dt;
    basket.y += basket.vy * dt;

    if (basket.age >= 5) {
      detonateBalloonBasket(basket);
      continue;
    }

    if (overlaps(G.player, basket, clamp(0.14 + G.player.hitboxBonus, 0, 0.8))) {
      detonateBalloonBasket(basket);
    }
  }
  G.balloonBaskets = G.balloonBaskets.filter((basket) => !basket.dead);
}


export function updateAirshipGondolas(dt) {
  for (const gondola of G.airshipGondolas) {
    if (gondola.dead) continue;
    gondola.age += dt;

    const dx = G.player.x - gondola.x;
    const dy = G.player.y - gondola.y;
    const desiredVx = clamp(dx * 1.35, -320, 320);
    const desiredVy = clamp(dy * 1.15 + 80, -170, 260);
    gondola.vx = lerp(gondola.vx, desiredVx, Math.min(1, dt * 1.7));
    gondola.vy = lerp(gondola.vy, desiredVy, Math.min(1, dt * 1.15));
    gondola.x += gondola.vx * dt;
    gondola.y += gondola.vy * dt;

    if (gondola.age >= 10) {
      detonateAirshipGondola(gondola);
      continue;
    }

    if (overlaps(G.player, gondola, clamp(0.22 + G.player.hitboxBonus, 0, 0.8))) {
      detonateAirshipGondola(gondola);
    }
  }
  G.airshipGondolas = G.airshipGondolas.filter((gondola) => !gondola.dead);
}

