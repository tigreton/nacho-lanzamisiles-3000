(() => {
  "use strict";

  const canvas = document.querySelector("#game-canvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  const ui = {
    loading: document.querySelector("#loading-screen"),
    menu: document.querySelector("#menu-screen"),
    pause: document.querySelector("#pause-screen"),
    shop: document.querySelector("#shop-screen"),
    helicopter: document.querySelector("#helicopter-screen"),
    gameover: document.querySelector("#gameover-screen"),
    play: document.querySelector("#play-button"),
    restart: document.querySelector("#restart-button"),
    resume: document.querySelector("#resume-button"),
    pauseButton: document.querySelector("#pause-button"),
    soundButton: document.querySelector("#sound-button"),
    resultTitle: document.querySelector("#result-title"),
    resultCopy: document.querySelector("#result-copy"),
    difficultyButtons: [...document.querySelectorAll(".difficulty-option")],
    helicopterButtons: [...document.querySelectorAll("#menu-screen .helicopter-option")],
    changeHelicopterButtons: [...document.querySelectorAll("#helicopter-screen .helicopter-option")],
    helicopterContinue: document.querySelector("#helicopter-continue"),
    helicopterSummary: document.querySelector("#helicopter-summary"),
    shopSummary: document.querySelector("#shop-summary"),
    shopCoins: document.querySelector("#shop-coins"),
    shopWave: document.querySelector("#shop-wave"),
    continueButton: document.querySelector("#continue-button"),
    shopItemButtons: [...document.querySelectorAll(".shop-item")],
  };

  const DIFFICULTIES = {
    easy: {
      label: "FÁCIL",
      playerHp: 9,
      enemyHpMultiplier: 0.8,
      enemySpeedMultiplier: 0.8,
      enemyFireMultiplier: 1.35,
      enemyBulletHitboxInset: 0.48,
      spawnIntervalMultiplier: 1.35,
      waveDuration: 21,
      bossHpMultiplier: 0.82,
      scoreMultiplier: 0.8,
    },
    normal: {
      label: "NORMAL",
      playerHp: 7,
      enemyHpMultiplier: 1,
      enemySpeedMultiplier: 1,
      enemyFireMultiplier: 1,
      enemyBulletHitboxInset: 0.2,
      spawnIntervalMultiplier: 1,
      waveDuration: 18,
      bossHpMultiplier: 1,
      scoreMultiplier: 1,
    },
    hard: {
      label: "DIFÍCIL",
      playerHp: 5,
      enemyHpMultiplier: 1.28,
      enemySpeedMultiplier: 1.18,
      enemyFireMultiplier: 0.72,
      enemyBulletHitboxInset: 0.12,
      spawnIntervalMultiplier: 0.72,
      waveDuration: 16,
      bossHpMultiplier: 1.3,
      scoreMultiplier: 1.35,
    },
  };

  const HELICOPTERS = {
    v1: {
      label: "BLINDADO",
      description: "Más vida y placas que reducen el daño",
      maxHpBonus: 2,
      damageReduction: 0.25,
      speedMultiplier: 0.94,
      fireCooldownMultiplier: 1,
      hitboxBonus: 0,
    },
    v2: {
      label: "SIGILO",
      description: "Más rápido, dispara antes y es más difícil de golpear",
      maxHpBonus: 0,
      damageReduction: 0,
      speedMultiplier: 1.22,
      fireCooldownMultiplier: 0.72,
      hitboxBonus: 0.13,
    },
  };

  const SHOP_ITEMS = {
    life: { price: 3 },
    explosive: { price: 5 },
    shield: { price: 6 },
    rapid: { price: 4 },
  };

  const SHIELD_DURATION = 15;
  const SHIELD_RADIUS = 86;

  const CROPS = {
    backgrounds: [
      [743, 755, 248, 148],
      [1021, 754, 238, 149],
      [1288, 754, 234, 149],
    ],
    player: [
      [18, 47, 101, 99],
      [119, 47, 103, 99],
      [218, 47, 102, 99],
      [310, 47, 99, 99],
      [402, 47, 99, 99],
      [492, 47, 96, 99],
      [579, 47, 98, 99],
      [667, 47, 83, 99],
    ],
    face: [796, 49, 95, 101],
    missile: [519, 229, 140, 82],
    enemyHeli: [
      [18, 380, 105, 95],
      [118, 380, 106, 95],
      [216, 380, 101, 95],
      [311, 380, 103, 95],
      [407, 380, 103, 95],
    ],
    drone: [
      [533, 380, 83, 96],
      [615, 380, 84, 96],
      [696, 380, 81, 96],
      [772, 380, 81, 96],
      [849, 380, 80, 96],
      [925, 380, 82, 96],
    ],
    fighter: [
      [1033, 383, 116, 88],
      [1138, 383, 112, 88],
      [1238, 383, 108, 88],
      [1337, 383, 109, 88],
      [1437, 383, 82, 88],
    ],
    boss: [31, 543, 337, 166],
    explosion: [
      [397, 541, 67, 68],
      [467, 541, 67, 68],
      [538, 541, 68, 68],
      [611, 541, 68, 68],
      [683, 541, 69, 68],
      [754, 541, 69, 68],
      [824, 541, 69, 68],
      [893, 541, 68, 68],
      [397, 615, 68, 76],
      [467, 615, 68, 76],
      [538, 615, 69, 76],
      [610, 615, 69, 76],
      [682, 615, 70, 76],
      [753, 615, 70, 76],
      [824, 615, 70, 76],
      [893, 615, 69, 76],
    ],
    enemyBullet: [706, 943, 61, 67],
    playerBullet: [1057, 945, 76, 67],
    coin: [1245, 942, 90, 81],
    powerups: [
      [35, 942, 84, 80],
      [120, 942, 85, 80],
      [205, 942, 85, 80],
      [377, 942, 88, 80],
    ],
  };

  const AIRSHIP_CROPS = {
    boss: [35, 65, 845, 825],
    balloons: [
      [925, 60, 260, 425],
      [1215, 60, 275, 425],
      [920, 515, 255, 425],
      [1215, 515, 275, 425],
    ],
  };

  const sheet = new Image();
  const airshipSheet = new Image();
  const gondolaSheet = new Image();
  const helicopterSheets = {
    v1: new Image(),
    v2: new Image(),
  };
  const sprites = {};
  const keys = new Set();
  const pointer = { active: false, x: W * 0.22, y: H * 0.5 };

  let mode = "loading";
  let lastTime = performance.now();
  let audioContext = null;
  let soundEnabled = true;
  let selectedDifficulty = "normal";
  let selectedHelicopter = "v1";
  let airshipReady = false;
  let gondolaReady = false;
  let helicopterVariantsReady = 0;

  let player;
  let state;
  let enemies = [];
  let playerBullets = [];
  let enemyBullets = [];
  let balloonBaskets = [];
  let airshipGondolas = [];
  let airbase = null;
  let pickups = [];
  let effects = [];
  let particles = [];
  let stars = [];

  const rand = (min, max) => min + Math.random() * (max - min);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const lerp = (a, b, amount) => a + (b - a) * amount;

  function showOnly(screen) {
    [ui.loading, ui.menu, ui.pause, ui.shop, ui.helicopter, ui.gameover].forEach((item) => {
      item.classList.toggle("screen--visible", item === screen);
    });
  }

  function setMode(nextMode) {
    mode = nextMode;
    if (nextMode === "menu") showOnly(ui.menu);
    else if (nextMode === "paused") showOnly(ui.pause);
    else if (nextMode === "shop") showOnly(ui.shop);
    else if (nextMode === "helicopter") showOnly(ui.helicopter);
    else if (nextMode === "gameover") showOnly(ui.gameover);
    else showOnly(null);
    ui.pauseButton.textContent = nextMode === "paused" ? "SEGUIR" : "PAUSA";
  }

  function selectDifficulty(id) {
    if (!DIFFICULTIES[id]) return;
    selectedDifficulty = id;
    for (const button of ui.difficultyButtons) {
      const selected = button.dataset.difficulty === id;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    }
  }

  function selectHelicopter(id) {
    if (!HELICOPTERS[id]) return;
    selectedHelicopter = id;
    for (const button of [...ui.helicopterButtons, ...ui.changeHelicopterButtons]) {
      const selected = button.dataset.helicopter === id;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    }
  }

  function applyHelicopterStats(id) {
    const stats = HELICOPTERS[id];
    if (!stats || !player || !state) return;
    const previousHp = player.hp;
    player.helicopter = id;
    player.maxHp = state.difficulty.playerHp + stats.maxHpBonus;
    player.hp = Math.min(previousHp, player.maxHp);
    player.speedMultiplier = stats.speedMultiplier;
    player.fireCooldownMultiplier = stats.fireCooldownMultiplier;
    player.damageReduction = stats.damageReduction;
    player.hitboxBonus = stats.hitboxBonus;
  }

  function updateShopUI() {
    if (!state || !player) return;
    const nextWave = state.wave + 1;
    ui.shopCoins.textContent = `${state.coins} MONEDAS`;
    ui.shopWave.textContent = `PREPARANDO OLEADA ${nextWave}`;
    ui.shopSummary.textContent = `OLEADA ${state.wave} SUPERADA · Dificultad ${state.difficulty.label}`;
    ui.continueButton.textContent = `CONTINUAR · OLEADA ${nextWave}`;

    for (const button of ui.shopItemButtons) {
      const itemId = button.dataset.shopItem;
      const item = SHOP_ITEMS[itemId];
      const status = button.querySelector(".shop-item-status");
      const lifeAlreadyFull = itemId === "life" && player.hp >= player.maxHp;
      const canBuy = state.coins >= item.price && !lifeAlreadyFull;
      button.disabled = !canBuy;
      if (lifeAlreadyFull) status.textContent = "COMPLETO";
      else if (state.coins < item.price) status.textContent = "FALTAN MONEDAS";
      else if (itemId === "explosive" && player.explosiveAmmo > 0) status.textContent = `${player.explosiveAmmo} RESTANTES`;
      else status.textContent = "DISPONIBLE";
    }
  }

  function buyShopItem(itemId) {
    if (mode !== "shop" || !SHOP_ITEMS[itemId]) return;
    const item = SHOP_ITEMS[itemId];
    if (state.coins < item.price) return;
    if (itemId === "life" && player.hp >= player.maxHp) return;

    state.coins -= item.price;
    if (itemId === "life") player.hp = Math.min(player.maxHp, player.hp + 1);
    if (itemId === "shield") player.shield = Math.max(player.shield, SHIELD_DURATION);
    if (itemId === "rapid") player.rapid = Math.max(player.rapid, 10);
    if (itemId === "explosive") player.explosiveAmmo += 8;
    const purchaseColor = itemId === "shield" ? "#68d8ff" : itemId === "explosive" ? "#ff8a18" : "#d8f23b";
    createBurst(player.x, player.y, purchaseColor, 12, 150);
    tone(itemId === "life" ? 430 : 620, 0.16, "sine", 0.028, 220);
    updateShopUI();
  }

  function openShop() {
    if (mode !== "playing") return;
    for (const pickup of pickups) {
      if (pickup.type === "coin") state.coins += 1;
    }
    enemies = [];
    enemyBullets = [];
    playerBullets = [];
    balloonBaskets = [];
    airshipGondolas = [];
    pickups = [];
    state.bossClearTimer = 0;
    updateShopUI();
    setMode("shop");
    tone(300, 0.13, "square", 0.026, 160);
  }

  function continueFromShop() {
    if (mode !== "shop") return;
    advanceWave();
    setMode("playing");
    lastTime = performance.now();
    canvas.focus();
  }

  function spawnAirbase() {
    if (airbase || state.airbaseSpawned) return;
    const homeY = rand(170, H - 170);
    airbase = {
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
    state.airbaseSpawned = true;
    announceWave("BASE AÉREA · CAMBIO DISPONIBLE");
    tone(320, 0.2, "triangle", 0.026, 160);
  }

  function updateAirbase(dt) {
    if (!airbase) return;
    airbase.age += dt;
    airbase.y = airbase.homeY + Math.sin(airbase.age * 1.6 + airbase.phase) * 9;

    if (airbase.x > airbase.targetX) {
      airbase.x -= airbase.vx * dt;
    } else {
      airbase.dockAge += dt;
      if (airbase.dockAge > 14) {
        airbase = null;
        return;
      }
    }

    if (overlaps(player, airbase, 0.25)) openHelicopterBay();
  }

  function openHelicopterBay() {
    if (mode !== "playing" || !airbase) return;
    selectHelicopter(player.helicopter || selectedHelicopter);
    ui.helicopterSummary.textContent = `Helicóptero actual: ${HELICOPTERS[player.helicopter].label}. Elige tu nuevo aparato.`;
    setMode("helicopter");
    tone(520, 0.16, "sine", 0.03, 220);
  }

  function continueFromHelicopter() {
    if (mode !== "helicopter") return;
    applyHelicopterStats(selectedHelicopter);
    createBurst(player.x, player.y, selectedHelicopter === "v2" ? "#66e8ff" : "#d8f23b", 16, 180);
    tone(620, 0.18, "square", 0.028, 260);
    airbase = null;
    setMode("playing");
    lastTime = performance.now();
    canvas.focus();
  }

  function cutSprite(crop) {
    const [sx, sy, sw, sh] = crop;
    const output = document.createElement("canvas");
    output.width = sw;
    output.height = sh;
    const outputCtx = output.getContext("2d", { willReadFrequently: true });
    outputCtx.drawImage(sheet, sx, sy, sw, sh, 0, 0, sw, sh);

    let image;
    try {
      image = outputCtx.getImageData(0, 0, sw, sh);
    } catch {
      // Browsers can forbid pixel access when index.html is opened through
      // file://. Keep the sprite usable; the local launcher avoids this fallback.
      return output;
    }
    const data = image.data;
    const visited = new Uint8Array(sw * sh);
    const queue = new Int32Array(sw * sh);
    let head = 0;
    let tail = 0;

    const looksLikeBackground = (index) => {
      const offset = index * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      return max - min < 19 && (r + g + b) / 3 > 204;
    };

    const add = (index) => {
      if (!visited[index] && looksLikeBackground(index)) {
        visited[index] = 1;
        queue[tail++] = index;
      }
    };

    for (let x = 0; x < sw; x += 1) {
      add(x);
      add((sh - 1) * sw + x);
    }
    for (let y = 0; y < sh; y += 1) {
      add(y * sw);
      add(y * sw + sw - 1);
    }

    while (head < tail) {
      const index = queue[head++];
      const x = index % sw;
      const y = Math.floor(index / sw);
      data[index * 4 + 3] = 0;
      if (x > 0) add(index - 1);
      if (x < sw - 1) add(index + 1);
      if (y > 0) add(index - sw);
      if (y < sh - 1) add(index + sw);
    }

    // Some frames in the supplied contact sheet overlap their neighbours by a few
    // pixels. Remove small foreground islands clipped by the crop edge while
    // keeping the main sprite and detached details such as rotors or flames.
    const foregroundSeen = new Uint8Array(sw * sh);
    const foregroundQueue = new Int32Array(sw * sh);
    const component = [];
    const smallIslandLimit = sw * sh * 0.075;

    for (let start = 0; start < sw * sh; start += 1) {
      if (foregroundSeen[start] || data[start * 4 + 3] === 0) continue;
      let foregroundHead = 0;
      let foregroundTail = 0;
      let touchesEdge = false;
      component.length = 0;
      foregroundSeen[start] = 1;
      foregroundQueue[foregroundTail++] = start;

      while (foregroundHead < foregroundTail) {
        const index = foregroundQueue[foregroundHead++];
        const x = index % sw;
        const y = Math.floor(index / sw);
        component.push(index);
        if (x === 0 || y === 0 || x === sw - 1 || y === sh - 1) touchesEdge = true;

        const neighbours = [];
        if (x > 0) neighbours.push(index - 1);
        if (x < sw - 1) neighbours.push(index + 1);
        if (y > 0) neighbours.push(index - sw);
        if (y < sh - 1) neighbours.push(index + sw);
        for (const neighbour of neighbours) {
          if (!foregroundSeen[neighbour] && data[neighbour * 4 + 3] > 0) {
            foregroundSeen[neighbour] = 1;
            foregroundQueue[foregroundTail++] = neighbour;
          }
        }
      }

      if (touchesEdge && component.length < smallIslandLimit) {
        for (const index of component) data[index * 4 + 3] = 0;
      }
    }

    outputCtx.putImageData(image, 0, 0);
    return output;
  }

  function prepareSprites() {
    sprites.player = CROPS.player.map(cutSprite);
    sprites.face = cutSprite(CROPS.face);
    sprites.missile = cutSprite(CROPS.missile);
    sprites.enemyHeli = CROPS.enemyHeli.map(cutSprite);
    sprites.drone = CROPS.drone.map(cutSprite);
    sprites.fighter = CROPS.fighter.map(cutSprite);
    sprites.boss = cutSprite(CROPS.boss);
    sprites.explosion = CROPS.explosion.map(cutSprite);
    sprites.enemyBullet = cutSprite(CROPS.enemyBullet);
    sprites.playerBullet = cutSprite(CROPS.playerBullet);
    sprites.coin = cutSprite(CROPS.coin);
    sprites.powerups = CROPS.powerups.map(cutSprite);
  }

  function cutAirshipSprite(crop) {
    const [sx, sy, sw, sh] = crop;
    const output = document.createElement("canvas");
    output.width = sw;
    output.height = sh;
    output.getContext("2d").drawImage(airshipSheet, sx, sy, sw, sh, 0, 0, sw, sh);
    return output;
  }

  function prepareAirshipSprites() {
    sprites.airshipBoss = cutAirshipSprite(AIRSHIP_CROPS.boss);
    sprites.balloons = AIRSHIP_CROPS.balloons.map(cutAirshipSprite);
  }

  function resetGame() {
    const difficulty = DIFFICULTIES[selectedDifficulty];
    const helicopter = HELICOPTERS[selectedHelicopter];
    const maxHp = difficulty.playerHp + helicopter.maxHpBonus;
    player = {
      x: 150,
      y: H * 0.5,
      w: 150,
      h: 100,
      helicopter: selectedHelicopter,
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

    state = {
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
      highScore: getHighScore(),
      difficulty,
    };

    enemies = [];
    playerBullets = [];
    enemyBullets = [];
    balloonBaskets = [];
    airshipGondolas = [];
    airbase = null;
    pickups = [];
    effects = [];
    particles = [];
    stars = Array.from({ length: 46 }, () => ({
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
    canvas.focus();
    unlockAudio();
    tone(360, 0.08, "square", 0.035);
    setTimeout(() => tone(540, 0.12, "square", 0.035), 90);
  }

  function getHighScore() {
    try {
      return Number(localStorage.getItem("operacion-nacho-record")) || 0;
    } catch {
      return 0;
    }
  }

  function saveHighScore(score) {
    try {
      localStorage.setItem("operacion-nacho-record", String(score));
    } catch {
      // The game still works when storage is unavailable.
    }
  }

  function unlockAudio() {
    if (!audioContext) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (AudioCtor) audioContext = new AudioCtor();
    }
    if (audioContext?.state === "suspended") audioContext.resume();
  }

  function tone(frequency, duration, type = "square", volume = 0.025, slide = 0) {
    if (!soundEnabled || !audioContext) return;
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.linearRampToValueAtTime(Math.max(40, frequency + slide), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  function toggleSound() {
    soundEnabled = !soundEnabled;
    ui.soundButton.textContent = `SONIDO: ${soundEnabled ? "ON" : "OFF"}`;
    if (soundEnabled) {
      unlockAudio();
      tone(520, 0.09, "square", 0.03);
    }
  }

  function togglePause() {
    if (mode === "playing") {
      setMode("paused");
    } else if (mode === "paused") {
      setMode("playing");
      lastTime = performance.now();
      canvas.focus();
    }
  }

  function announceWave(text) {
    state.banner = 2.3;
    state.bannerText = text;
    tone(220, 0.12, "sawtooth", 0.035, 90);
    setTimeout(() => tone(440, 0.16, "square", 0.03), 110);
  }

  function isBossEnemy(enemy) {
    return enemy.type === "boss" || enemy.type === "airship";
  }

  function advanceWave() {
    state.wave += 1;
    state.waveTime = 0;
    state.spawnTimer = 1;
    state.bossSpawned = false;
    state.bossActive = false;
    state.bossClearTimer = 0;
    state.airbaseSpawned = false;
    airbase = null;
    state.background = Math.floor((state.wave - 1) / 2) % CROPS.backgrounds.length;
    const bossWave = state.wave % 4 === 0;
    const airshipWave = state.wave % 8 === 0;
    announceWave(bossWave ? `${airshipWave ? "DIRIGIBLE" : "JEFE"} · OLEADA ${state.wave}` : `OLEADA ${state.wave}`);
  }

  function spawnEnemy(forcedType) {
    const difficulty = state.difficulty;
    const roll = Math.random();
    let type = forcedType;
    if (!type) {
      if (state.wave >= 3 && roll < 0.25) type = "fighter";
      else if (state.wave >= 2 && roll < 0.58) type = "drone";
      else type = "heli";
    }

    const base = {
      type,
      x: W + 100,
      y: rand(92, H - 88),
      age: 0,
      phase: rand(0, Math.PI * 2),
      fireTimer: rand(0.7, 2.2) * difficulty.enemyFireMultiplier,
      dead: false,
      flash: 0,
    };

    if (type === "drone") {
      const hp = Math.max(1, Math.ceil((2 + Math.floor(state.wave / 4)) * difficulty.enemyHpMultiplier));
      enemies.push({
        ...base,
        w: 76,
        h: 76,
        hp,
        maxHp: hp,
        vx: (rand(190, 245) + state.wave * 4) * difficulty.enemySpeedMultiplier,
        score: 180,
        amplitude: rand(38, 82),
      });
    } else if (type === "fighter") {
      const hp = Math.max(1, Math.ceil((3 + Math.floor(state.wave / 4)) * difficulty.enemyHpMultiplier));
      enemies.push({
        ...base,
        w: 132,
        h: 77,
        hp,
        maxHp: hp,
        vx: (rand(260, 340) + state.wave * 5) * difficulty.enemySpeedMultiplier,
        score: 260,
        amplitude: rand(18, 45),
      });
    } else {
      const hp = Math.max(1, Math.ceil((4 + Math.floor(state.wave / 3)) * difficulty.enemyHpMultiplier));
      enemies.push({
        ...base,
        w: 130,
        h: 98,
        hp,
        maxHp: hp,
        vx: (rand(105, 145) + state.wave * 4) * difficulty.enemySpeedMultiplier,
        score: 220,
        amplitude: rand(24, 55),
      });
    }
  }

  function spawnBoss() {
    const difficulty = state.difficulty;
    const airship = state.wave % 8 === 0;
    const hp = Math.ceil((65 + state.wave * 8) * difficulty.bossHpMultiplier);
    enemies.push({
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
    state.bossSpawned = true;
    state.bossActive = true;
    announceWave(airship ? "¡DIRIGIBLE DE GLOBOS!" : "¡ACORAZADO ENEMIGO!");
    tone(airship ? 170 : 92, 0.55, "sawtooth", 0.05, airship ? 80 : -28);
  }

  function spawnBalloon(airship, offsetY = 0) {
    const difficulty = state.difficulty;
    const hp = Math.max(1, Math.ceil(1.2 * difficulty.enemyHpMultiplier));
    enemies.push({
      type: "balloon",
      x: airship.x - airship.w * 0.4,
      y: clamp(airship.y + offsetY, 90, H - 90),
      w: 62,
      h: 102,
      hp,
      maxHp: hp,
      vx: (145 + state.wave * 4) * difficulty.enemySpeedMultiplier,
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
    const dx = player.x - x;
    const dy = player.y - y;
    const distance = Math.hypot(dx, dy) || 1;
    balloonBaskets.push({
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
    airshipGondolas.push({
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
    state.banner = 1.8;
    state.bannerText = "¡GÓNDOLA AL ACECHO!";
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
    if (Math.hypot(player.x - basket.x, player.y - basket.y) <= 118) {
      hurtPlayer(1);
    }
  }

  function detonateAirshipGondola(gondola) {
    if (gondola.dead) return;
    gondola.dead = true;
    createExplosion(gondola.x, gondola.y, 112);
    createBurst(gondola.x, gondola.y, "#ff642c", 20, 220);
    tone(125, 0.22, "sawtooth", 0.032, 180);

    if (Math.hypot(player.x - gondola.x, player.y - gondola.y) <= 142) {
      hurtPlayer(2);
    }
  }

  function shootPlayer() {
    const spread = player.rapid > 0 ? [-0.07, 0.07] : [0];
    let explosiveShots = player.explosiveAmmo;
    let usedExplosive = false;
    spread.forEach((angle) => {
      const speed = 800;
      const explosive = explosiveShots > 0;
      if (explosive) explosiveShots -= 1;
      usedExplosive ||= explosive;
      playerBullets.push({
        x: player.x + player.w * 0.42,
        y: player.y + 12,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        w: explosive ? 72 : player.rapid > 0 ? 57 : 64,
        h: explosive ? 28 : player.rapid > 0 ? 22 : 25,
        damage: explosive ? 2 : 1,
        explosive,
      });
    });
    player.explosiveAmmo = explosiveShots;
    player.cooldown = (player.rapid > 0 ? 0.105 : 0.19) * player.fireCooldownMultiplier;
    createBurst(player.x + player.w * 0.45, player.y + 10, usedExplosive ? "#ff8a18" : "#8ef8ff", 3, 45);
    tone(usedExplosive ? 380 : player.rapid > 0 ? 640 : 520, 0.035, "square", 0.008, 90);
  }

  function shootEnemy(enemy) {
    const difficulty = state.difficulty;
    if (enemy.type === "airship") {
      spawnBalloon(enemy, -30);
      spawnBalloon(enemy, 30);
      enemy.fireTimer = rand(1.7, 2.45) * difficulty.enemyFireMultiplier;
      tone(280, 0.16, "triangle", 0.022, -80);
      return;
    }
    if (enemy.type === "boss") {
      const angles = [-0.34, -0.17, 0.17, 0.34];
      angles.forEach((angle) => {
        const speed = (230 + state.wave * 3) * difficulty.enemySpeedMultiplier;
        enemyBullets.push({
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
      enemy.fireTimer = rand(1.1, 1.55) * difficulty.enemyFireMultiplier;
      tone(125, 0.12, "sawtooth", 0.018, -30);
      return;
    }

    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const length = Math.hypot(dx, dy) || 1;
    const speed = (enemy.type === "fighter" ? 340 : 250) * difficulty.enemySpeedMultiplier;
    enemyBullets.push({
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
      rand(1.5, 2.8) * difficulty.enemyFireMultiplier * Math.max(0.55, 1 - state.wave * 0.025);
  }

  function createBurst(x, y, color, count = 8, speed = 150) {
    for (let i = 0; i < count; i += 1) {
      const angle = rand(0, Math.PI * 2);
      const velocity = rand(speed * 0.35, speed);
      particles.push({
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
    effects.push({ x, y, size, age: 0, duration: 0.72 });
    createBurst(x, y, "#ff8a18", Math.round(size / 10), size * 1.25);
    state.shake = Math.max(state.shake, Math.min(13, size / 13));
  }

  function dropReward(enemy) {
    const chance = isBossEnemy(enemy) ? 1 : Math.random();
    if (isBossEnemy(enemy)) {
      for (let i = 0; i < 8; i += 1) {
        pickups.push({
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
      pickups.push({
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
      pickups.push({
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
      pickups.push({
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
    state.score += Math.round(enemy.score * state.difficulty.scoreMultiplier);
    createExplosion(enemy.x, enemy.y, isBossEnemy(enemy) ? (enemy.type === "airship" ? 210 : 240) : enemy.w * 0.88);
    dropReward(enemy);

    if (isBossEnemy(enemy)) {
      state.bossActive = false;
      state.bossClearTimer = 3.3;
      state.flash = 0.35;
      announceWave(enemy.type === "airship" ? "¡DIRIGIBLE DERRIBADO!" : "¡JEFE DERRIBADO!");
      tone(enemy.type === "airship" ? 180 : 120, 0.42, "sawtooth", 0.045, 420);
    } else {
      tone(105, 0.12, "sawtooth", 0.018, -40);
    }
  }

  function hurtPlayer(damage) {
    if (player.invulnerable > 0) return;
    if (player.shield > 0) {
      player.invulnerable = 0.28;
      player.shield = Math.max(0, player.shield - 0.7);
      createBurst(player.x, player.y, "#68cfff", 12, 190);
      tone(710, 0.1, "sine", 0.03, -250);
      return;
    }

    const actualDamage = damage * (1 - player.damageReduction);
    player.hp -= actualDamage;
    player.invulnerable = 1.05;
    state.shake = 12;
    state.flash = 0.16;
    createExplosion(player.x + 18, player.y, 72);
    tone(140, 0.22, "sawtooth", 0.035, -90);
    if (player.hp <= 0) endGame();
  }

  function collectPickup(pickup) {
    if (pickup.type === "coin") {
      state.coins += 1;
      state.score += 100;
      tone(740, 0.065, "square", 0.024, 180);
    } else if (pickup.type === "heart") {
      player.hp = Math.min(player.maxHp, player.hp + 2);
      tone(430, 0.15, "sine", 0.028, 220);
    } else if (pickup.type === "shield") {
      player.shield = Math.max(player.shield, SHIELD_DURATION);
      tone(520, 0.2, "sine", 0.028, 260);
    } else if (pickup.type === "rapid") {
      player.rapid = Math.max(player.rapid, 8);
      tone(300, 0.2, "square", 0.025, 450);
    } else {
      state.score += 1500;
      player.hp = Math.min(player.maxHp, player.hp + 1);
      player.shield = Math.max(player.shield, SHIELD_DURATION);
      tone(320, 0.32, "square", 0.03, 520);
    }
    createBurst(pickup.x, pickup.y, "#ffe653", 12, 150);
    pickup.collected = true;
  }

  function endGame() {
    if (mode !== "playing") return;
    const isRecord = state.score > state.highScore;
    if (isRecord) saveHighScore(state.score);
    ui.resultTitle.textContent = isRecord ? "¡NUEVO RÉCORD!" : "MISIÓN TERMINADA";
    ui.resultCopy.textContent =
      `Dificultad: ${state.difficulty.label} · Puntuación: ${state.score.toLocaleString("es-ES")} · Monedas: ${state.coins}`;
    setMode("gameover");
  }

  function overlaps(a, b, inset = 0.25) {
    const aw = a.w * (1 - inset);
    const ah = a.h * (1 - inset);
    const bw = b.w * (1 - inset);
    const bh = b.h * (1 - inset);
    return Math.abs(a.x - b.x) * 2 < aw + bw && Math.abs(a.y - b.y) * 2 < ah + bh;
  }

  function detonateExplosiveBullet(bullet, directHit) {
    const radius = 118;
    for (const enemy of enemies) {
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
    if (keys.has("ArrowLeft") || keys.has("KeyA")) dx -= 1;
    if (keys.has("ArrowRight") || keys.has("KeyD")) dx += 1;
    if (keys.has("ArrowUp") || keys.has("KeyW")) dy -= 1;
    if (keys.has("ArrowDown") || keys.has("KeyS")) dy += 1;

    if (dx || dy) {
      const length = Math.hypot(dx, dy);
      const movementSpeed = 390 * player.speedMultiplier;
      player.x += (dx / length) * movementSpeed * dt;
      player.y += (dy / length) * movementSpeed * dt;
      player.tilt = lerp(player.tilt, (dy / length) * 0.11, dt * 9);
    } else if (pointer.active) {
      const pointerSpeed = player.speedMultiplier * 8;
      player.x = lerp(player.x, pointer.x, Math.min(1, dt * pointerSpeed));
      player.y = lerp(player.y, pointer.y, Math.min(1, dt * pointerSpeed));
      player.tilt = lerp(player.tilt, clamp((pointer.y - player.y) / 260, -0.11, 0.11), dt * pointerSpeed);
    } else {
      player.tilt = lerp(player.tilt, 0, dt * 6);
    }

    player.x = clamp(player.x, 68, W - 80);
    player.y = clamp(player.y, 70, H - 68);
    player.cooldown = Math.max(0, player.cooldown - dt);
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    player.shield = Math.max(0, player.shield - dt);
    player.rapid = Math.max(0, player.rapid - dt);
    player.frame = Math.floor(state.elapsed * 8) % sprites.player.length;

    const firing = keys.has("Space") || keys.has("KeyJ") || pointer.active;
    if (firing && player.cooldown <= 0) shootPlayer();
  }

  function updateEnemies(dt) {
    for (const enemy of enemies) {
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
        enemy.x > player.x + 120
      ) {
        shootEnemy(enemy);
      }
      if (enemy.x < -enemy.w) enemy.dead = true;

      const hitboxInset = isBossEnemy(enemy) ? 0.42 : enemy.type === "balloon" ? 0.18 : 0.34;
      const playerEnemyHitbox = clamp(hitboxInset + player.hitboxBonus, 0, 0.8);
      if (!enemy.dead && overlaps(player, enemy, playerEnemyHitbox)) {
        hurtPlayer(isBossEnemy(enemy) ? 2 : 1);
        if (!isBossEnemy(enemy)) killEnemy(enemy);
      }
    }

    for (const bullet of playerBullets) {
      for (const enemy of enemies) {
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

    enemies = enemies.filter((enemy) => !enemy.dead);
  }

  function updateBalloonBaskets(dt) {
    for (const basket of balloonBaskets) {
      if (basket.dead) continue;
      basket.age += dt;

      // The basket keeps falling, but corrects its horizontal and vertical
      // course toward the helicopter so it remains a dodgeable threat.
      const dx = player.x - basket.x;
      const dy = player.y - basket.y;
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

      if (overlaps(player, basket, clamp(0.14 + player.hitboxBonus, 0, 0.8))) {
        detonateBalloonBasket(basket);
      }
    }
    balloonBaskets = balloonBaskets.filter((basket) => !basket.dead);
  }

  function updateAirshipGondolas(dt) {
    for (const gondola of airshipGondolas) {
      if (gondola.dead) continue;
      gondola.age += dt;

      const dx = player.x - gondola.x;
      const dy = player.y - gondola.y;
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

      if (overlaps(player, gondola, clamp(0.22 + player.hitboxBonus, 0, 0.8))) {
        detonateAirshipGondola(gondola);
      }
    }
    airshipGondolas = airshipGondolas.filter((gondola) => !gondola.dead);
  }

  function updateProjectiles(dt) {
    for (const bullet of playerBullets) {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      if (bullet.x > W + 120 || bullet.y < -40 || bullet.y > H + 40) bullet.dead = true;
    }

    for (const bullet of enemyBullets) {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.age += dt;
      if (!bullet.dead && !bullet.reflected && player.shield > 0) {
        const dx = bullet.x - player.x;
        const dy = bullet.y - player.y;
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
          bullet.x = player.x + nx * (SHIELD_RADIUS + bulletRadius + 2);
          bullet.y = player.y + ny * (SHIELD_RADIUS + bulletRadius + 2);
          bullet.vx = (reflectedVx / reflectedSpeed) * reboundSpeed;
          bullet.vy = (reflectedVy / reflectedSpeed) * reboundSpeed;
          bullet.damage = Math.max(2, bullet.damage * 2);
          bullet.age = 0;
          createBurst(bullet.x, bullet.y, "#68d8ff", 10, 180);
          tone(760, 0.1, "sine", 0.03, -260);
        }
      }
      const bulletHitbox = clamp(
        state.difficulty.enemyBulletHitboxInset + player.hitboxBonus,
        0,
        0.8,
      );
      if (!bullet.dead && !bullet.reflected && overlaps(player, bullet, bulletHitbox)) {
        bullet.dead = true;
        hurtPlayer(bullet.damage);
      }
      if (!bullet.dead && bullet.reflected) {
        for (const enemy of enemies) {
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

    playerBullets = playerBullets.filter((bullet) => !bullet.dead);
    enemyBullets = enemyBullets.filter((bullet) => !bullet.dead);
  }

  function updatePickups(dt) {
    for (const pickup of pickups) {
      pickup.age += dt;
      pickup.x += pickup.vx * dt;
      pickup.y += pickup.vy * dt;
      pickup.y += Math.sin(pickup.age * 4) * 18 * dt;
      pickup.vx = lerp(pickup.vx, -55, dt);
      pickup.vy *= Math.pow(0.985, dt * 60);
      if (!pickup.collected && overlaps(player, pickup, 0.05)) collectPickup(pickup);
      if (pickup.x < -70) pickup.collected = true;
    }
    pickups = pickups.filter((pickup) => !pickup.collected);
  }

  function updateEffects(dt) {
    for (const effect of effects) effect.age += dt;
    effects = effects.filter((effect) => effect.age < effect.duration);

    for (const particle of particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= Math.pow(0.96, dt * 60);
      particle.vy *= Math.pow(0.96, dt * 60);
    }
    particles = particles.filter((particle) => particle.life > 0);

    for (const star of stars) {
      star.x -= star.speed * dt;
      if (star.x < -5) {
        star.x = W + 5;
        star.y = rand(0, H);
      }
    }
  }

  function updateGame(dt) {
    state.elapsed += dt;
    state.waveTime += dt;
    state.banner = Math.max(0, state.banner - dt);
    state.shake = Math.max(0, state.shake - dt * 30);
    state.flash = Math.max(0, state.flash - dt);

    updatePlayer(dt);
    updateAirbase(dt);
    updateProjectiles(dt);
    updateEnemies(dt);
    updateBalloonBaskets(dt);
    updateAirshipGondolas(dt);
    updatePickups(dt);
    updateEffects(dt);

    if (state.wave % 4 === 0) {
      if (!state.bossSpawned) spawnBoss();
      else if (!state.bossActive) {
        state.bossClearTimer -= dt;
        const balloonsAlive = enemies.some((enemy) => enemy.type === "balloon");
        if (
          state.bossClearTimer <= 0 &&
          !balloonsAlive &&
          balloonBaskets.length === 0 &&
          airshipGondolas.length === 0
        ) {
          openShop();
        }
      }
    } else {
      if (
        state.wave >= 2 &&
        state.wave % 2 === 0 &&
        state.wave % 4 !== 0 &&
        !state.airbaseSpawned &&
        state.waveTime > 6
      ) {
        spawnAirbase();
      }
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        spawnEnemy();
        state.spawnTimer =
          Math.max(0.48, 1.28 - state.wave * 0.055) *
          state.difficulty.spawnIntervalMultiplier *
          rand(0.78, 1.24);
      }
      if (state.waveTime > state.difficulty.waveDuration && !airbase) openShop();
    }
  }

  function drawSprite(image, x, y, width, height, options = {}) {
    if (!image) return;
    ctx.save();
    ctx.translate(x, y);
    if (options.rotate) ctx.rotate(options.rotate);
    if (options.flipX) ctx.scale(-1, 1);
    if (options.alpha !== undefined) ctx.globalAlpha = options.alpha;
    if (options.glow) {
      ctx.shadowColor = options.glow;
      ctx.shadowBlur = options.blur || 14;
    }
    ctx.drawImage(image, -width / 2, -height / 2, width, height);
    ctx.restore();
  }

  function drawAirshipSprite(enemy) {
    drawSprite(sprites.airshipBoss, enemy.x, enemy.y, enemy.w, enemy.h, {
      rotate: Math.sin(enemy.age * 0.65) * 0.018,
      glow: "rgba(255, 72, 20, 0.22)",
      blur: 16,
    });
  }

  function drawBalloonSprite(enemy) {
    const bob = Math.sin(enemy.age * 5 + enemy.phase) * 4;
    const animationPose = Math.floor(enemy.age * 2.4 + enemy.phase) % 2;
    const frame = enemy.spriteVariant + animationPose * 2;
    drawSprite(sprites.balloons[frame], enemy.x, enemy.y + bob, enemy.w, enemy.h, {
      rotate: Math.sin(enemy.age * 2.1 + enemy.phase) * 0.035,
      glow: "rgba(255, 74, 35, 0.32)",
      blur: 9,
    });
  }

  function drawBackground(backgroundIndex = 0) {
    const crop = CROPS.backgrounds[backgroundIndex % CROPS.backgrounds.length];
    ctx.drawImage(sheet, crop[0], crop[1], crop[2], crop[3], 0, 0, W, H);

    const tint = ctx.createLinearGradient(0, 0, 0, H);
    tint.addColorStop(0, "rgba(12, 49, 72, 0.04)");
    tint.addColorStop(0.62, "rgba(1, 18, 25, 0.02)");
    tint.addColorStop(1, "rgba(0, 7, 11, 0.38)");
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, W, H);

    if (state) {
      for (const star of stars) {
        ctx.globalAlpha = star.alpha;
        ctx.fillStyle = backgroundIndex === 2 ? "#ffbb65" : "#d6f7ff";
        ctx.fillRect(star.x, star.y, star.size * 6, star.size);
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawMenuBackdrop() {
    drawBackground(0);
    const rightShade = ctx.createLinearGradient(W * 0.45, 0, W, 0);
    rightShade.addColorStop(0, "rgba(0, 17, 24, 0)");
    rightShade.addColorStop(1, "rgba(0, 17, 24, 0.16)");
    ctx.fillStyle = rightShade;
    ctx.fillRect(0, 0, W, H);

    drawSprite(sprites.boss, W * 0.81, H * 0.52, 410, 205, {
      rotate: -0.02,
      glow: "rgba(255, 72, 20, 0.28)",
      blur: 24,
    });
    drawSprite(sprites.player[0], W * 0.59, H * 0.4, 190, 145, {
      rotate: 0.02,
      glow: "rgba(95, 226, 255, 0.25)",
      blur: 22,
    });
    drawSprite(sprites.drone[4], W * 0.68, H * 0.2, 88, 98);
    drawSprite(sprites.fighter[2], W * 0.9, H * 0.22, 145, 88);
  }

  function roundedRect(x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, r);
  }

  function drawHud() {
    ctx.save();
    ctx.textBaseline = "middle";

    roundedRect(18, 17, 390, 72, 12);
    ctx.fillStyle = "rgba(4, 13, 18, 0.77)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.stroke();

    drawSprite(sprites.face, 57, 53, 64, 66);
    ctx.fillStyle = "#d8f23b";
    ctx.font = '700 12px Inter, sans-serif';
    ctx.fillText("BLINDAJE", 96, 37);

    const segmentGap = 3;
    const healthBarWidth = 294;
    const segmentWidth = Math.min(
      35,
      (healthBarWidth - segmentGap * Math.max(0, player.maxHp - 1)) / player.maxHp,
    );
    for (let i = 0; i < player.maxHp; i += 1) {
      roundedRect(96 + i * (segmentWidth + segmentGap), 51, segmentWidth, 16, 3);
      ctx.fillStyle = i < player.hp ? (i < 2 ? "#ff5a24" : "#d7ef31") : "rgba(255,255,255,0.13)";
      ctx.fill();
    }

    if (player.explosiveAmmo > 0 || player.rapid > 0 || player.shield > 0) {
      const label = player.explosiveAmmo > 0
        ? `EXPLOSIVOS ${player.explosiveAmmo}`
        : player.rapid > 0
          ? `RÁFAGA ${Math.ceil(player.rapid)}s`
          : `ESCUDO ${Math.ceil(player.shield)}s`;
      ctx.fillStyle = player.explosiveAmmo > 0 ? "#ff8a18" : player.rapid > 0 ? "#ffb02e" : "#68d8ff";
      ctx.font = '900 11px Inter, sans-serif';
      ctx.fillText(label, 96, 77);
    }

    roundedRect(W / 2 - 78, 17, 156, 60, 10);
    ctx.fillStyle = "rgba(4, 13, 18, 0.77)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.62)";
    ctx.font = '900 10px Inter, sans-serif';
    ctx.fillText("OLEADA", W / 2, 34);
    ctx.fillStyle = "#ffffff";
    ctx.font = '400 26px "Black Ops One", Impact, sans-serif';
    ctx.fillText(String(state.wave).padStart(2, "0"), W / 2, 57);

    roundedRect(W - 300, 17, 282, 72, 12);
    ctx.fillStyle = "rgba(4, 13, 18, 0.77)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.stroke();
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255,255,255,0.58)";
    ctx.font = '900 10px Inter, sans-serif';
    ctx.fillText("PUNTOS", W - 114, 36);
    ctx.fillStyle = "#ffffff";
    ctx.font = '400 25px "Black Ops One", Impact, sans-serif';
    ctx.fillText(state.score.toLocaleString("es-ES"), W - 114, 62);
    drawSprite(sprites.coin, W - 67, 53, 45, 43);
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffd63c";
    ctx.font = '900 18px Inter, sans-serif';
    ctx.fillText(String(state.coins), W - 46, 54);

    const boss = enemies.find((enemy) => isBossEnemy(enemy));
    if (boss) {
      const barWidth = 560;
      const x = W / 2 - barWidth / 2;
      const y = H - 39;
      roundedRect(x - 8, y - 8, barWidth + 16, 30, 8);
      ctx.fillStyle = "rgba(4, 9, 12, 0.82)";
      ctx.fill();
      roundedRect(x, y, barWidth, 14, 5);
      ctx.fillStyle = "rgba(255,255,255,0.13)";
      ctx.fill();
      roundedRect(x, y, barWidth * clamp(boss.hp / boss.maxHp, 0, 1), 14, 5);
      ctx.fillStyle = "#ff4d21";
      ctx.fill();
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      ctx.font = '900 10px Inter, sans-serif';
      ctx.fillText(boss.type === "airship" ? "DIRIGIBLE DE GLOBOS" : "ACORAZADO 3000", W / 2, y - 13);
    }
    ctx.restore();
  }

  function drawBalloonBasket(basket) {
    ctx.save();
    ctx.translate(basket.x, basket.y);
    ctx.rotate(clamp(basket.vx / 900, -0.24, 0.24) + Math.sin(basket.age * 7 + basket.phase) * 0.08);
    ctx.shadowColor = "rgba(255, 91, 39, 0.52)";
    ctx.shadowBlur = 10;

    // Broken suspension ropes show that the basket has detached from the balloon.
    ctx.strokeStyle = "rgba(237, 205, 128, 0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-11, -14);
    ctx.lineTo(-7, -4);
    ctx.moveTo(11, -14);
    ctx.lineTo(7, -4);
    ctx.stroke();

    const basketFill = ctx.createLinearGradient(0, -5, 0, 15);
    basketFill.addColorStop(0, "#d18a3d");
    basketFill.addColorStop(0.5, "#8a4e2b");
    basketFill.addColorStop(1, "#42251d");
    ctx.fillStyle = basketFill;
    ctx.strokeStyle = "#211615";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-14, -5);
    ctx.lineTo(14, -5);
    ctx.lineTo(11, 14);
    ctx.lineTo(-11, 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 205, 111, 0.62)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-10, 1);
    ctx.lineTo(10, 6);
    ctx.moveTo(-9, 8);
    ctx.lineTo(9, 2);
    ctx.stroke();

    ctx.fillStyle = "#ff4925";
    ctx.shadowColor = "#ff3b18";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(0, -1, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawAirshipGondola(gondola) {
    ctx.save();
    ctx.translate(gondola.x, gondola.y);
    ctx.rotate(clamp(gondola.vx / 900, -0.25, 0.25) + Math.sin(gondola.age * 4.5 + gondola.phase) * 0.05);
    drawSprite(sprites.airshipGondola, 0, 0, gondola.w, gondola.h, {
      glow: "rgba(255, 73, 28, 0.58)",
      blur: 17,
    });

    // The ring counts down the ten-second pursuit phase.
    const remaining = clamp(1 - gondola.age / 10, 0, 1);
    ctx.strokeStyle = "rgba(255, 208, 83, 0.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -34, 11, -Math.PI / 2, -Math.PI / 2 + remaining * Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawAirbase(base) {
    ctx.save();
    ctx.translate(base.x, base.y);
    ctx.shadowColor = "rgba(91, 227, 255, 0.52)";
    ctx.shadowBlur = 18;

    // A compact flying platform with a clear landing pad and approach lights.
    ctx.fillStyle = "rgba(79, 220, 255, 0.12)";
    ctx.beginPath();
    ctx.ellipse(0, 38, 105, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#243238";
    ctx.strokeStyle = "#101719";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-112, -20);
    ctx.lineTo(107, -20);
    ctx.lineTo(122, 12);
    ctx.lineTo(91, 31);
    ctx.lineTo(-91, 31);
    ctx.lineTo(-122, 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#d8f23b";
    ctx.strokeStyle = "#536a16";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-74, -8);
    ctx.lineTo(74, -8);
    ctx.lineTo(61, 13);
    ctx.lineTo(-61, 13);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#132126";
    ctx.font = '900 16px Inter, sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("ATERRIZA", 0, 3);

    ctx.strokeStyle = "#162326";
    ctx.lineWidth = 4;
    for (const x of [-78, 78]) {
      ctx.beginPath();
      ctx.moveTo(x, 22);
      ctx.lineTo(x * 0.72, 47);
      ctx.stroke();
    }
    for (const x of [-84, -42, 42, 84]) {
      ctx.fillStyle = Math.floor(base.age * 5 + x) % 2 === 0 ? "#ffe95b" : "#ff6b2c";
      ctx.beginPath();
      ctx.arc(x, -27, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = "#1b2629";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-86, -22);
    ctx.lineTo(-113, -48);
    ctx.moveTo(86, -22);
    ctx.lineTo(113, -48);
    ctx.stroke();
    ctx.save();
    ctx.translate(-124, -56);
    ctx.rotate(base.age * 6);
    ctx.strokeStyle = "#5d7175";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(0, 15);
    ctx.moveTo(-15, 0);
    ctx.lineTo(15, 0);
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.translate(124, -56);
    ctx.rotate(-base.age * 6);
    ctx.strokeStyle = "#5d7175";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(0, 15);
    ctx.moveTo(-15, 0);
    ctx.lineTo(15, 0);
    ctx.stroke();
    ctx.restore();
    ctx.restore();
  }

  function drawEntities() {
    for (const pickup of pickups) {
      const bob = Math.sin(pickup.age * 7) * 4;
      if (pickup.type === "coin") {
        drawSprite(sprites.coin, pickup.x, pickup.y + bob, pickup.w, pickup.h, {
          glow: "#ffd63c",
          blur: 9,
        });
      } else {
        const index = { rapid: 0, shield: 1, heart: 2, star: 3 }[pickup.type] ?? 3;
        drawSprite(sprites.powerups[index], pickup.x, pickup.y + bob, pickup.w, pickup.h, {
          glow: pickup.type === "heart" ? "#ff472c" : "#9ce7ff",
          blur: 10,
        });
      }
    }

    if (airbase) drawAirbase(airbase);

    for (const bullet of playerBullets) {
      drawSprite(bullet.explosive ? sprites.missile : sprites.playerBullet, bullet.x, bullet.y, bullet.w, bullet.h, {
        glow: bullet.explosive ? "#ff8a18" : "#6cecff",
        blur: 13,
      });
    }

    for (const bullet of enemyBullets) {
      drawSprite(sprites.enemyBullet, bullet.x, bullet.y, bullet.w, bullet.h, {
        rotate: bullet.age * (bullet.reflected ? -4 : 4),
        glow: bullet.reflected ? "#68d8ff" : "#ff6a23",
        blur: 11,
      });
    }

    for (const basket of balloonBaskets) drawBalloonBasket(basket);
    for (const gondola of airshipGondolas) drawAirshipGondola(gondola);

    for (const enemy of enemies) {
      ctx.save();
      if (enemy.flash > 0) {
        ctx.globalAlpha = 0.5 + Math.random() * 0.5;
        ctx.filter = "brightness(1.8)";
      }
      if (enemy.type === "boss") {
        drawSprite(sprites.boss, enemy.x, enemy.y, enemy.w, enemy.h, {
          rotate: Math.sin(enemy.age * 1.4) * 0.015,
        });
      } else if (enemy.type === "airship") {
        drawAirshipSprite(enemy);
      } else if (enemy.type === "balloon") {
        drawBalloonSprite(enemy);
      } else if (enemy.type === "drone") {
        const frame = Math.floor(enemy.age * 6 + enemy.phase) % sprites.drone.length;
        drawSprite(sprites.drone[frame], enemy.x, enemy.y, enemy.w, enemy.h, {
          rotate: Math.sin(enemy.age * 3) * 0.05,
        });
      } else if (enemy.type === "fighter") {
        const frame = Math.floor(enemy.phase) % sprites.fighter.length;
        drawSprite(sprites.fighter[frame], enemy.x, enemy.y, enemy.w, enemy.h);
      } else {
        const frame = Math.floor(enemy.age * 5 + enemy.phase) % sprites.enemyHeli.length;
        drawSprite(sprites.enemyHeli[frame], enemy.x, enemy.y, enemy.w, enemy.h);
      }
      ctx.restore();
    }

    const playerAlpha =
      player.invulnerable > 0 && Math.floor(player.invulnerable * 14) % 2 === 0 ? 0.32 : 1;
    if (player.shield > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(player.x, player.y, SHIELD_RADIUS + Math.sin(state.elapsed * 5) * 3, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(88, 218, 255, 0.72)";
      ctx.lineWidth = 4;
      ctx.shadowColor = "#5be4ff";
      ctx.shadowBlur = 14;
      ctx.stroke();
      ctx.restore();
    }
    const playerSprite = sprites.playerVariants?.[player.helicopter] || sprites.player[player.frame];
    drawSprite(playerSprite, player.x, player.y, player.w, player.h, {
      rotate: player.tilt,
      alpha: playerAlpha,
    });
  }

  function drawEffects() {
    for (const effect of effects) {
      const progress = effect.age / effect.duration;
      const index = Math.min(
        sprites.explosion.length - 1,
        Math.floor(progress * sprites.explosion.length),
      );
      const scale = 0.75 + Math.sin(progress * Math.PI) * 0.45;
      drawSprite(
        sprites.explosion[index],
        effect.x,
        effect.y,
        effect.size * scale,
        effect.size * scale,
        { alpha: clamp(1.35 - progress, 0, 1) },
      );
    }

    for (const particle of particles) {
      ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawBanner() {
    if (state.banner <= 0) return;
    const t = state.banner;
    const alpha = Math.min(1, (2.3 - t) * 4, t * 2);
    ctx.save();
    ctx.globalAlpha = alpha;
    const width = 510;
    const y = H * 0.47;
    const gradient = ctx.createLinearGradient(W / 2 - width / 2, 0, W / 2 + width / 2, 0);
    gradient.addColorStop(0, "rgba(3,10,13,0)");
    gradient.addColorStop(0.16, "rgba(3,10,13,0.76)");
    gradient.addColorStop(0.84, "rgba(3,10,13,0.76)");
    gradient.addColorStop(1, "rgba(3,10,13,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(W / 2 - width / 2, y - 43, width, 86);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#d8f23b";
    ctx.font = '400 37px "Black Ops One", Impact, sans-serif';
    ctx.fillText(state.bannerText, W / 2, y + 2);
    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    if (!sheet.complete || !sprites.player) {
      ctx.fillStyle = "#0a1820";
      ctx.fillRect(0, 0, W, H);
      return;
    }

    if (mode === "menu" || mode === "loading") {
      drawMenuBackdrop();
      return;
    }

    ctx.save();
    if (state.shake > 0) ctx.translate(rand(-state.shake, state.shake), rand(-state.shake, state.shake));
    drawBackground(state.background);
    drawEntities();
    drawEffects();
    drawHud();
    drawBanner();
    ctx.restore();

    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${state.flash * 1.7})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function loop(time) {
    const dt = Math.min(0.034, (time - lastTime) / 1000 || 0);
    lastTime = time;
    if (mode === "playing") updateGame(dt);
    render();
    requestAnimationFrame(loop);
  }

  function updatePointer(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * W;
    pointer.y = ((event.clientY - rect.top) / rect.height) * H;
  }

  window.addEventListener("keydown", (event) => {
    if (event.code === "Space") {
      event.preventDefault();
      event.stopImmediatePropagation();
      keys.add("Space");
      return;
    }
    if (
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)
    ) {
      event.preventDefault();
    }
    keys.add(event.code);
    if ((event.code === "KeyP" || event.code === "Escape") && !event.repeat) togglePause();
    if (event.code === "Enter" && mode === "menu") startGame();
  }, true);

  window.addEventListener("keyup", (event) => {
    if (event.code === "Space") event.preventDefault();
    keys.delete(event.code);
  }, true);
  window.addEventListener("blur", () => {
    keys.clear();
    pointer.active = false;
  });

  canvas.addEventListener("pointerdown", (event) => {
    if (mode !== "playing") return;
    pointer.active = true;
    updatePointer(event);
    canvas.setPointerCapture?.(event.pointerId);
    unlockAudio();
  });
  canvas.addEventListener("pointermove", (event) => {
    if (pointer.active) updatePointer(event);
  });
  canvas.addEventListener("pointerup", () => {
    pointer.active = false;
  });
  canvas.addEventListener("pointercancel", () => {
    pointer.active = false;
  });

  ui.play.addEventListener("click", startGame);
  ui.restart.addEventListener("click", startGame);
  ui.resume.addEventListener("click", togglePause);
  ui.pauseButton.addEventListener("click", togglePause);
  ui.soundButton.addEventListener("click", toggleSound);
  ui.continueButton.addEventListener("click", continueFromShop);
  ui.helicopterContinue.addEventListener("click", continueFromHelicopter);
  for (const button of ui.difficultyButtons) {
    button.addEventListener("click", () => selectDifficulty(button.dataset.difficulty));
  }
  for (const button of [...ui.helicopterButtons, ...ui.changeHelicopterButtons]) {
    button.addEventListener("click", () => selectHelicopter(button.dataset.helicopter));
  }
  for (const button of ui.shopItemButtons) {
    button.addEventListener("click", () => buyShopItem(button.dataset.shopItem));
  }
  selectDifficulty(selectedDifficulty);
  selectHelicopter(selectedHelicopter);

  function finishLoading() {
    if (!airshipReady || !gondolaReady || helicopterVariantsReady < 2) return;
    sprites.airshipGondola = gondolaSheet;
    sprites.playerVariants = {
      v1: helicopterSheets.v1,
      v2: helicopterSheets.v2,
    };
    resetGame();
    setMode("menu");
  }

  sheet.addEventListener("load", () => {
    prepareSprites();
    airshipSheet.src = "assets/boss-globo-sprites.webp";
    helicopterSheets.v1.src = "assets/helicopter-player-v1.webp";
    helicopterSheets.v2.src = "assets/helicopter-player-v2.webp";
  });
  airshipSheet.addEventListener("load", () => {
    prepareAirshipSprites();
    airshipReady = true;
    gondolaSheet.src = "assets/airship-gondola.webp";
    finishLoading();
  });
  gondolaSheet.addEventListener("load", () => {
    gondolaReady = true;
    finishLoading();
  });
  for (const helicopterSheet of Object.values(helicopterSheets)) {
    helicopterSheet.addEventListener("load", () => {
      helicopterVariantsReady += 1;
      finishLoading();
    });
  }
  const showSpriteLoadError = () => {
    ui.loading.innerHTML =
      "<p>No se pudo cargar la lámina de sprites. Comprueba la carpeta assets.</p>";
  };
  sheet.addEventListener("error", showSpriteLoadError);
  airshipSheet.addEventListener("error", showSpriteLoadError);
  gondolaSheet.addEventListener("error", showSpriteLoadError);
  for (const helicopterSheet of Object.values(helicopterSheets)) {
    helicopterSheet.addEventListener("error", showSpriteLoadError);
  }
  sheet.src = "assets/juego-nacho.webp";

  requestAnimationFrame(loop);
})();
