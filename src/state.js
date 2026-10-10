// Estado compartido del juego: las mutables viven en la bolsa G para que
// los módulos puedan leerlas y reasignarlas sin ciclos de importación.
import { W, H, DIFFICULTIES, HELICOPTERS, ACHIEVEMENTS, COMBO_KILLS_PER_STEP, MAX_COMBO_MULTIPLIER } from "./config.js";
import { getHighScores, getUnlockedAchievements } from "./records.js";

const canvas = document.querySelector("#game-canvas");

export const G = {
  canvas,
  ctx: canvas.getContext("2d"),
  ui: {
  loading: document.querySelector("#loading-screen"),
  menu: document.querySelector("#menu-screen"),
  pause: document.querySelector("#pause-screen"),
  shop: document.querySelector("#shop-screen"),
  helicopter: document.querySelector("#helicopter-screen"),
  gameover: document.querySelector("#gameover-screen"),
  howto: document.querySelector("#howto-screen"),
  howtoButton: document.querySelector("#howto-button"),
  howtoBack: document.querySelector("#howto-back"),
  play: document.querySelector("#play-button"),
  restart: document.querySelector("#restart-button"),
  resume: document.querySelector("#resume-button"),
  pauseButton: document.querySelector("#pause-button"),
  soundButton: document.querySelector("#sound-button"),
  musicButton: document.querySelector("#music-button"),
  resultTitle: document.querySelector("#result-title"),
  resultCopy: document.querySelector("#result-copy"),
  resultScores: document.querySelector("#result-scores"),
  resultAchievements: document.querySelector("#result-achievements"),
  menuRecord: document.querySelector("#menu-record"),
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
},
  sheet: new Image(),
  airshipSheet: new Image(),
  gondolaSheet: new Image(),
  helicopterSheets: { v1: new Image(), v2: new Image() },
  sprites: {},
  keys: new Set(),
  pointer: { active: false, x: W * 0.22, y: H * 0.5 },
  mode: "loading",
  lastTime: performance.now(),
  selectedDifficulty: "normal",
  selectedHelicopter: "v1",
  player: undefined,
  state: undefined,
  enemies: [],
  playerBullets: [],
  enemyBullets: [],
  balloonBaskets: [],
  airshipGondolas: [],
  airbase: null,
  pickups: [],
  effects: [],
  particles: [],
  floaters: [],
  stars: [],
};

function showOnly(screen) {
  [G.ui.loading, G.ui.menu, G.ui.pause, G.ui.shop, G.ui.helicopter, G.ui.gameover, G.ui.howto].forEach((item) => {
    item.classList.toggle("screen--visible", item === screen);
  });
}

export function setMode(nextMode) {
  G.mode = nextMode;
  if (nextMode === "menu") {
    showOnly(G.ui.menu);
    updateMenuRecord();
  }
  else if (nextMode === "paused") showOnly(G.ui.pause);
  else if (nextMode === "shop") showOnly(G.ui.shop);
  else if (nextMode === "helicopter") showOnly(G.ui.helicopter);
  else if (nextMode === "howto") showOnly(G.ui.howto);
  else if (nextMode === "gameover") showOnly(G.ui.gameover);
  else showOnly(null);
  G.ui.pauseButton.textContent = nextMode === "paused" ? "SEGUIR" : "PAUSA";
}

function updateMenuRecord() {
  const etiqueta = DIFFICULTIES[G.selectedDifficulty].label;
  const top = getHighScores(G.selectedDifficulty);
  const filas = top.length
    ? `<ol class="menu-top">${top
        .map((puntos, i) => `<li><span>${i + 1}</span><strong>${puntos.toLocaleString("es-ES")}</strong></li>`)
        .join("")}</ol>`
    : `<p class="menu-top-empty">AÚN SIN RÉCORD EN ${etiqueta}</p>`;
  const totalLogros = Object.keys(ACHIEVEMENTS).length;
  const logros = getUnlockedAchievements().size;
  G.ui.menuRecord.innerHTML =
    `<p class="menu-record-title">TOP 5 · ${etiqueta}</p>${filas}<p class="menu-logros">★ LOGROS ${logros}/${totalLogros}</p>`;
}

export function selectDifficulty(id) {
  if (!DIFFICULTIES[id]) return;
  G.selectedDifficulty = id;
  for (const button of G.ui.difficultyButtons) {
    const selected = button.dataset.difficulty === id;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  }
  updateMenuRecord();
}

export function selectHelicopter(id) {
  if (!HELICOPTERS[id]) return;
  G.selectedHelicopter = id;
  for (const button of [...G.ui.helicopterButtons, ...G.ui.changeHelicopterButtons]) {
    const selected = button.dataset.helicopter === id;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  }
}


// Aviso corto sobre el HUD (rachas, logros): comparte hueco para no tapar
// el banner central de oleadas y jefes.
export function showToast(text, color, duration = 1.4) {
  if (!G.state) return;
  G.state.toast = { text, color, duration, time: duration };
}


export function comboMultiplier() {
  const kills = G.state?.combo?.kills || 0;
  return Math.min(MAX_COMBO_MULTIPLIER, 1 + Math.floor(kills / COMBO_KILLS_PER_STEP));
}

