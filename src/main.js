// Estado, arranque y bucle principal. La configuración vive en config.js.
import {
  W, H, DIFFICULTIES, HELICOPTERS, SHOP_ITEMS, CROPS, AIRSHIP_CROPS,
  SHIELD_DURATION, SHIELD_RADIUS, MAX_PARTICLES,
} from "./config.js";
import { G, setMode, selectDifficulty, selectHelicopter } from "./state.js";
import { render } from "./render.js";
import { prepareSprites, prepareAirshipSprites, bakedGlow } from "./sprites.js";
import { rand, clamp, lerp, overlaps, isBossEnemy } from "./utils.js";
import { unlockAudio, tone, toggleSound } from "./audio.js";
import { installInput } from "./input.js";
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
















function loop(time) {
  const dt = Math.min(0.034, (time - G.lastTime) / 1000 || 0);
  G.lastTime = time;
  if (G.mode === "playing") updateGame(dt);
  render();
  requestAnimationFrame(loop);
}

installInput({ togglePause, startGame });

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
