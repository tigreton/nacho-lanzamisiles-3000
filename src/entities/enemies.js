// Enemigos y jefes: aparicion, disparo, muerte y desprendimientos.
import {
  W,
  H,
  COMBO_TIMEOUT,
  KAMIKAZE_TRIGGER_DISTANCE,
  KAMIKAZE_TELEGRAPH,
  KAMIKAZE_DIVE_SPEED,
  KAMIKAZE_DAMAGE,
  SQUAD_SIZE,
  SQUAD_DISPERSE_X,
  SQUAD_BONUS_COINS,
  SQUAD_BONUS_SCORE,
  GUNSHIP_WEAKPOINT,
  GUNSHIP_ARMOR,
  BOSSES,
  FORTRESS_TURRETS,
  BOSS_PHASE2_RATIO,
} from "../config.js";
import { G, showToast, comboMultiplier } from "../state.js";
import { rand, clamp, lerp, overlaps, isBossEnemy, isInvulnerableEnemy, bossKindForWave } from "../utils.js";
import { tone } from "../audio.js";
import { createBurst, createExplosion, createFloater } from "./particles.js";
import { hurtPlayer } from "./player.js";
import { detonateExplosiveBullet, detonateChargedBullet, awardNearMiss } from "./bullets.js";
import { announceWave } from "../systems/waves.js";
import { unlock, notifyKill } from "../systems/achievements.js";


export function spawnEnemy(forcedType) {
  const difficulty = G.state.difficulty;
  const roll = Math.random();
  let type = forcedType;
  if (!type) {
    // En supervivencia la cacería de cazas crece con las oleadas para que
    // la presión siga subiendo pasada la oleada 15: se ensancha la franja
    // del sorteo a costa de los drones.
    const umbralCaza = G.state.wave >= 3
      ? 0.44 + (G.state.gameMode === "supervivencia" ? Math.min(0.2, G.state.wave * 0.006) : 0)
      : 0.44;
    if (G.state.wave >= 5 && roll < 0.07) type = "gunship";
    else if (G.state.wave >= 4 && roll < 0.19) type = "kamikaze";
    else if (G.state.wave >= 3 && roll < umbralCaza) type = "fighter";
    else if (G.state.wave >= 2 && roll < 0.72) type = "drone";
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
  } else if (type === "kamikaze") {
    // Frágil pero letal: su cuerpo es el arma, así que nunca dispara.
    const hp = Math.max(1, Math.ceil((2 + Math.floor(G.state.wave / 6)) * difficulty.enemyHpMultiplier));
    G.enemies.push({
      ...base,
      w: 82,
      h: 74,
      hp,
      maxHp: hp,
      vx: (rand(230, 280) + G.state.wave * 4) * difficulty.enemySpeedMultiplier,
      score: 300,
      amplitude: rand(30, 60),
      fireTimer: Infinity,
      diveState: "patrol",
      telegraphTimer: 0,
      beepTimer: 0,
      grazeAwarded: false,
    });
  } else if (type === "gunship") {
    // Blindado por delante: solo el punto débil superior-trasero recibe
    // daño de los disparos normales.
    const hp = Math.max(1, Math.ceil((13 + G.state.wave * 2) * difficulty.enemyHpMultiplier));
    G.enemies.push({
      ...base,
      y: rand(150, H - 130),
      w: 152,
      h: 106,
      hp,
      maxHp: hp,
      vx: 55 * difficulty.enemySpeedMultiplier,
      score: 620,
      amplitude: rand(10, 22),
      fireTimer: rand(1.2, 2) * difficulty.enemyFireIntervalMultiplier,
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


// Escuadrón en V: cinco cazas que comparten ancla hasta dispersarse.
// Si caen todos antes de la dispersión, el escuadrón suelta monedas extra.
export function spawnSquad() {
  const difficulty = G.state.difficulty;
  const id = G.state.squadSeq + 1;
  G.state.squadSeq = id;
  const hp = Math.max(1, Math.ceil((3 + Math.floor(G.state.wave / 4)) * difficulty.enemyHpMultiplier));
  const squad = {
    id,
    total: SQUAD_SIZE,
    kills: 0,
    dispersed: false,
    x: W + 200,
    y: rand(180, H - 180),
    vx: (175 + G.state.wave * 3) * difficulty.enemySpeedMultiplier,
    age: 0,
  };
  G.state.squads[id] = squad;

  const offsets = [
    [0, 0],
    [-72, -52],
    [-72, 52],
    [-144, -104],
    [-144, 104],
  ];
  offsets.forEach(([offsetX, offsetY]) => {
    G.enemies.push({
      type: "fighter",
      x: squad.x + offsetX,
      y: squad.y + offsetY,
      w: 132,
      h: 77,
      hp,
      maxHp: hp,
      vx: squad.vx,
      score: 260,
      age: 0,
      phase: rand(0, Math.PI * 2),
      fireTimer: rand(1.6, 3.6) * difficulty.enemyFireIntervalMultiplier,
      dead: false,
      flash: 0,
      squadId: id,
      squadOffset: { x: offsetX, y: offsetY },
      amplitude: rand(18, 45),
    });
  });
  showToast("¡ESCUADRÓN EN FORMACIÓN!", "#ff9d3c", 1.6);
  tone(320, 0.14, "square", 0.03, 60);
}


function rewardSquadWipe(squad) {
  for (let i = 0; i < SQUAD_BONUS_COINS; i += 1) {
    G.pickups.push({
      type: "coin",
      x: squad.x + rand(-120, 60),
      y: squad.y + rand(-90, 90),
      vx: rand(-90, 30),
      vy: rand(-120, 120),
      age: 0,
      w: 44,
      h: 44,
    });
  }
  G.state.score += Math.round(SQUAD_BONUS_SCORE * G.state.difficulty.scoreMultiplier);
  showToast(`¡ESCUADRÓN COMPLETO! +${SQUAD_BONUS_COINS}★`, "#ffd63c", 1.8);
  createBurst(squad.x, squad.y, "#ffd63c", 18, 220);
  tone(520, 0.1, "square", 0.03, 140);
  setTimeout(() => tone(780, 0.14, "square", 0.03), 100);
}


// Las anclas avanzan y marcan la dispersión; al quedar sin miembros vivos
// el escuadrón se retira del registro.
function updateSquads(dt) {
  for (const id of Object.keys(G.state.squads)) {
    const squad = G.state.squads[id];
    squad.age += dt;
    if (!squad.dispersed) {
      squad.x -= squad.vx * dt;
      squad.y += Math.sin(squad.age * 1.1) * 16 * dt;
      if (squad.x < SQUAD_DISPERSE_X || squad.age >= 7.5) {
        squad.dispersed = true;
        showToast("¡ESCUADRÓN DISPERSO!", "#ffffff", 1.1);
      }
    }
    const quedanMiembros = G.enemies.some((enemy) => enemy.squadId === squad.id && !enemy.dead);
    if (!quedanMiembros) delete G.state.squads[id];
  }
}


// En solo jefes no hay oleadas normales: cada jefe escala como su
// equivalente de campaña (jefe 1 = oleada 4, jefe 2 = oleada 8…) para
// conservar la curva de dificultad.
function waveEfectiva() {
  return G.state.gameMode === "jefes" ? G.state.wave * 4 : G.state.wave;
}


export function spawnBoss() {
  const difficulty = G.state.difficulty;
  const kind = bossKindForWave(G.state.wave, G.state.gameMode);
  const spec = BOSSES[kind];
  const hp = Math.ceil((65 + waveEfectiva() * 8) * difficulty.bossHpMultiplier);
  const boss = {
    type: kind,
    x: W + spec.spawnX,
    y: H * spec.yRatio,
    baseY: H * spec.yRatio,
    w: spec.w,
    h: spec.h,
    hp,
    maxHp: hp,
    vx: spec.vx * difficulty.enemySpeedMultiplier,
    age: 0,
    phase: 0,
    phase2: false,
    fireTimer: spec.fireTimer,
    bobAmp: spec.bobAmp,
    bobFreq: spec.bobFreq,
    dead: false,
    flash: 0,
    score: spec.score,
    targetX: W - spec.targetX,
  };
  G.enemies.push(boss);
  if (kind === "fortress") spawnFortressTurrets(boss);
  G.state.bossSpawned = true;
  G.state.bossActive = true;
  announceWave(spec.announce);
  tone(spec.toneFreq, 0.55, "sawtooth", 0.05, spec.toneSlide);
}


// La fortaleza no dispara: cuelgan de su casco torretas destructibles y
// el casco rebota todo mientras quede alguna en pie.
function spawnFortressTurrets(boss) {
  boss.turretSockets = FORTRESS_TURRETS.map((socket) => ({ ...socket, alive: true }));
  boss.turretsLeft = boss.turretSockets.length;
  const hp = Math.max(1, Math.ceil(14 * G.state.difficulty.enemyHpMultiplier));
  boss.turretSockets.forEach((socket, index) => {
    G.enemies.push({
      type: "turret",
      parent: boss,
      socketIndex: index,
      turretKind: socket.kind,
      offsetX: socket.offsetX,
      offsetY: socket.offsetY,
      x: boss.x + socket.offsetX,
      y: boss.y + socket.offsetY,
      w: 64,
      h: 56,
      hp,
      maxHp: hp,
      vx: 0,
      age: rand(0, 0.8),
      phase: rand(0, Math.PI * 2),
      fireTimer: rand(0.9, 2.1) * G.state.difficulty.enemyFireIntervalMultiplier,
      dead: false,
      flash: 0,
      score: 900,
    });
  });
  showToast("¡DERRIBA LAS 4 TORRETAS!", "#ff8a5c", 2.4);
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
    vx: (145 + waveEfectiva() * 4) * difficulty.enemySpeedMultiplier,
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
    // En fase final suelta globos en tandas de tres y más a menudo.
    if (enemy.phase2) {
      spawnBalloon(enemy, -32);
      spawnBalloon(enemy, 0);
      spawnBalloon(enemy, 32);
      enemy.fireTimer = rand(1.25, 1.8) * difficulty.enemyFireIntervalMultiplier;
    } else {
      spawnBalloon(enemy, -30);
      spawnBalloon(enemy, 30);
      enemy.fireTimer = rand(1.7, 2.45) * difficulty.enemyFireIntervalMultiplier;
    }
    tone(280, 0.16, "triangle", 0.022, -80);
    return;
  }
  if (enemy.type === "boss") {
    const angles = enemy.phase2
      ? [-0.5, -0.3, -0.12, 0.12, 0.3, 0.5]
      : [-0.34, -0.17, 0.17, 0.34];
    angles.forEach((angle) => {
      const speed = (230 + waveEfectiva() * 3) *
        (enemy.phase2 ? 1.12 : 1) *
        difficulty.enemySpeedMultiplier;
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
    enemy.fireTimer = rand(enemy.phase2 ? 0.76 : 1.1, enemy.phase2 ? 1.08 : 1.55) *
      difficulty.enemyFireIntervalMultiplier;
    tone(125, 0.12, "sawtooth", 0.018, -30);
    return;
  }
  if (enemy.type === "turret") {
    shootTurret(enemy, difficulty);
    return;
  }

  const dx = G.player.x - enemy.x;
  const dy = G.player.y - enemy.y;
  const length = Math.hypot(dx, dy) || 1;
  const speed = (enemy.type === "fighter" ? 340 : enemy.type === "gunship" ? 265 : 250) *
    difficulty.enemySpeedMultiplier;
  G.enemyBullets.push({
    x: enemy.x - enemy.w * 0.35,
    y: enemy.y + 8,
    vx: (dx / length) * speed,
    vy: (dy / length) * speed,
    w: enemy.type === "drone" ? 27 : enemy.type === "gunship" ? 39 : 31,
    h: enemy.type === "drone" ? 27 : enemy.type === "gunship" ? 39 : 31,
    damage: 1,
    age: 0,
  });
  const baseInterval = enemy.type === "gunship" ? rand(2.3, 3.1) : rand(1.5, 2.8);
  enemy.fireTimer =
    baseInterval * difficulty.enemyFireIntervalMultiplier * Math.max(0.55, 1 - G.state.wave * 0.025);
}


// Torretas de la fortaleza: las de abanico barren un arco fijo y las de
// puntería siguen al helicóptero. Cuando la fortaleza entra en fase final
// disparan más rápido (y el abanico gana un proyectil).
function shootTurret(enemy, difficulty) {
  const furiosa = enemy.parent?.phase2;
  if (enemy.turretKind === "spread") {
    const angles = furiosa ? [-0.42, -0.15, 0.15, 0.42] : [-0.31, 0, 0.31];
    const speed = 240 * difficulty.enemySpeedMultiplier;
    angles.forEach((angle) => {
      G.enemyBullets.push({
        x: enemy.x - 26,
        y: enemy.y,
        vx: -Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        w: 29,
        h: 29,
        damage: 1,
        age: 0,
      });
    });
    enemy.fireTimer = rand(1.9, 2.4) * difficulty.enemyFireIntervalMultiplier * (furiosa ? 0.62 : 1);
    tone(150, 0.1, "square", 0.016, -30);
  } else {
    const dx = G.player.x - enemy.x;
    const dy = G.player.y - enemy.y;
    const length = Math.hypot(dx, dy) || 1;
    const speed = 330 * difficulty.enemySpeedMultiplier;
    G.enemyBullets.push({
      x: enemy.x - 26,
      y: enemy.y,
      vx: (dx / length) * speed,
      vy: (dy / length) * speed,
      w: 27,
      h: 27,
      damage: 1,
      age: 0,
    });
    enemy.fireTimer = rand(1.25, 1.75) * difficulty.enemyFireIntervalMultiplier * (furiosa ? 0.6 : 1);
    tone(210, 0.08, "square", 0.016, -50);
  }
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


// Cada torreta derribada es un mini-objetivo: castiga el casco de la
// fortaleza a partes iguales y anuncia cuántas quedan. Cuando no queda
// ninguna, la fortaleza entera cae con ella.
function derribarTorreta(turret) {
  createExplosion(turret.x, turret.y, 96);
  createFloater(turret.x, turret.y - 44, "¡TORRETA DERRIBADA!", "#ffd63c");
  tone(300, 0.14, "square", 0.028, 120);
  const boss = turret.parent;
  if (!boss || boss.dead) return;
  boss.turretSockets[turret.socketIndex].alive = false;
  boss.turretsLeft = boss.turretSockets.filter((socket) => socket.alive).length;
  // Con floor, caer a la mitad de las torretas deja el casco en la mitad
  // de vida o menos: la furia arranca exactamente al 50% del recorrido.
  boss.hp = Math.min(boss.hp, Math.floor((boss.maxHp * boss.turretsLeft) / boss.turretSockets.length));
  boss.flash = 0.12;
  if (boss.turretsLeft > 0) {
    showToast(`¡QUEDAN ${boss.turretsLeft} TORRETAS!`, "#ffb02e", 1.2);
  }
  if (boss.hp <= 0) killEnemy(boss);
}


export function killEnemy(enemy) {
  if (enemy.dead) return;
  enemy.dead = true;
  if (enemy.type === "balloon") releaseBalloonBasket(enemy);
  if (enemy.type === "airship") releaseAirshipGondola(enemy);
  if (enemy.type === "turret") derribarTorreta(enemy);

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
  const explosionSize = isBossEnemy(enemy)
    ? (enemy.type === "airship" ? 210 : 240)
    : enemy.type === "kamikaze"
      ? 120
      : enemy.w * 0.88;
  createExplosion(enemy.x, enemy.y, explosionSize);
  dropReward(enemy);
  notifyKill(enemy);

  // Escuadrón: la última baja antes de la dispersión dispara el bonus.
  if (enemy.squadId != null) {
    const squad = G.state.squads[enemy.squadId];
    if (squad && !squad.dispersed) {
      squad.kills += 1;
      if (squad.kills >= squad.total) rewardSquadWipe(squad);
    }
  }

  if (isBossEnemy(enemy)) {
    G.state.bossActive = false;
    G.state.bossClearTimer = 3.3;
    G.state.flash = 0.35;
    announceWave(BOSSES[enemy.type].defeatedText);
    tone(enemy.type === "airship" ? 180 : enemy.type === "fortress" ? 90 : 120, 0.42, "sawtooth", 0.045, 420);
  } else {
    tone(105, 0.12, "sawtooth", 0.018, -40);
  }
}


// El punto débil del blindado es un círculo sobre el sprite (daño doble) y
// la coraza es la propia placa frontal dibujada: los disparos que la tocan
// rebotan; el resto del casco recibe daño normal.
function hitsGunshipWeakpoint(bullet, enemy) {
  const weakX = enemy.x + enemy.w * GUNSHIP_WEAKPOINT.offsetX;
  const weakY = enemy.y + enemy.h * GUNSHIP_WEAKPOINT.offsetY;
  const radius = enemy.w * GUNSHIP_WEAKPOINT.radius + Math.max(bullet.w, bullet.h) * 0.25;
  return Math.hypot(bullet.x - weakX, bullet.y - weakY) <= radius;
}


function hitsGunshipArmor(bullet, enemy) {
  const margen = bullet.w * 0.3;
  const dentroX =
    bullet.x >= enemy.x + GUNSHIP_ARMOR.x1 * enemy.w - margen &&
    bullet.x <= enemy.x + GUNSHIP_ARMOR.x2 * enemy.w;
  const dentroY =
    bullet.y >= enemy.y + GUNSHIP_ARMOR.y1 * enemy.h &&
    bullet.y <= enemy.y + GUNSHIP_ARMOR.y2 * enemy.h;
  return dentroX && dentroY;
}


export function updateEnemies(dt) {
  updateSquads(dt);

  for (const enemy of G.enemies) {
    if (enemy.dead) continue;
    enemy.age += dt;
    enemy.flash = Math.max(0, enemy.flash - dt);
    enemy.fireTimer -= dt;

    const squad = enemy.squadId != null ? G.state.squads[enemy.squadId] : null;

    // Fase final: al quedararse a la mitad de vida el jefe cambia de
    // patrón, aprieta el ritmo y se mueve con más brío.
    if (
      isBossEnemy(enemy) &&
      !enemy.phase2 &&
      enemy.hp <= enemy.maxHp * BOSS_PHASE2_RATIO
    ) {
      enemy.phase2 = true;
      enemy.flash = Math.max(enemy.flash, 0.3);
      G.state.shake = Math.max(G.state.shake, 9);
      announceWave("¡FASE FINAL! ¡EL JEFE SE ENFURECE!");
      tone(60, 0.6, "sawtooth", 0.05, 30);
    }

    if (isBossEnemy(enemy)) {
      if (enemy.x > enemy.targetX) enemy.x -= enemy.vx * dt;
      enemy.y = enemy.baseY +
        Math.sin(enemy.age * enemy.bobFreq * (enemy.phase2 ? 1.28 : 1)) * enemy.bobAmp;
    } else if (enemy.type === "turret") {
      // Las torretas van soldadas al casco de la fortaleza.
      enemy.x = enemy.parent.x + enemy.offsetX;
      enemy.y = enemy.parent.y + enemy.offsetY;
    } else if (enemy.type === "balloon") {
      enemy.x -= enemy.vx * dt;
      enemy.y += enemy.vy * dt;
      enemy.y += Math.sin(enemy.age * 3.2 + enemy.phase) * enemy.amplitude * dt;
    } else if (enemy.type === "kamikaze") {
      if (enemy.diveState === "patrol") {
        enemy.x -= enemy.vx * dt;
        enemy.y += Math.sin(enemy.age * 3.4 + enemy.phase) * enemy.amplitude * dt;
        const distancia = Math.hypot(G.player.x - enemy.x, G.player.y - enemy.y);
        if (distancia <= KAMIKAZE_TRIGGER_DISTANCE && enemy.x > G.player.x + 60) {
          enemy.diveState = "telegraph";
          enemy.telegraphTimer = KAMIKAZE_TELEGRAPH;
          enemy.beepTimer = 0;
        }
      } else if (enemy.diveState === "telegraph") {
        // Frena apuntando: parpadea y pita para avisar del piqué.
        enemy.x -= enemy.vx * 0.35 * dt;
        enemy.telegraphTimer -= dt;
        enemy.beepTimer -= dt;
        if (enemy.beepTimer <= 0) {
          tone(960, 0.05, "square", 0.02, -80);
          enemy.beepTimer = 0.13;
        }
        if (enemy.telegraphTimer <= 0) {
          // El rumbo se fija aquí y ya no se corrige: esquivable.
          const dx = G.player.x - enemy.x;
          const dy = G.player.y - enemy.y;
          const length = Math.hypot(dx, dy) || 1;
          const speed = (KAMIKAZE_DIVE_SPEED + G.state.wave * 6) *
            G.state.difficulty.enemySpeedMultiplier;
          enemy.vx = (dx / length) * speed;
          enemy.vy = (dy / length) * speed;
          enemy.diveState = "dive";
          tone(180, 0.3, "sawtooth", 0.035, -60);
        }
      } else {
        enemy.x += enemy.vx * dt;
        enemy.y += enemy.vy * dt;
        if (Math.random() < dt * 26) {
          createBurst(enemy.x + Math.sign(enemy.vx) * -enemy.w * 0.4, enemy.y, "#ff8a4a", 1, 70);
        }
        // Rozar el piqué sin tocarlo cuenta como esquiva de milagro.
        const distancia = Math.hypot(G.player.x - enemy.x, G.player.y - enemy.y);
        const hitbox = clamp(0.34 + G.player.hitboxBonus, 0, 0.8);
        if (
          !enemy.grazeAwarded &&
          G.player.invulnerable <= 0 &&
          distancia <= 100 &&
          !overlaps(G.player, enemy, hitbox)
        ) {
          enemy.grazeAwarded = true;
          awardNearMiss(enemy.x, enemy.y - 20);
        }
        if (enemy.x > W + 180 || enemy.x < -180 || enemy.y < -130 || enemy.y > H + 130) {
          enemy.dead = true;
        }
      }
    } else if (squad && !squad.dispersed) {
      // En formación: cada caza sigue su offset respecto al ancla común.
      enemy.x = squad.x + enemy.squadOffset.x;
      enemy.y = squad.y + enemy.squadOffset.y + Math.sin(squad.age * 2.2 + enemy.phase) * 10;
    } else {
      enemy.x -= enemy.vx * dt;
      enemy.y += Math.sin(enemy.age * (enemy.type === "drone" ? 4 : 2.2) + enemy.phase) *
        enemy.amplitude *
        dt;
    }

    if (
      enemy.type !== "balloon" &&
      enemy.type !== "kamikaze" &&
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
      const damage = isBossEnemy(enemy) ? 2 : enemy.type === "kamikaze" ? KAMIKAZE_DAMAGE : 1;
      hurtPlayer(damage);
      if (!isBossEnemy(enemy)) killEnemy(enemy);
    }
  }

  for (const bullet of G.playerBullets) {
    // El casco de la fortaleza rebota los disparos mientras le queden
    // torretas… pero sin frenar la bala: como las torretas se comprueban
    // después en la lista, un disparo dirigido a una torreta que también
    // roza el casco se lleva puesta la torreta. Solo rebota (chispa) si
    // al final no ha tocado ninguna.
    let rebotePendiente = false;
    for (const enemy of G.enemies) {
      const hitboxInset = isBossEnemy(enemy) ? 0.25 : enemy.type === "balloon" ? 0.18 : 0.16;
      if (bullet.dead || enemy.dead || !overlaps(bullet, enemy, hitboxInset)) continue;
      // Blindado: el punto débil hace daño doble y la placa frontal
      // repele los disparos normales (teledirigidos y explosivos la rodean).
      if (enemy.type === "gunship" && !bullet.ignoresArmor && hitsGunshipWeakpoint(bullet, enemy)) {
        bullet.dead = true;
        enemy.hp -= bullet.damage * 2;
        enemy.flash = 0.07;
        createBurst(bullet.x, bullet.y, "#ff5b26", 6, 120);
        if (enemy.hp <= 0) killEnemy(enemy);
        continue;
      }
      if (enemy.type === "gunship" && !bullet.ignoresArmor && hitsGunshipArmor(bullet, enemy)) {
        bullet.dead = true;
        createBurst(bullet.x, bullet.y, "#cfd8dc", 5, 130);
        tone(rand(1100, 1400), 0.05, "square", 0.012, -40);
        continue;
      }
      if (isInvulnerableEnemy(enemy)) {
        if (bullet.explosive) {
          // El explosivo sí estalla contra el casco: la onda alcanza a
          // las torretas cercanas aunque el casco no sufra.
          bullet.dead = true;
          detonateExplosiveBullet(bullet, enemy);
        } else if (bullet.charged) {
          detonateChargedBullet(bullet, enemy);
        } else {
          rebotePendiente = true;
        }
        continue;
      }
      bullet.dead = true;
      if (bullet.explosive) {
        detonateExplosiveBullet(bullet, enemy);
      } else if (bullet.charged) {
        detonateChargedBullet(bullet, enemy);
      } else {
        enemy.hp -= bullet.damage;
        enemy.flash = 0.07;
        createBurst(bullet.x, bullet.y, "#bdfcff", 4, 90);
        if (enemy.hp <= 0) killEnemy(enemy);
      }
    }
    if (!bullet.dead && rebotePendiente) {
      bullet.dead = true;
      createBurst(bullet.x, bullet.y, "#c9d6dc", 5, 95);
      tone(990, 0.03, "square", 0.009, 60);
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

