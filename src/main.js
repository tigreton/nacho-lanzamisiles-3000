// Estado, arranque y bucle principal. La configuración vive en config.js.
import {
  W, H, DIFFICULTIES, HELICOPTERS, SHOP_ITEMS, CROPS, AIRSHIP_CROPS,
  SHIELD_DURATION, SHIELD_RADIUS, MAX_PARTICLES,
} from "./config.js";
import { G, setMode, selectDifficulty, selectHelicopter } from "./state.js";
import { rand, clamp, lerp, overlaps } from "./utils.js";
import { unlockAudio, tone, toggleSound } from "./audio.js";
import { getHighScore, saveHighScore } from "./records.js";


// El mundo del juego vive en coordenadas lógicas fijas; el G.canvas físico se
// dimensiona al tamaño CSS × devicePixelRatio para texto y G.sprites nítidos.

function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const rect = G.canvas.getBoundingClientRect();
  const ancho = Math.max(1, Math.round(rect.width * ratio));
  const alto = Math.max(1, Math.round(rect.height * ratio));
  if (G.canvas.width !== ancho || G.canvas.height !== alto) {
    G.canvas.width = ancho;
    G.canvas.height = alto;
  }
  // Escalas independientes: si el contenedor no es 16:9 el juego se estira
  // exactamente igual que cuando el G.canvas era fijo.
  G.ctx.setTransform(ancho / W, 0, 0, alto / H, 0, 0);
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);


let airshipReady = false;
let gondolaReady = false;
let helicopterVariantsReady = 0;
let fontsReady = false;



function applyHelicopterStats(id) {
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

function updateShopUI() {
  if (!G.state || !G.player) return;
  const nextWave = G.state.wave + 1;
  G.ui.shopCoins.textContent = `${G.state.coins} MONEDAS`;
  G.ui.shopWave.textContent = `PREPARANDO OLEADA ${nextWave}`;
  G.ui.shopSummary.textContent = `OLEADA ${G.state.wave} SUPERADA · Dificultad ${G.state.difficulty.label}`;
  G.ui.continueButton.textContent = `CONTINUAR · OLEADA ${nextWave}`;

  for (const button of G.ui.shopItemButtons) {
    const itemId = button.dataset.shopItem;
    const item = SHOP_ITEMS[itemId];
    const status = button.querySelector(".shop-item-status");
    const lifeAlreadyFull = itemId === "life" && G.player.hp >= G.player.maxHp;
    const canBuy = G.state.coins >= item.price && !lifeAlreadyFull;
    button.disabled = !canBuy;
    if (lifeAlreadyFull) status.textContent = "COMPLETO";
    else if (G.state.coins < item.price) status.textContent = "FALTAN MONEDAS";
    else if (itemId === "explosive" && G.player.explosiveAmmo > 0) status.textContent = `${G.player.explosiveAmmo} RESTANTES`;
    else status.textContent = "DISPONIBLE";
  }
}

function buyShopItem(itemId) {
  if (G.mode !== "shop" || !SHOP_ITEMS[itemId]) return;
  const item = SHOP_ITEMS[itemId];
  if (G.state.coins < item.price) return;
  if (itemId === "life" && G.player.hp >= G.player.maxHp) return;

  G.state.coins -= item.price;
  if (itemId === "life") G.player.hp = Math.min(G.player.maxHp, G.player.hp + 1);
  if (itemId === "shield") G.player.shield = Math.max(G.player.shield, SHIELD_DURATION);
  if (itemId === "rapid") G.player.rapid = Math.max(G.player.rapid, 10);
  if (itemId === "explosive") G.player.explosiveAmmo += 8;
  const purchaseColor = itemId === "shield" ? "#68d8ff" : itemId === "explosive" ? "#ff8a18" : "#d8f23b";
  createBurst(G.player.x, G.player.y, purchaseColor, 12, 150);
  tone(itemId === "life" ? 430 : 620, 0.16, "sine", 0.028, 220);
  updateShopUI();
}

function openShop() {
  if (G.mode !== "playing") return;
  for (const pickup of G.pickups) {
    if (pickup.type === "coin") G.state.coins += 1;
  }
  G.enemies = [];
  G.enemyBullets = [];
  G.playerBullets = [];
  G.balloonBaskets = [];
  G.airshipGondolas = [];
  G.pickups = [];
  G.state.bossClearTimer = 0;
  updateShopUI();
  setMode("shop");
  tone(300, 0.13, "square", 0.026, 160);
}

function continueFromShop() {
  if (G.mode !== "shop") return;
  advanceWave();
  setMode("playing");
  G.lastTime = performance.now();
  G.canvas.focus();
}

function spawnAirbase() {
  if (G.airbase || G.state.airbaseSpawned) return;
  const homeY = rand(170, H - 170);
  G.airbase = {
    x: W + 180,
    y: homeY,
    homeY,
    w: 250,
    h: 96,
    targetX: W * 0.62,
    vx: 145,
    age: 0,
    dockAge: 0,
    phase: rand(0, Math.PI * 2),
  };
  G.state.airbaseSpawned = true;
  announceWave("BASE AÉREA · CAMBIO DISPONIBLE");
  tone(320, 0.2, "triangle", 0.026, 160);
}

function updateAirbase(dt) {
  if (!G.airbase) return;
  G.airbase.age += dt;
  G.airbase.y = G.airbase.homeY + Math.sin(G.airbase.age * 1.6 + G.airbase.phase) * 9;

  if (G.airbase.x > G.airbase.targetX) {
    G.airbase.x -= G.airbase.vx * dt;
  } else {
    G.airbase.dockAge += dt;
    if (G.airbase.dockAge > 14) {
      G.airbase = null;
      return;
    }
  }

  if (overlaps(G.player, G.airbase, 0.25)) openHelicopterBay();
}

function openHelicopterBay() {
  if (G.mode !== "playing" || !G.airbase) return;
  selectHelicopter(G.player.helicopter || G.selectedHelicopter);
  G.ui.helicopterSummary.textContent = `Helicóptero actual: ${HELICOPTERS[G.player.helicopter].label}. Elige tu nuevo aparato.`;
  setMode("helicopter");
  tone(520, 0.16, "sine", 0.03, 220);
}

function continueFromHelicopter() {
  if (G.mode !== "helicopter") return;
  applyHelicopterStats(G.selectedHelicopter);
  createBurst(G.player.x, G.player.y, G.selectedHelicopter === "v2" ? "#66e8ff" : "#d8f23b", 16, 180);
  tone(620, 0.18, "square", 0.028, 260);
  G.airbase = null;
  setMode("playing");
  G.lastTime = performance.now();
  G.canvas.focus();
}

function cutSprite(crop) {
  // La lámina assets/juego-nacho.webp ya viene con transparencia real:
  // el fondo se eliminó offline (plans/herramientas/limpiar-lamina.py).
  const [sx, sy, sw, sh] = crop;
  const output = document.createElement("canvas");
  output.width = sw;
  output.height = sh;
  output.getContext("2d").drawImage(G.sheet, sx, sy, sw, sh, 0, 0, sw, sh);
  return output;
}

function prepareSprites() {
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

function cutAirshipSprite(crop) {
  const [sx, sy, sw, sh] = crop;
  const output = document.createElement("canvas");
  output.width = sw;
  output.height = sh;
  output.getContext("2d").drawImage(G.airshipSheet, sx, sy, sw, sh, 0, 0, sw, sh);
  return output;
}

function prepareAirshipSprites() {
  G.sprites.airshipBoss = cutAirshipSprite(AIRSHIP_CROPS.boss);
  G.sprites.balloons = AIRSHIP_CROPS.balloons.map(cutAirshipSprite);
}

function resetGame() {
  const difficulty = DIFFICULTIES[G.selectedDifficulty];
  const helicopter = HELICOPTERS[G.selectedHelicopter];
  const maxHp = difficulty.playerHp + helicopter.maxHpBonus;
  G.player = {
    x: 150,
    y: H * 0.5,
    w: 150,
    h: 100,
    helicopter: G.selectedHelicopter,
    hp: maxHp,
    maxHp,
    speedMultiplier: helicopter.speedMultiplier,
    fireCooldownMultiplier: helicopter.fireCooldownMultiplier,
    damageReduction: helicopter.damageReduction,
    hitboxBonus: helicopter.hitboxBonus,
    cooldown: 0,
    invulnerable: 0,
    shield: 0,
    rapid: 0,
    explosiveAmmo: 0,
    frame: 0,
    tilt: 0,
  };

  G.state = {
    score: 0,
    coins: 0,
    wave: 1,
    waveTime: 0,
    spawnTimer: 0.65,
    elapsed: 0,
    bossSpawned: false,
    bossActive: false,
    bossClearTimer: 0,
    airbaseSpawned: false,
    banner: 2.4,
    bannerText: `${difficulty.label} · OLEADA 1`,
    shake: 0,
    flash: 0,
    background: 0,
    highScore: getHighScore(G.selectedDifficulty),
    difficulty,
  };

  G.enemies = [];
  G.playerBullets = [];
  G.enemyBullets = [];
  G.balloonBaskets = [];
  G.airshipGondolas = [];
  G.airbase = null;
  G.pickups = [];
  G.effects = [];
  G.particles = [];
  G.stars = Array.from({ length: 46 }, () => ({
    x: rand(0, W),
    y: rand(0, H),
    speed: rand(18, 72),
    size: rand(1, 3),
    alpha: rand(0.14, 0.48),
  }));
}

function startGame() {
  resetGame();
  setMode("playing");
  G.canvas.focus();
  unlockAudio();
  tone(360, 0.08, "square", 0.035);
  setTimeout(() => tone(540, 0.12, "square", 0.035), 90);
}




function togglePause() {
  if (G.mode === "playing") {
    setMode("paused");
  } else if (G.mode === "paused") {
    setMode("playing");
    G.lastTime = performance.now();
    G.canvas.focus();
  }
}

function announceWave(text) {
  G.state.banner = 2.3;
  G.state.bannerText = text;
  tone(220, 0.12, "sawtooth", 0.035, 90);
  setTimeout(() => tone(440, 0.16, "square", 0.03), 110);
}

function isBossEnemy(enemy) {
  return enemy.type === "boss" || enemy.type === "airship";
}

function advanceWave() {
  G.state.wave += 1;
  G.state.waveTime = 0;
  G.state.spawnTimer = 1;
  G.state.bossSpawned = false;
  G.state.bossActive = false;
  G.state.bossClearTimer = 0;
  G.state.airbaseSpawned = false;
  G.airbase = null;
  G.state.background = Math.floor((G.state.wave - 1) / 2) % CROPS.backgrounds.length;
  const bossWave = G.state.wave % 4 === 0;
  const airshipWave = G.state.wave % 8 === 0;
  announceWave(bossWave ? `${airshipWave ? "DIRIGIBLE" : "JEFE"} · OLEADA ${G.state.wave}` : `OLEADA ${G.state.wave}`);
}

function spawnEnemy(forcedType) {
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

function spawnBoss() {
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

function shootPlayer() {
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

function createBurst(x, y, color, count = 8, speed = 150) {
  // Tope duro: en oleadas densas con jefes las explosiones podian acumular
  // miles de particulas y castigar el frame time.
  const restantes = MAX_PARTICLES - G.particles.length;
  const nuevos = Math.min(count, Math.max(0, restantes));
  for (let i = 0; i < nuevos; i += 1) {
    const angle = rand(0, Math.PI * 2);
    const velocity = rand(speed * 0.35, speed);
    G.particles.push({
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      life: rand(0.18, 0.52),
      maxLife: 0.52,
      size: rand(2, 6),
      color,
    });
  }
}

function createExplosion(x, y, size = 110) {
  G.effects.push({ x, y, size, age: 0, duration: 0.72 });
  createBurst(x, y, "#ff8a18", Math.round(size / 10), size * 1.25);
  G.state.shake = Math.max(G.state.shake, Math.min(13, size / 13));
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

function killEnemy(enemy) {
  if (enemy.dead) return;
  enemy.dead = true;
  if (enemy.type === "balloon") releaseBalloonBasket(enemy);
  if (enemy.type === "airship") releaseAirshipGondola(enemy);
  G.state.score += Math.round(enemy.score * G.state.difficulty.scoreMultiplier);
  createExplosion(enemy.x, enemy.y, isBossEnemy(enemy) ? (enemy.type === "airship" ? 210 : 240) : enemy.w * 0.88);
  dropReward(enemy);

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

function hurtPlayer(damage) {
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
  G.state.shake = 12;
  G.state.flash = 0.16;
  createExplosion(G.player.x + 18, G.player.y, 72);
  tone(140, 0.22, "sawtooth", 0.035, -90);
  if (G.player.hp <= 0) endGame();
}

function collectPickup(pickup) {
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

function endGame() {
  if (G.mode !== "playing") return;
  const isRecord = G.state.score > G.state.highScore;
  if (isRecord) saveHighScore(G.state.score, G.selectedDifficulty);
  G.ui.resultTitle.textContent = isRecord ? "¡NUEVO RÉCORD!" : "MISIÓN TERMINADA";
  const record = getHighScore(G.selectedDifficulty);
  G.ui.resultCopy.textContent =
    `Dificultad: ${G.state.difficulty.label} · Puntuación: ${G.state.score.toLocaleString("es-ES")} · Récord: ${record.toLocaleString("es-ES")} · Monedas: ${G.state.coins}`;
  setMode("gameover");
}


function detonateExplosiveBullet(bullet, directHit) {
  const radius = 118;
  for (const enemy of G.enemies) {
    if (enemy.dead) continue;
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

function updatePlayer(dt) {
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

function updateEnemies(dt) {
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

function updateBalloonBaskets(dt) {
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

function updateAirshipGondolas(dt) {
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

function updateProjectiles(dt) {
  for (const bullet of G.playerBullets) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
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
    if (!bullet.dead && !bullet.reflected && overlaps(G.player, bullet, bulletHitbox)) {
      bullet.dead = true;
      hurtPlayer(bullet.damage);
    }
    if (!bullet.dead && bullet.reflected) {
      for (const enemy of G.enemies) {
        if (!enemy.dead && overlaps(bullet, enemy, 0.2)) {
          bullet.dead = true;
          enemy.hp -= bullet.damage;
          enemy.flash = 0.1;
          createBurst(bullet.x, bullet.y, "#68d8ff", 7, 125);
          if (enemy.hp <= 0) killEnemy(enemy);
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

function updatePickups(dt) {
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

function updateEffects(dt) {
  for (const effect of G.effects) effect.age += dt;
  G.effects = G.effects.filter((effect) => effect.age < effect.duration);

  for (const particle of G.particles) {
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= Math.pow(0.96, dt * 60);
    particle.vy *= Math.pow(0.96, dt * 60);
  }
  G.particles = G.particles.filter((particle) => particle.life > 0);

  for (const star of G.stars) {
    star.x -= star.speed * dt;
    if (star.x < -5) {
      star.x = W + 5;
      star.y = rand(0, H);
    }
  }
}

function updateGame(dt) {
  G.state.elapsed += dt;
  G.state.waveTime += dt;
  G.state.banner = Math.max(0, G.state.banner - dt);
  G.state.shake = Math.max(0, G.state.shake - dt * 30);
  G.state.flash = Math.max(0, G.state.flash - dt);

  updatePlayer(dt);
  updateAirbase(dt);
  updateProjectiles(dt);
  updateEnemies(dt);
  updateBalloonBaskets(dt);
  updateAirshipGondolas(dt);
  updatePickups(dt);
  updateEffects(dt);

  if (G.state.wave % 4 === 0) {
    if (!G.state.bossSpawned) spawnBoss();
    else if (!G.state.bossActive) {
      G.state.bossClearTimer -= dt;
      const balloonsAlive = G.enemies.some((enemy) => enemy.type === "balloon");
      if (
        G.state.bossClearTimer <= 0 &&
        !balloonsAlive &&
        G.balloonBaskets.length === 0 &&
        G.airshipGondolas.length === 0
      ) {
        openShop();
      }
    }
  } else {
    if (
      G.state.wave >= 2 &&
      G.state.wave % 2 === 0 &&
      G.state.wave % 4 !== 0 &&
      !G.state.airbaseSpawned &&
      G.state.waveTime > 6
    ) {
      spawnAirbase();
    }
    G.state.spawnTimer -= dt;
    if (G.state.spawnTimer <= 0) {
      spawnEnemy();
      G.state.spawnTimer =
        Math.max(0.48, 1.28 - G.state.wave * 0.055) *
        G.state.difficulty.spawnIntervalMultiplier *
        rand(0.78, 1.24);
    }
    if (G.state.waveTime > G.state.difficulty.waveDuration && !G.airbase) openShop();
  }
}

// Halo pre-horneado: hornear el shadowBlur de cada sprite una sola vez en un
// G.canvas aparte cuesta mucho menos que aplicarlo en cada fotograma del loop.
const glowCache = new Map();

function bakedGlow(image, glow, blur) {
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

function drawSprite(image, x, y, width, height, options = {}) {
  if (!image) return;
  G.ctx.save();
  G.ctx.translate(x, y);
  if (options.rotate) G.ctx.rotate(options.rotate);
  if (options.flipX) G.ctx.scale(-1, 1);
  if (options.alpha !== undefined) G.ctx.globalAlpha = options.alpha;
  if (options.glow) {
    const horneado = bakedGlow(image, options.glow, options.blur || 14);
    const w = horneado.width * (width / image.width);
    const h = horneado.height * (height / image.height);
    G.ctx.drawImage(horneado, -w / 2, -h / 2, w, h);
  } else {
    G.ctx.drawImage(image, -width / 2, -height / 2, width, height);
  }
  G.ctx.restore();
}

function drawAirshipSprite(enemy) {
  drawSprite(G.sprites.airshipBoss, enemy.x, enemy.y, enemy.w, enemy.h, {
    rotate: Math.sin(enemy.age * 0.65) * 0.018,
    glow: "rgba(255, 72, 20, 0.22)",
    blur: 16,
  });
}

function drawBalloonSprite(enemy) {
  const bob = Math.sin(enemy.age * 5 + enemy.phase) * 4;
  const animationPose = Math.floor(enemy.age * 2.4 + enemy.phase) % 2;
  const frame = enemy.spriteVariant + animationPose * 2;
  drawSprite(G.sprites.balloons[frame], enemy.x, enemy.y + bob, enemy.w, enemy.h, {
    rotate: Math.sin(enemy.age * 2.1 + enemy.phase) * 0.035,
    glow: "rgba(255, 74, 35, 0.32)",
    blur: 9,
  });
}

function drawBackground(backgroundIndex = 0) {
  const crop = CROPS.backgrounds[backgroundIndex % CROPS.backgrounds.length];
  G.ctx.drawImage(G.sheet, crop[0], crop[1], crop[2], crop[3], 0, 0, W, H);

  const tint = G.ctx.createLinearGradient(0, 0, 0, H);
  tint.addColorStop(0, "rgba(12, 49, 72, 0.04)");
  tint.addColorStop(0.62, "rgba(1, 18, 25, 0.02)");
  tint.addColorStop(1, "rgba(0, 7, 11, 0.38)");
  G.ctx.fillStyle = tint;
  G.ctx.fillRect(0, 0, W, H);

  if (G.state) {
    for (const star of G.stars) {
      G.ctx.globalAlpha = star.alpha;
      G.ctx.fillStyle = backgroundIndex === 2 ? "#ffbb65" : "#d6f7ff";
      G.ctx.fillRect(star.x, star.y, star.size * 6, star.size);
    }
    G.ctx.globalAlpha = 1;
  }
}

function drawMenuBackdrop() {
  drawBackground(0);
  const rightShade = G.ctx.createLinearGradient(W * 0.45, 0, W, 0);
  rightShade.addColorStop(0, "rgba(0, 17, 24, 0)");
  rightShade.addColorStop(1, "rgba(0, 17, 24, 0.16)");
  G.ctx.fillStyle = rightShade;
  G.ctx.fillRect(0, 0, W, H);

  drawSprite(G.sprites.boss, W * 0.81, H * 0.52, 410, 205, {
    rotate: -0.02,
    glow: "rgba(255, 72, 20, 0.28)",
    blur: 24,
  });
  drawSprite(G.sprites.player[0], W * 0.59, H * 0.4, 190, 145, {
    rotate: 0.02,
    glow: "rgba(95, 226, 255, 0.25)",
    blur: 22,
  });
  drawSprite(G.sprites.drone[4], W * 0.68, H * 0.2, 88, 98);
  drawSprite(G.sprites.fighter[2], W * 0.9, H * 0.22, 145, 88);
}

function roundedRect(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  G.ctx.beginPath();
  G.ctx.roundRect(x, y, width, height, r);
}

function drawHud() {
  G.ctx.save();
  G.ctx.textBaseline = "middle";

  roundedRect(18, 17, 390, 72, 12);
  G.ctx.fillStyle = "rgba(4, 13, 18, 0.77)";
  G.ctx.fill();
  G.ctx.strokeStyle = "rgba(255,255,255,0.18)";
  G.ctx.stroke();

  drawSprite(G.sprites.face, 57, 53, 64, 66);
  G.ctx.fillStyle = "#d8f23b";
  G.ctx.font = '700 12px Inter, sans-serif';
  G.ctx.fillText("BLINDAJE", 96, 37);

  const segmentGap = 3;
  const healthBarWidth = 294;
  const segmentWidth = Math.min(
    35,
    (healthBarWidth - segmentGap * Math.max(0, G.player.maxHp - 1)) / G.player.maxHp,
  );
  for (let i = 0; i < G.player.maxHp; i += 1) {
    roundedRect(96 + i * (segmentWidth + segmentGap), 51, segmentWidth, 16, 3);
    G.ctx.fillStyle = i < G.player.hp ? (i < 2 ? "#ff5a24" : "#d7ef31") : "rgba(255,255,255,0.13)";
    G.ctx.fill();
  }

  if (G.player.explosiveAmmo > 0 || G.player.rapid > 0 || G.player.shield > 0) {
    const label = G.player.explosiveAmmo > 0
      ? `EXPLOSIVOS ${G.player.explosiveAmmo}`
      : G.player.rapid > 0
        ? `RÁFAGA ${Math.ceil(G.player.rapid)}s`
        : `ESCUDO ${Math.ceil(G.player.shield)}s`;
    G.ctx.fillStyle = G.player.explosiveAmmo > 0 ? "#ff8a18" : G.player.rapid > 0 ? "#ffb02e" : "#68d8ff";
    G.ctx.font = '900 11px Inter, sans-serif';
    G.ctx.fillText(label, 96, 77);
  }

  roundedRect(W / 2 - 78, 17, 156, 60, 10);
  G.ctx.fillStyle = "rgba(4, 13, 18, 0.77)";
  G.ctx.fill();
  G.ctx.strokeStyle = "rgba(255,255,255,0.18)";
  G.ctx.stroke();
  G.ctx.textAlign = "center";
  G.ctx.fillStyle = "rgba(255,255,255,0.62)";
  G.ctx.font = '900 10px Inter, sans-serif';
  G.ctx.fillText("OLEADA", W / 2, 34);
  G.ctx.fillStyle = "#ffffff";
  G.ctx.font = '400 26px "Black Ops One", Impact, sans-serif';
  G.ctx.fillText(String(G.state.wave).padStart(2, "0"), W / 2, 57);

  roundedRect(W - 300, 17, 282, 72, 12);
  G.ctx.fillStyle = "rgba(4, 13, 18, 0.77)";
  G.ctx.fill();
  G.ctx.strokeStyle = "rgba(255,255,255,0.18)";
  G.ctx.stroke();
  G.ctx.textAlign = "right";
  G.ctx.fillStyle = "rgba(255,255,255,0.58)";
  G.ctx.font = '900 10px Inter, sans-serif';
  G.ctx.fillText("PUNTOS", W - 114, 36);
  G.ctx.fillStyle = "#ffffff";
  G.ctx.font = '400 25px "Black Ops One", Impact, sans-serif';
  G.ctx.fillText(G.state.score.toLocaleString("es-ES"), W - 114, 62);
  drawSprite(G.sprites.coin, W - 67, 53, 45, 43);
  G.ctx.textAlign = "left";
  G.ctx.fillStyle = "#ffd63c";
  G.ctx.font = '900 18px Inter, sans-serif';
  G.ctx.fillText(String(G.state.coins), W - 46, 54);

  const boss = G.enemies.find((enemy) => isBossEnemy(enemy));
  if (boss) {
    const barWidth = 560;
    const x = W / 2 - barWidth / 2;
    const y = H - 39;
    roundedRect(x - 8, y - 8, barWidth + 16, 30, 8);
    G.ctx.fillStyle = "rgba(4, 9, 12, 0.82)";
    G.ctx.fill();
    roundedRect(x, y, barWidth, 14, 5);
    G.ctx.fillStyle = "rgba(255,255,255,0.13)";
    G.ctx.fill();
    roundedRect(x, y, barWidth * clamp(boss.hp / boss.maxHp, 0, 1), 14, 5);
    G.ctx.fillStyle = "#ff4d21";
    G.ctx.fill();
    G.ctx.textAlign = "center";
    G.ctx.fillStyle = "#fff";
    G.ctx.font = '900 10px Inter, sans-serif';
    G.ctx.fillText(boss.type === "airship" ? "DIRIGIBLE DE GLOBOS" : "ACORAZADO 3000", W / 2, y - 13);
  }
  G.ctx.restore();
}

function drawBalloonBasket(basket) {
  G.ctx.save();
  G.ctx.translate(basket.x, basket.y);
  G.ctx.rotate(clamp(basket.vx / 900, -0.24, 0.24) + Math.sin(basket.age * 7 + basket.phase) * 0.08);
  G.ctx.shadowColor = "rgba(255, 91, 39, 0.52)";
  G.ctx.shadowBlur = 10;

  // Broken suspension ropes show that the basket has detached from the balloon.
  G.ctx.strokeStyle = "rgba(237, 205, 128, 0.9)";
  G.ctx.lineWidth = 2;
  G.ctx.beginPath();
  G.ctx.moveTo(-11, -14);
  G.ctx.lineTo(-7, -4);
  G.ctx.moveTo(11, -14);
  G.ctx.lineTo(7, -4);
  G.ctx.stroke();

  const basketFill = G.ctx.createLinearGradient(0, -5, 0, 15);
  basketFill.addColorStop(0, "#d18a3d");
  basketFill.addColorStop(0.5, "#8a4e2b");
  basketFill.addColorStop(1, "#42251d");
  G.ctx.fillStyle = basketFill;
  G.ctx.strokeStyle = "#211615";
  G.ctx.lineWidth = 3;
  G.ctx.beginPath();
  G.ctx.moveTo(-14, -5);
  G.ctx.lineTo(14, -5);
  G.ctx.lineTo(11, 14);
  G.ctx.lineTo(-11, 14);
  G.ctx.closePath();
  G.ctx.fill();
  G.ctx.stroke();

  G.ctx.strokeStyle = "rgba(255, 205, 111, 0.62)";
  G.ctx.lineWidth = 1.3;
  G.ctx.beginPath();
  G.ctx.moveTo(-10, 1);
  G.ctx.lineTo(10, 6);
  G.ctx.moveTo(-9, 8);
  G.ctx.lineTo(9, 2);
  G.ctx.stroke();

  G.ctx.fillStyle = "#ff4925";
  G.ctx.shadowColor = "#ff3b18";
  G.ctx.shadowBlur = 8;
  G.ctx.beginPath();
  G.ctx.arc(0, -1, 3, 0, Math.PI * 2);
  G.ctx.fill();
  G.ctx.restore();
}

function drawAirshipGondola(gondola) {
  G.ctx.save();
  G.ctx.translate(gondola.x, gondola.y);
  G.ctx.rotate(clamp(gondola.vx / 900, -0.25, 0.25) + Math.sin(gondola.age * 4.5 + gondola.phase) * 0.05);
  drawSprite(G.sprites.airshipGondola, 0, 0, gondola.w, gondola.h, {
    glow: "rgba(255, 73, 28, 0.58)",
    blur: 17,
  });

  // The ring counts down the ten-second pursuit phase.
  const remaining = clamp(1 - gondola.age / 10, 0, 1);
  G.ctx.strokeStyle = "rgba(255, 208, 83, 0.9)";
  G.ctx.lineWidth = 3;
  G.ctx.beginPath();
  G.ctx.arc(0, -34, 11, -Math.PI / 2, -Math.PI / 2 + remaining * Math.PI * 2);
  G.ctx.stroke();
  G.ctx.restore();
}

function drawAirbase(base) {
  G.ctx.save();
  G.ctx.translate(base.x, base.y);
  G.ctx.shadowColor = "rgba(91, 227, 255, 0.52)";
  G.ctx.shadowBlur = 18;

  // A compact flying platform with a clear landing pad and approach lights.
  G.ctx.fillStyle = "rgba(79, 220, 255, 0.12)";
  G.ctx.beginPath();
  G.ctx.ellipse(0, 38, 105, 13, 0, 0, Math.PI * 2);
  G.ctx.fill();

  G.ctx.fillStyle = "#243238";
  G.ctx.strokeStyle = "#101719";
  G.ctx.lineWidth = 5;
  G.ctx.beginPath();
  G.ctx.moveTo(-112, -20);
  G.ctx.lineTo(107, -20);
  G.ctx.lineTo(122, 12);
  G.ctx.lineTo(91, 31);
  G.ctx.lineTo(-91, 31);
  G.ctx.lineTo(-122, 12);
  G.ctx.closePath();
  G.ctx.fill();
  G.ctx.stroke();

  G.ctx.shadowBlur = 0;
  G.ctx.fillStyle = "#d8f23b";
  G.ctx.strokeStyle = "#536a16";
  G.ctx.lineWidth = 3;
  G.ctx.beginPath();
  G.ctx.moveTo(-74, -8);
  G.ctx.lineTo(74, -8);
  G.ctx.lineTo(61, 13);
  G.ctx.lineTo(-61, 13);
  G.ctx.closePath();
  G.ctx.fill();
  G.ctx.stroke();

  G.ctx.fillStyle = "#132126";
  G.ctx.font = '900 16px Inter, sans-serif';
  G.ctx.textAlign = "center";
  G.ctx.textBaseline = "middle";
  G.ctx.fillText("ATERRIZA", 0, 3);

  G.ctx.strokeStyle = "#162326";
  G.ctx.lineWidth = 4;
  for (const x of [-78, 78]) {
    G.ctx.beginPath();
    G.ctx.moveTo(x, 22);
    G.ctx.lineTo(x * 0.72, 47);
    G.ctx.stroke();
  }
  for (const x of [-84, -42, 42, 84]) {
    G.ctx.fillStyle = Math.floor(base.age * 5 + x) % 2 === 0 ? "#ffe95b" : "#ff6b2c";
    G.ctx.beginPath();
    G.ctx.arc(x, -27, 4, 0, Math.PI * 2);
    G.ctx.fill();
  }

  G.ctx.strokeStyle = "#1b2629";
  G.ctx.lineWidth = 6;
  G.ctx.beginPath();
  G.ctx.moveTo(-86, -22);
  G.ctx.lineTo(-113, -48);
  G.ctx.moveTo(86, -22);
  G.ctx.lineTo(113, -48);
  G.ctx.stroke();
  G.ctx.save();
  G.ctx.translate(-124, -56);
  G.ctx.rotate(base.age * 6);
  G.ctx.strokeStyle = "#5d7175";
  G.ctx.lineWidth = 5;
  G.ctx.beginPath();
  G.ctx.moveTo(0, -15);
  G.ctx.lineTo(0, 15);
  G.ctx.moveTo(-15, 0);
  G.ctx.lineTo(15, 0);
  G.ctx.stroke();
  G.ctx.restore();
  G.ctx.save();
  G.ctx.translate(124, -56);
  G.ctx.rotate(-base.age * 6);
  G.ctx.strokeStyle = "#5d7175";
  G.ctx.lineWidth = 5;
  G.ctx.beginPath();
  G.ctx.moveTo(0, -15);
  G.ctx.lineTo(0, 15);
  G.ctx.moveTo(-15, 0);
  G.ctx.lineTo(15, 0);
  G.ctx.stroke();
  G.ctx.restore();
  G.ctx.restore();
}

function drawEntities() {
  for (const pickup of G.pickups) {
    const bob = Math.sin(pickup.age * 7) * 4;
    if (pickup.type === "coin") {
      drawSprite(G.sprites.coin, pickup.x, pickup.y + bob, pickup.w, pickup.h, {
        glow: "#ffd63c",
        blur: 9,
      });
    } else {
      const index = { rapid: 0, shield: 1, heart: 2, star: 3 }[pickup.type] ?? 3;
      drawSprite(G.sprites.powerups[index], pickup.x, pickup.y + bob, pickup.w, pickup.h, {
        glow: pickup.type === "heart" ? "#ff472c" : "#9ce7ff",
        blur: 10,
      });
    }
  }

  if (G.airbase) drawAirbase(G.airbase);

  for (const bullet of G.playerBullets) {
    drawSprite(bullet.explosive ? G.sprites.missile : G.sprites.playerBullet, bullet.x, bullet.y, bullet.w, bullet.h, {
      glow: bullet.explosive ? "#ff8a18" : "#6cecff",
      blur: 13,
    });
  }

  for (const bullet of G.enemyBullets) {
    drawSprite(G.sprites.enemyBullet, bullet.x, bullet.y, bullet.w, bullet.h, {
      rotate: bullet.age * (bullet.reflected ? -4 : 4),
      glow: bullet.reflected ? "#68d8ff" : "#ff6a23",
      blur: 11,
    });
  }

  for (const basket of G.balloonBaskets) drawBalloonBasket(basket);
  for (const gondola of G.airshipGondolas) drawAirshipGondola(gondola);

  for (const enemy of G.enemies) {
    G.ctx.save();
    if (enemy.flash > 0) {
      G.ctx.globalAlpha = 0.5 + Math.random() * 0.5;
      G.ctx.filter = "brightness(1.8)";
    }
    if (enemy.type === "boss") {
      drawSprite(G.sprites.boss, enemy.x, enemy.y, enemy.w, enemy.h, {
        rotate: Math.sin(enemy.age * 1.4) * 0.015,
      });
    } else if (enemy.type === "airship") {
      drawAirshipSprite(enemy);
    } else if (enemy.type === "balloon") {
      drawBalloonSprite(enemy);
    } else if (enemy.type === "drone") {
      const frame = Math.floor(enemy.age * 6 + enemy.phase) % G.sprites.drone.length;
      drawSprite(G.sprites.drone[frame], enemy.x, enemy.y, enemy.w, enemy.h, {
        rotate: Math.sin(enemy.age * 3) * 0.05,
      });
    } else if (enemy.type === "fighter") {
      const frame = Math.floor(enemy.phase) % G.sprites.fighter.length;
      drawSprite(G.sprites.fighter[frame], enemy.x, enemy.y, enemy.w, enemy.h);
    } else {
      const frame = Math.floor(enemy.age * 5 + enemy.phase) % G.sprites.enemyHeli.length;
      drawSprite(G.sprites.enemyHeli[frame], enemy.x, enemy.y, enemy.w, enemy.h);
    }
    G.ctx.restore();
  }

  const playerAlpha =
    G.player.invulnerable > 0 && Math.floor(G.player.invulnerable * 14) % 2 === 0 ? 0.32 : 1;
  if (G.player.shield > 0) {
    G.ctx.save();
    G.ctx.beginPath();
    G.ctx.arc(G.player.x, G.player.y, SHIELD_RADIUS + Math.sin(G.state.elapsed * 5) * 3, 0, Math.PI * 2);
    G.ctx.strokeStyle = "rgba(88, 218, 255, 0.72)";
    G.ctx.lineWidth = 4;
    G.ctx.shadowColor = "#5be4ff";
    G.ctx.shadowBlur = 14;
    G.ctx.stroke();
    G.ctx.restore();
  }
  const playerSprite = G.sprites.playerVariants?.[G.player.helicopter] || G.sprites.player[G.player.frame];
  drawSprite(playerSprite, G.player.x, G.player.y, G.player.w, G.player.h, {
    rotate: G.player.tilt,
    alpha: playerAlpha,
  });
}

function drawEffects() {
  for (const effect of G.effects) {
    const progress = effect.age / effect.duration;
    const index = Math.min(
      G.sprites.explosion.length - 1,
      Math.floor(progress * G.sprites.explosion.length),
    );
    const scale = 0.75 + Math.sin(progress * Math.PI) * 0.45;
    drawSprite(
      G.sprites.explosion[index],
      effect.x,
      effect.y,
      effect.size * scale,
      effect.size * scale,
      { alpha: clamp(1.35 - progress, 0, 1) },
    );
  }

  for (const particle of G.particles) {
    G.ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
    G.ctx.fillStyle = particle.color;
    G.ctx.beginPath();
    G.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    G.ctx.fill();
  }
  G.ctx.globalAlpha = 1;
}

function drawBanner() {
  if (G.state.banner <= 0) return;
  const t = G.state.banner;
  const alpha = Math.min(1, (2.3 - t) * 4, t * 2);
  G.ctx.save();
  G.ctx.globalAlpha = alpha;
  const width = 510;
  const y = H * 0.47;
  const gradient = G.ctx.createLinearGradient(W / 2 - width / 2, 0, W / 2 + width / 2, 0);
  gradient.addColorStop(0, "rgba(3,10,13,0)");
  gradient.addColorStop(0.16, "rgba(3,10,13,0.76)");
  gradient.addColorStop(0.84, "rgba(3,10,13,0.76)");
  gradient.addColorStop(1, "rgba(3,10,13,0)");
  G.ctx.fillStyle = gradient;
  G.ctx.fillRect(W / 2 - width / 2, y - 43, width, 86);
  G.ctx.textAlign = "center";
  G.ctx.textBaseline = "middle";
  G.ctx.fillStyle = "#d8f23b";
  G.ctx.font = '400 37px "Black Ops One", Impact, sans-serif';
  G.ctx.fillText(G.state.bannerText, W / 2, y + 2);
  G.ctx.restore();
}

function render() {
  G.ctx.clearRect(0, 0, W, H);
  if (!G.sheet.complete || !G.sprites.player) {
    G.ctx.fillStyle = "#0a1820";
    G.ctx.fillRect(0, 0, W, H);
    return;
  }

  if (G.mode === "menu" || G.mode === "loading") {
    drawMenuBackdrop();
    return;
  }

  G.ctx.save();
  if (G.state.shake > 0) G.ctx.translate(rand(-G.state.shake, G.state.shake), rand(-G.state.shake, G.state.shake));
  drawBackground(G.state.background);
  drawEntities();
  drawEffects();
  drawHud();
  drawBanner();
  G.ctx.restore();

  if (G.state.flash > 0) {
    G.ctx.fillStyle = `rgba(255,255,255,${G.state.flash * 1.7})`;
    G.ctx.fillRect(0, 0, W, H);
  }
}

function loop(time) {
  const dt = Math.min(0.034, (time - G.lastTime) / 1000 || 0);
  G.lastTime = time;
  if (G.mode === "playing") updateGame(dt);
  render();
  requestAnimationFrame(loop);
}

function updatePointer(event) {
  const rect = G.canvas.getBoundingClientRect();
  G.pointer.x = ((event.clientX - rect.left) / rect.width) * W;
  G.pointer.y = ((event.clientY - rect.top) / rect.height) * H;
}

window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    if (G.mode === "playing") {
      // Solo en partida se aísla Espacio: fuera de ella los botones del
      // menú, la tienda y el fin de partida deben responder a la tecla.
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    G.keys.add("Space");
    return;
  }
  if (
    ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)
  ) {
    event.preventDefault();
  }
  G.keys.add(event.code);
  if ((event.code === "KeyP" || event.code === "Escape") && !event.repeat) togglePause();
  if (event.code === "Enter" && G.mode === "menu") startGame();
}, true);

window.addEventListener("keyup", (event) => {
  if (event.code === "Space") event.preventDefault();
  G.keys.delete(event.code);
}, true);
// Autopausa: si la pestaña o la ventana pierden el foco en mitad de una
// oleada, la partida se pausa en lugar de seguir corriendo sin defensa.
const autopause = () => {
  G.keys.clear();
  G.pointer.active = false;
  if (G.mode === "playing") togglePause();
};
window.addEventListener("blur", autopause);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) autopause();
});

G.canvas.addEventListener("pointerdown", (event) => {
  if (G.mode !== "playing") return;
  G.pointer.active = true;
  updatePointer(event);
  G.canvas.setPointerCapture?.(event.pointerId);
  unlockAudio();
});
G.canvas.addEventListener("pointermove", (event) => {
  if (G.pointer.active) updatePointer(event);
});
G.canvas.addEventListener("pointerup", () => {
  G.pointer.active = false;
});
G.canvas.addEventListener("pointercancel", () => {
  G.pointer.active = false;
});

G.ui.play.addEventListener("click", startGame);
G.ui.restart.addEventListener("click", startGame);
G.ui.resume.addEventListener("click", togglePause);
G.ui.pauseButton.addEventListener("click", togglePause);
G.ui.soundButton.addEventListener("click", toggleSound);
G.ui.continueButton.addEventListener("click", continueFromShop);
G.ui.helicopterContinue.addEventListener("click", continueFromHelicopter);
for (const button of G.ui.difficultyButtons) {
  button.addEventListener("click", () => selectDifficulty(button.dataset.difficulty));
}
for (const button of [...G.ui.helicopterButtons, ...G.ui.changeHelicopterButtons]) {
  button.addEventListener("click", () => selectHelicopter(button.dataset.helicopter));
}
for (const button of G.ui.shopItemButtons) {
  button.addEventListener("click", () => buyShopItem(button.dataset.shopItem));
}
selectDifficulty(G.selectedDifficulty);
selectHelicopter(G.selectedHelicopter);

function finishLoading() {
  if (!fontsReady || !airshipReady || !gondolaReady || helicopterVariantsReady < 2) return;
  G.sprites.airshipGondola = G.gondolaSheet;
  G.sprites.playerVariants = {
    v1: G.helicopterSheets.v1,
    v2: G.helicopterSheets.v2,
  };
  resetGame();
  setMode("menu");
}

G.sheet.addEventListener("load", () => {
  prepareSprites();
  G.airshipSheet.src = "assets/boss-globo-sprites.webp";
  G.helicopterSheets.v1.src = "assets/helicopter-player-v1.webp";
  G.helicopterSheets.v2.src = "assets/helicopter-player-v2.webp";
});
G.airshipSheet.addEventListener("load", () => {
  prepareAirshipSprites();
  airshipReady = true;
  G.gondolaSheet.src = "assets/airship-gondola.webp";
  finishLoading();
});
G.gondolaSheet.addEventListener("load", () => {
  gondolaReady = true;
  finishLoading();
});
for (const helicopterSheet of Object.values(G.helicopterSheets)) {
  helicopterSheet.addEventListener("load", () => {
    helicopterVariantsReady += 1;
    finishLoading();
  });
}
const showSpriteLoadError = () => {
  G.ui.loading.innerHTML =
    "<p>No se pudo cargar la lámina de sprites. Comprueba la carpeta assets.</p>";
};
G.sheet.addEventListener("error", showSpriteLoadError);
G.airshipSheet.addEventListener("error", showSpriteLoadError);
G.gondolaSheet.addEventListener("error", showSpriteLoadError);
for (const helicopterSheet of Object.values(G.helicopterSheets)) {
  helicopterSheet.addEventListener("error", showSpriteLoadError);
}
G.sheet.src = "assets/juego-nacho.webp";

// Cargar las fuentes del HUD antes de dar la carga por terminada, para que
// el G.canvas nunca mida texto con la fuente de sustitución.
const fontLoads = [
  document.fonts.load('400 26px "Black Ops One"'),
  document.fonts.load("500 16px Inter"),
  document.fonts.load("700 12px Inter"),
  document.fonts.load("900 11px Inter"),
];
Promise.all(fontLoads).then(
  () => {
    fontsReady = true;
    finishLoading();
  },
  () => {
    fontsReady = true; // sin fuentes propias el juego es jugable igualmente
    finishLoading();
  }
);

requestAnimationFrame(loop);
