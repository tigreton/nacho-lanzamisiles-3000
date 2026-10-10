// Logros: se desbloquean una vez, se anuncian con un toast sobre el HUD y
// se guardan en localStorage junto a los récords.
import { ACHIEVEMENTS } from "../config.js";
import { G, showToast } from "../state.js";
import { unlockAchievement, bumpCounter } from "../records.js";
import { tone } from "../audio.js";


export function unlock(id) {
  if (!ACHIEVEMENTS[id] || !unlockAchievement(id)) return;
  if (G.state) G.state.newAchievements.push(ACHIEVEMENTS[id].label);
  showToast(`★ LOGRO · ${ACHIEVEMENTS[id].label}`, "#ffd63c", 2);
  tone(620, 0.1, "square", 0.03);
  setTimeout(() => tone(930, 0.16, "square", 0.03), 110);
}


// Bajas acumuladas entre partidas + logros asociados a cada enemigo.
export function notifyKill(enemy) {
  const bajas = bumpCounter("bajas");
  if (bajas >= 100) unlock("cien-bajas");
  if (enemy.type === "boss") unlock("primer-jefe");
  if (enemy.type === "airship") unlock("cazadirigibles");
}


export function notifyNearMiss() {
  const esquivas = bumpCounter("esquivas");
  if (esquivas >= 25) unlock("esquivador");
}
