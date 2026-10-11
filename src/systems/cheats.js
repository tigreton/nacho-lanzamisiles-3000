// Truco oculto: teclear NACHO en el menú desbloquea el modo solo jefes
// sin derribar el dirigible. La marca se guarda aparte de los logros y,
// una vez activa, vale para siempre como un desbloqueo legítimo.
import { G, showToast, refreshModeAvailability } from "../state.js";
import { tone } from "../audio.js";
import { activateCheat } from "../records.js";

const CODIGO = "nacho";
let tecleadas = "";

export function installCheatCodes() {
  window.addEventListener("keydown", (event) => {
    if (G.mode !== "menu") {
      tecleadas = "";
      return;
    }
    const letra = (event.key || "").toLowerCase();
    if (!/^[a-z]$/.test(letra)) return;
    tecleadas = (tecleadas + letra).slice(-CODIGO.length);
    if (tecleadas !== CODIGO || !activateCheat("jefes")) return;
    refreshModeAvailability();
    showToast("★ SOLO JEFES DESBLOQUEADO", "#ffd63c", 2);
    tone(620, 0.1, "square", 0.03);
    setTimeout(() => tone(930, 0.16, "square", 0.03), 110);
  });
}
