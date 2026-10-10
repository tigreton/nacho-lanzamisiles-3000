// Fin de partida: guardado del record y pantalla de informe.
import { G, setMode } from "../state.js";
import { getHighScore, saveHighScore } from "../records.js";


export function endGame() {
  if (G.mode !== "playing") return;
  const isRecord = G.state.score > G.state.highScore;
  if (isRecord) saveHighScore(G.state.score, G.selectedDifficulty);
  G.ui.resultTitle.textContent = isRecord ? "¡NUEVO RÉCORD!" : "MISIÓN TERMINADA";
  const record = getHighScore(G.selectedDifficulty);
  G.ui.resultCopy.textContent =
    `Dificultad: ${G.state.difficulty.label} · Puntuación: ${G.state.score.toLocaleString("es-ES")} · Récord: ${record.toLocaleString("es-ES")} · Monedas: ${G.state.coins}`;
  setMode("gameover");
}

