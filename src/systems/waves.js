// Ritmo de oleadas y orquestacion del update por fotograma.
import { CROPS, BOSSES } from "../config.js";
import { G } from "../state.js";
import { rand, bossKindForWave } from "../utils.js";
import { tone } from "../audio.js";
import { updatePlayer } from "../entities/player.js";
import { spawnEnemy, spawnBoss, updateEnemies, updateBalloonBaskets, updateAirshipGondolas } from "../entities/enemies.js";
import { updateProjectiles } from "../entities/bullets.js";
import { updatePickups } from "../entities/pickups.js";
import { updateEffects } from "../entities/particles.js";
import { spawnAirbase, updateAirbase } from "../entities/airbase.js";
import { openShop } from "./shop.js";
import { unlock } from "./achievements.js";


export function announceWave(text) {
  G.state.banner = 2.3;
  G.state.bannerText = text;
  tone(220, 0.12, "sawtooth", 0.035, 90);
  setTimeout(() => tone(440, 0.16, "square", 0.03), 110);
}


export function advanceWave() {
  G.state.wave += 1;
  G.state.waveTime = 0;
  G.state.spawnTimer = 1;
  G.state.bossSpawned = false;
  G.state.bossActive = false;
  G.state.bossClearTimer = 0;
  G.state.airbaseSpawned = false;
  G.airbase = null;
  // El combo es impulso de una oleada: al cambiar de oleada se empieza de cero.
  G.state.combo.kills = 0;
  G.state.combo.timer = 0;
  G.state.background = Math.floor((G.state.wave - 1) / 2) % CROPS.backgrounds.length;
  if (G.state.wave >= 10) unlock("veterano");
  if (G.state.gameMode === "supervivencia" && G.state.wave >= 12) unlock("resistente");
  announceWave(textoOleada());
}


function textoOleada() {
  const wave = G.state.wave;
  if (G.state.gameMode === "jefes") {
    return `${BOSSES[bossKindForWave(wave, "jefes")].label} · JEFE ${wave}`;
  }
  if (G.state.gameMode === "supervivencia") {
    return `SUPERVIVENCIA · OLEADA ${wave}`;
  }
  if (wave % 4 === 0) {
    return `${BOSSES[bossKindForWave(wave)].label} · OLEADA ${wave}`;
  }
  return `OLEADA ${wave}`;
}


function completeWave() {
  if (!G.state.waveDamageTaken) unlock("intocable");
  G.state.waveDamageTaken = false;
  openShop();
}


export function updateGame(dt) {
  G.state.elapsed += dt;
  G.state.waveTime += dt;
  G.state.banner = Math.max(0, G.state.banner - dt);
  G.state.shake = Math.max(0, G.state.shake - dt * 30);
  G.state.flash = Math.max(0, G.state.flash - dt);

  if (G.state.combo.kills > 0) {
    G.state.combo.timer -= dt;
    if (G.state.combo.timer <= 0) {
      G.state.combo.kills = 0;
      G.state.combo.timer = 0;
    }
  }
  if (G.state.toast) {
    G.state.toast.time -= dt;
    if (G.state.toast.time <= 0) G.state.toast = null;
  }

  updatePlayer(dt);
  updateAirbase(dt);
  updateProjectiles(dt);
  updateEnemies(dt);
  updateBalloonBaskets(dt);
  updateAirshipGondolas(dt);
  updatePickups(dt);
  updateEffects(dt);

  // En solo jefes toda oleada es un jefe; en supervivencia no hay jefes
  // fijos y la dificultad escala sin techo; la campaña mantiene el ciclo
  // de jefe cada 4 oleadas.
  const esOleadaDeJefe =
    G.state.gameMode === "jefes" ||
    (G.state.gameMode === "campana" && G.state.wave % 4 === 0);
  if (esOleadaDeJefe) {
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
        completeWave();
      }
    }
  } else {
    if (
      G.state.wave >= 2 &&
      G.state.wave % 2 === 0 &&
      !G.state.airbaseSpawned &&
      G.state.waveTime > 6
    ) {
      spawnAirbase();
    }
    // La supervivencia no tiene techo: los enemigos siguen entrando más
    // rápido pasada la oleada 15, donde la campaña ya no aprieta más.
    const sueloIntervalo = G.state.gameMode === "supervivencia" ? 0.3 : 0.48;
    G.state.spawnTimer -= dt;
    if (G.state.spawnTimer <= 0) {
      spawnEnemy();
      G.state.spawnTimer =
        Math.max(sueloIntervalo, 1.28 - G.state.wave * 0.055) *
        G.state.difficulty.spawnIntervalMultiplier *
        rand(0.78, 1.24);
    }
    if (G.state.waveTime > G.state.difficulty.waveDuration && !G.airbase) completeWave();
  }
}

