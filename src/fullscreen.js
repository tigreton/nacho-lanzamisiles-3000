// Pantalla completa: el botón de la cabecera esconde las barras del
// navegador y, en móviles que lo permiten, fuerza el apaisado para que el
// escenario llene el viewport. En navegadores sin la API (iPhone) el botón
// ni se muestra. Prefijos webkit para el Safari de iPad.
import { G } from "./state.js";

const raiz = document.documentElement;
const soportaPantallaCompleta =
  typeof raiz.requestFullscreen === "function" ||
  typeof raiz.webkitRequestFullscreen === "function";

function estaCompleta() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement);
}

async function alternarPantallaCompleta() {
  try {
    if (estaCompleta()) {
      await (document.exitFullscreen?.() ?? document.webkitExitFullscreen?.());
      screen.orientation?.unlock?.();
    } else {
      await (raiz.requestFullscreen?.({ navigationUI: "hide" }) ?? raiz.webkitRequestFullscreen?.());
      // Con el móvil en vertical el juego sería una franja 16:9: se pide
      // apaisado donde el navegador lo permita (Chrome sí; Firefox e iOS no).
      await screen.orientation?.lock?.("landscape")?.catch(() => {});
    }
  } catch {
    // El navegador puede rechazar la petición o el usuario cancelarla: el
    // juego sigue igual en ventana.
  }
}

function reflejarEstado() {
  const activa = estaCompleta();
  document.body.classList.toggle("pantalla-completa", activa);
  G.ui.fullscreenButton.setAttribute("aria-pressed", String(activa));
  G.ui.fullscreenButton.setAttribute(
    "aria-label",
    activa ? "Salir de pantalla completa" : "Pantalla completa",
  );
}

export function initFullscreenUI() {
  if (!soportaPantallaCompleta) {
    G.ui.fullscreenButton.hidden = true;
    return;
  }
  G.ui.fullscreenButton.addEventListener("click", alternarPantallaCompleta);
  document.addEventListener("fullscreenchange", reflejarEstado);
  document.addEventListener("webkitfullscreenchange", reflejarEstado);
  reflejarEstado();
}
