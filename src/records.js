// Récords por dificultad en localStorage. Módulo puro: sin estado del juego.

export function getHighScore(difficultyId) {
  try {
    const record =
      Number(localStorage.getItem(`operacion-nacho-record-${difficultyId}`)) || 0;
    // El récord global anterior (sin dificultad) se conserva como suelo:
    // nunca hizo falta distinguir y los récords no deben bajar.
    const legado = Number(localStorage.getItem("operacion-nacho-record")) || 0;
    return Math.max(record, legado);
  } catch {
    return 0;
  }
}

export function saveHighScore(score, difficultyId) {
  try {
    const clave = `operacion-nacho-record-${difficultyId}`;
    if (score > Number(localStorage.getItem(clave)) || 0) {
      localStorage.setItem(clave, String(score));
    }
  } catch {
    // The game still works when storage is unavailable.
  }
}

