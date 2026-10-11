// Estado, arranque y bucle principal. La configuración vive en config.js.
import { W, H, DIFFICULTIES, HELICOPTERS } from "./config.js";
import { G, setMode, selectDifficulty, selectMode, selectHelicopter } from "./state.js";
import { updateGame, advanceWave } from "./systems/waves.js";
import { buyShopItem, continueFromShop } from "./systems/shop.js";
import { continueFromHelicopter } from "./entities/airbase.js";
import { render } from "./render.js";
import { prepareSprites, prepareAirshipSprites } from "./sprites.js";
import { rand } from "./utils.js";
import { unlockAudio, tone, toggleSound } from "./audio.js";
import { ensureMusic, initMusicUI } from "./music.js";
import { installInput, pollGamepad } from "./input.js";
import { installCheatCodes } from "./systems/cheats.js";
import { getHighScore } from "./records.js";


// Colector de errores para QA: acumula fallos sin tocar la jugabilidad.
// Las pruebas consultan window.__erroresQA al terminar la partida.
window.__erroresQA = [];
window.addEventListener("error", (event) => {
  window.__erroresQA.push(
    `${event.message} @ ${event.filename}:${event.lineno}:${event.colno}`,
  );
});
window.addEventListener("unhandledrejection", (event) => {
  window.__erroresQA.push(`unhandledrejection: ${String(event.reason)}`);
});


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
let iaSheetsReady = 0;
// Nombres de las láminas IA (assets/ia-<nombre>.webp, con guiones para las
// variantes de torreta).
const IA_LAMINAS = [
  "kamikaze",
  "gunship",
  "ally",
  "homing",
  "charged",
  "fortress",
  "turretAim",
  "turretSpread",
  "basket",
  "airbase",
  "shield",
];
for (const nombre of IA_LAMINAS) {
  G.iaSheets[nombre].src = `assets/ia-${nombre.replace(/([A-Z])/g, "-$1").toLowerCase()}.webp`;
}
















function resetGame() {
  const difficulty = DIFFICULTIES[G.selectedDifficulty];
  const helicopter = HELICOPTERS[G.selectedHelicopter];
  const gameMode = G.selectedMode;
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
    homingAmmo: 0,
    allyArmed: false,
    charge: 0,
    chargeFull: false,
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
    bannerText:
      gameMode === "supervivencia"
        ? "SUPERVIVENCIA · OLEADA 1"
        : gameMode === "jefes"
          ? "SOLO JEFES · JEFE 1"
          : `${difficulty.label} · OLEADA 1`,
    shake: 0,
    flash: 0,
    background: 0,
    highScore: getHighScore(G.selectedDifficulty, gameMode),
    combo: { kills: 0, timer: 0, best: 0 },
    nearMisses: 0,
    waveDamageTaken: false,
    toast: null,
    newAchievements: [],
    squads: {},
    squadSeq: 0,
    squadTimer: 8,
    gameMode,
    difficulty,
  };

  G.ally = null;
  G.enemies = [];
  G.playerBullets = [];
  G.enemyBullets = [];
  G.balloonBaskets = [];
  G.airshipGondolas = [];
  G.airbase = null;
  G.pickups = [];
  G.effects = [];
  G.particles = [];
  G.floaters = [];
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
installCheatCodes();

// Gancho de QA: permite al guion de pruebas saltar a una oleada o modo
// concretos sin jugar hasta ellos y avanzar fotogramas a demanda, porque
// en navegadores embebidos sin foco el requestAnimationFrame se congela
// (docs/guion-pruebas.md). No lo usa el juego en producción.
window.__qa = { G, setMode, startGame, advanceWave, updateGame };

G.ui.play.addEventListener("click", startGame);
G.ui.restart.addEventListener("click", startGame);
G.ui.resultMenuButton.addEventListener("click", () => setMode("menu"));
G.ui.resume.addEventListener("click", togglePause);
G.ui.pauseButton.addEventListener("click", togglePause);
G.ui.soundButton.addEventListener("click", toggleSound);
G.ui.howtoButton.addEventListener("click", () => setMode("howto"));
G.ui.howtoBack.addEventListener("click", () => setMode("menu"));
initMusicUI();
G.ui.continueButton.addEventListener("click", continueFromShop);
G.ui.helicopterContinue.addEventListener("click", continueFromHelicopter);
for (const button of G.ui.difficultyButtons) {
  button.addEventListener("click", () => selectDifficulty(button.dataset.difficulty));
}
for (const button of G.ui.modeButtons) {
  button.addEventListener("click", () => selectMode(button.dataset.mode));
}
for (const button of [...G.ui.helicopterButtons, ...G.ui.changeHelicopterButtons]) {
  button.addEventListener("click", () => selectHelicopter(button.dataset.helicopter));
}
for (const button of G.ui.shopItemButtons) {
  button.addEventListener("click", () => buyShopItem(button.dataset.shopItem));
}
selectDifficulty(G.selectedDifficulty);
selectMode(G.selectedMode);
selectHelicopter(G.selectedHelicopter);

function finishLoading() {
  if (!fontsReady || !airshipReady || !gondolaReady || helicopterVariantsReady < 2 || iaSheetsReady < IA_LAMINAS.length) return;
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
// Láminas IA: se cargan como sprites individuales (ia<Nombre> en G.sprites).
for (const nombre of IA_LAMINAS) {
  G.iaSheets[nombre].addEventListener("load", () => {
    G.sprites[`ia${nombre[0].toUpperCase()}${nombre.slice(1)}`] = G.iaSheets[nombre];
    iaSheetsReady += 1;
    finishLoading();
  });
  G.iaSheets[nombre].addEventListener("error", showSpriteLoadError);
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
