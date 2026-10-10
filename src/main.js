// Estado, arranque y bucle principal. La configuración vive en config.js.
import { W, H, DIFFICULTIES, HELICOPTERS } from "./config.js";
import { G, setMode, selectDifficulty, selectHelicopter } from "./state.js";
import { updateGame } from "./systems/waves.js";
import { buyShopItem, continueFromShop } from "./systems/shop.js";
import { continueFromHelicopter } from "./entities/airbase.js";
import { render } from "./render.js";
import { prepareSprites, prepareAirshipSprites } from "./sprites.js";
import { rand } from "./utils.js";
import { unlockAudio, tone, toggleSound } from "./audio.js";
import { ensureMusic, initMusicUI } from "./music.js";
import { installInput, pollGamepad } from "./input.js";
import { getHighScore } from "./records.js";


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
  ensureMusic();
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






























// Halo pre-horneado: hornear el shadowBlur de cada sprite una sola vez en un
// G.canvas aparte cuesta mucho menos que aplicarlo en cada fotograma del loop.
















function loop(time) {
  const dt = Math.min(0.034, (time - G.lastTime) / 1000 || 0);
  G.lastTime = time;
  pollGamepad({ togglePause });
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
initMusicUI();
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
