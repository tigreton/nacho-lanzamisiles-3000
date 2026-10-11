// Entrada: teclado, puntero/táctil y autopausa. Los handlers del juego se
// inyectan en installInput para evitar ciclos de importación.
import { W, H, HELICOPTERS } from "./config.js";
import { G, setMode } from "./state.js";
import { unlockAudio, tone } from "./audio.js";

function updatePointer(event) {
  const rect = G.canvas.getBoundingClientRect();
  G.pointer.x = ((event.clientX - rect.left) / rect.width) * W;
  G.pointer.y = ((event.clientY - rect.top) / rect.height) * H;
}

// Gamepad: en partida, stick izquierdo o cruceta mueven, A dispara y Start
// pausa. En los menús, cruceta y stick desplazan un cursor por los botones
// de la pantalla visible: A pulsa el señalado, Start dispara la acción
// principal de la pantalla y B vuelve atrás donde procede.
// Se consulta una vez por fotograma desde el bucle principal.

// Botón principal (lo que dispara Start) de cada pantalla de menú.
const PRINCIPAL_POR_MODO = {
  menu: () => G.ui.play,
  paused: () => G.ui.resume,
  shop: () => G.ui.continueButton,
  helicopter: () => G.ui.helicopterContinue,
  howto: () => G.ui.howtoBack,
  gameover: () => G.ui.restart,
};

// Pantallas cuya gracia es la acción principal: ahí arranca el cursor para
// que A sea "jugar/seguir" sin recorrer antes los selectores. En armería y
// base aérea se empieza por la primera opción, que es lo que se elige.
const MODOS_QUE_EMPIEZAN_EN_PRINCIPAL = new Set([
  "menu",
  "paused",
  "howto",
  "gameover",
]);

const CLASE_CURSOR = "is-pad-focus";
const ZONA_MENU = 0.55; // empuje del stick exigido para navegar menús
const RETARDO_REPETICION = 330; // ms antes de auto-repetir el eje
const PASO_REPETICION = 140; // cadencia de la auto-repetición

let botonAnterior = { a: false, b: false, start: false };
let modoCursor = null; // modo vigente al colocar el cursor por última vez
let elementoCursor = null;
let repeticion = { vertical: 0, horizontal: 0 };

function botonesPantalla() {
  const pantalla = document.querySelector(".screen--visible");
  if (!pantalla) return [];
  return [...pantalla.querySelectorAll("button:not([disabled])")];
}

function pintarCursor(elemento) {
  elementoCursor?.classList.remove(CLASE_CURSOR);
  elementoCursor = elemento ?? null;
  elementoCursor?.classList.add(CLASE_CURSOR);
}

function reiniciarCursor() {
  repeticion = { vertical: 0, horizontal: 0 };
  const botones = botonesPantalla();
  const principal = MODOS_QUE_EMPIEZAN_EN_PRINCIPAL.has(G.mode)
    ? PRINCIPAL_POR_MODO[G.mode]?.()
    : null;
  pintarCursor(
    principal && botones.includes(principal) ? principal : botones[0],
  );
}

function moverCursor(delta) {
  const botones = botonesPantalla();
  if (botones.length === 0) return;
  let i = botones.indexOf(elementoCursor);
  if (i === -1) i = 0;
  pintarCursor(botones[(i + delta + botones.length) % botones.length]);
  tone(560, 0.045, "square", 0.014);
}

function pulsarCursor() {
  if (!elementoCursor || elementoCursor.disabled) return;
  unlockAudio();
  elementoCursor.click();
  // Comprar vida con la vida ya llena deshabilita el propio botón: el
  // cursor pasa entonces al primer botón que siga disponible.
  if (elementoCursor.disabled) pintarCursor(botonesPantalla()[0]);
}

function retrocederConPad() {
  if (G.mode === "howto") setMode("menu");
  else if (G.mode === "paused") G.ui.resume.click();
}

// Pasos que da un eje: uno al pisarlo y luego auto-repetición si se
// mantiene pisado; 0 en reposo (dejando el temporizador a cero).
function pasosEje(activo, eje, ahora) {
  if (!activo) {
    repeticion[eje] = 0;
    return 0;
  }
  if (!repeticion[eje] || ahora >= repeticion[eje]) {
    repeticion[eje] = ahora + (repeticion[eje] ? PASO_REPETICION : RETARDO_REPETICION);
    return 1;
  }
  return 0;
}

export function pollGamepad({ togglePause, activateAbility }) {
  const pads = navigator.getGamepads?.() ?? [];
  const pad = [...pads].find(Boolean);
  if (!pad) {
    botonAnterior = { a: false, b: false, start: false };
    modoCursor = null;
    pintarCursor(null);
    return;
  }

  if (G.mode !== modoCursor) {
    modoCursor = G.mode;
    reiniciarCursor();
  }

  const zona = 0.35;
  const [x = 0, y = 0] = pad.axes;
  const pulsa = (code, activo) => {
    if (activo) G.keys.add(code);
    else G.keys.delete(code);
  };
  const cruz = (indice) => !!pad.buttons[indice]?.pressed;
  pulsa("KeyA", x < -zona || cruz(14));
  pulsa("KeyD", x > zona || cruz(15));
  pulsa("KeyW", y < -zona || cruz(12));
  pulsa("KeyS", y > zona || cruz(13));
  pulsa("Space", cruz(0));

  if (G.mode !== "playing" && G.mode !== "loading") {
    const ahora = performance.now();
    const arriba = cruz(12) || y < -ZONA_MENU;
    const abajo = cruz(13) || y > ZONA_MENU;
    const izquierda = cruz(14) || x < -ZONA_MENU;
    const derecha = cruz(15) || x > ZONA_MENU;
    if (pasosEje(arriba || abajo, "vertical", ahora)) moverCursor(abajo ? 1 : -1);
    if (pasosEje(izquierda || derecha, "horizontal", ahora)) moverCursor(derecha ? 1 : -1);

    if (cruz(0) && !botonAnterior.a) pulsarCursor();
    if (cruz(1) && !botonAnterior.b) retrocederConPad();
  } else if (G.mode === "playing" && cruz(1) && !botonAnterior.b) {
    // En partida el botón B suelta la habilidad secundaria del helicóptero.
    activateAbility?.();
  }

  if (cruz(9) && !botonAnterior.start) {
    if (G.mode === "playing") togglePause();
    else PRINCIPAL_POR_MODO[G.mode]?.()?.click();
  }
  botonAnterior = { a: cruz(0), b: cruz(1), start: cruz(9) };
}

export function installInput({ togglePause, startGame, activateAbility }) {
  // Botonera táctil: mismo criterio que el CSS móvil (puntero grueso o
  // ventana estrecha). Con ella en pantalla, arrastrar sobre el lienzo
  // solo mueve —el disparo pasa al botón— para no ametrallar sin querer
  // al esquivar.
  const consultaTactil = matchMedia("(pointer: coarse), (max-width: 760px)");
  const aplicarTactil = () => {
    G.controlesTactiles = consultaTactil.matches;
    document.body.classList.toggle("controles-tactiles", G.controlesTactiles);
    G.ui.mobileHint.textContent = G.controlesTactiles
      ? "ARRASTRA PARA MOVER"
      : "ARRASTRA PARA MOVER Y DISPARAR";
  };
  consultaTactil.addEventListener?.("change", aplicarTactil);
  // Redimensionar la ventana puede cruzar el umbral de 760 px sin que el
  // MediaQueryList llegue a avisar en algunos navegadores embebidos.
  window.addEventListener("resize", aplicarTactil);
  aplicarTactil();

  // El menú contextual del pulso largo no tiene cabida en la botonera.
  G.ui.touchControls.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });

  // Disparo: mantener pulsado dispara y carga el misil grande, que se
  // lanza al soltar —exactamente como Espacio. La captura del puntero
  // garantiza el pointerup aunque el dedo se deslice fuera del botón.
  G.ui.fireButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    if (G.mode !== "playing") return;
    G.touchFire = true;
    G.ui.fireButton.setPointerCapture?.(event.pointerId);
    unlockAudio();
  });
  const soltarDisparo = () => {
    G.touchFire = false;
  };
  G.ui.fireButton.addEventListener("pointerup", soltarDisparo);
  G.ui.fireButton.addEventListener("pointercancel", soltarDisparo);

  // Habilidad secundaria: una pulsación, como Mayús/K o el B del mando.
  G.ui.abilityButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    if (G.mode !== "playing") return;
    unlockAudio();
    activateAbility?.();
  });

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
    if (event.code === "Escape" && G.mode === "howto") setMode("menu");
    // Habilidad secundaria: Mayús o K, una pulsación por pulsación de tecla
    // (el autocorrepeat del sistema no debe ametrallarla).
    if (
      !event.repeat &&
      G.mode === "playing" &&
      ["ShiftLeft", "ShiftRight", "KeyK"].includes(event.code)
    ) {
      activateAbility?.();
    }
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
    G.touchFire = false;
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

// Refresco por fotograma de la botonera: el velo de recarga de la habilidad
// se retira en sentido horario (--listo de 0 a 1), el contador muestra los
// segundos que faltan y el botón de disparo avisa cuando el misil cargado
// está listo para soltarlo.
export function updateTouchControls() {
  if (!G.controlesTactiles || G.mode !== "playing" || !G.player) return;
  const ability = HELICOPTERS[G.player.helicopter]?.ability;
  G.ui.abilityButton.classList.toggle("kind-reducir", ability?.kind === "reducir");
  const total = ability?.cooldown ?? 1;
  const restante = G.player.abilityCooldown;
  G.ui.abilityButton.style.setProperty("--listo", String(Math.min(1, Math.max(0, 1 - restante / total))));
  G.ui.abilityButton.classList.toggle("is-ready", restante <= 0);
  G.ui.abilityCount.textContent = restante > 0 ? `${Math.ceil(restante)}` : "";
  G.ui.fireButton.classList.toggle("is-charged", G.player.chargeFull);
}
