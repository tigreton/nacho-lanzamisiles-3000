// Entrada: teclado, puntero/táctil y autopausa. Los handlers del juego se
// inyectan en installInput para evitar ciclos de importación.
import { W, H } from "./config.js";
import { G } from "./state.js";
import { unlockAudio } from "./audio.js";

function updatePointer(event) {
  const rect = G.canvas.getBoundingClientRect();
  G.pointer.x = ((event.clientX - rect.left) / rect.width) * W;
  G.pointer.y = ((event.clientY - rect.top) / rect.height) * H;
}

export function installInput({ togglePause, startGame }) {
  window.addEventListener("keydown", (event) => {
    if (event.code === "Space") {
      if (G.mode === "playing") {
        // Solo en partida se aísla Espacio: fuera de ella los botones del
        // menú, la tienda y el fin de partida deben responder a la tecla.
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      G.keys.add("Space");
      return;
    }
    if (
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)
    ) {
      event.preventDefault();
    }
    G.keys.add(event.code);
    if ((event.code === "KeyP" || event.code === "Escape") && !event.repeat) togglePause();
    if (event.code === "Enter" && G.mode === "menu") startGame();
  }, true);

  window.addEventListener("keyup", (event) => {
    if (event.code === "Space") event.preventDefault();
    G.keys.delete(event.code);
  }, true);

  // Autopausa: si la pestaña o la ventana pierden el foco en mitad de una
  // oleada, la partida se pausa en lugar de seguir corriendo sin defensa.
  const autopause = () => {
    G.keys.clear();
    G.pointer.active = false;
    if (G.mode === "playing") togglePause();
  };
  window.addEventListener("blur", autopause);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) autopause();
  });

  G.canvas.addEventListener("pointerdown", (event) => {
    if (G.mode !== "playing") return;
    G.pointer.active = true;
    updatePointer(event);
    G.canvas.setPointerCapture?.(event.pointerId);
    unlockAudio();
  });
  G.canvas.addEventListener("pointermove", (event) => {
    if (G.pointer.active) updatePointer(event);
  });
  G.canvas.addEventListener("pointerup", () => {
    G.pointer.active = false;
  });
  G.canvas.addEventListener("pointercancel", () => {
    G.pointer.active = false;
  });
}
