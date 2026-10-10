// Ritmo de oleadas y orquestacion del update por fotograma.
import { CROPS } from "../config.js";
import { G } from "../state.js";
import { rand } from "../utils.js";
import { tone } from "../audio.js";
import { updatePlayer } from "../entities/player.js";
import { spawnEnemy, spawnBoss, updateEnemies, updateBalloonBaskets, updateAirshipGondolas } from "../entities/enemies.js";
import { updateProjectiles } from "../entities/bullets.js";
import { updatePickups } from "../entities/pickups.js";
import { updateEffects } from "../entities/particles.js";
import { spawnAirbase, updateAirbase } from "../entities/airbase.js";
import { openShop } from "./shop.js";


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
  G.state.background = Math.floor((G.state.wave - 1) / 2) % CROPS.backgrounds.length;
  const bossWave = G.state.wave % 4 === 0;
  const airshipWave = G.state.wave % 8 === 0;
  announceWave(bossWave ? `${airshipWave ? "DIRIGIBLE" : "JEFE"} · OLEADA ${G.state.wave}` : `OLEADA ${G.state.wave}`);
}


export function updateGame(dt) {
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

