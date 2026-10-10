// Fin de partida: guardado del record, top 5 y pantalla de informe.
import { ACHIEVEMENTS } from "../config.js";
import { G, setMode } from "../state.js";
import { getHighScores, getHighScore, saveHighScore, getUnlockedAchievements } from "../records.js";


export function endGame() {
  if (G.mode !== "playing") return;
  const isRecord = G.state.score > G.state.highScore;
  const rank = saveHighScore(G.state.score, G.selectedDifficulty);
  G.ui.resultTitle.textContent = isRecord
    ? "¡NUEVO RÉCORD!"
    : rank > 0
      ? "¡ENTRA EN EL TOP 5!"
      : "MISIÓN TERMINADA";
  const record = getHighScore(G.selectedDifficulty);
  G.ui.resultCopy.textContent =
    `Dificultad: ${G.state.difficulty.label} · Puntuación: ${G.state.score.toLocaleString("es-ES")} · ` +
    `Récord: ${record.toLocaleString("es-ES")} · Monedas: ${G.state.coins} · Mejor racha: ${G.state.combo.best}`;

  const top = getHighScores(G.selectedDifficulty);
  G.ui.resultScores.innerHTML = top
    .map((puntos, i) => {
      const actual = i === rank - 1 ? ' class="is-new"' : "";
      return `<li${actual}><span>${i + 1}</span><strong>${puntos.toLocaleString("es-ES")}</strong></li>`;
    })
    .join("");

  const total = Object.keys(ACHIEVEMENTS).length;
  const logros = getUnlockedAchievements().size;
  G.ui.resultAchievements.textContent = G.state.newAchievements.length
    ? `★ NUEVOS LOGROS: ${G.state.newAchievements.join(" · ")} (${logros}/${total})`
    : `LOGROS: ${logros}/${total}`;
  setMode("gameover");
}
