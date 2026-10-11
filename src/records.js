// Récords por dificultad, logros y contadores acumulados en localStorage.
// Módulo puro: sin estado del juego.

const TOP_SIZE = 5;
const CLAVE_LOGROS = "operacion-nacho-logros";
const CLAVE_TRUCOS = "operacion-nacho-trucos";
// La campaña conserva la clave histórica por dificultad; los demás modos
// (supervivencia, solo jefes) tienen su propio top por dificultad.
const claveTop = (difficultyId, modeId = "campana") =>
  modeId === "campana"
    ? `operacion-nacho-top-${difficultyId}`
    : `operacion-nacho-top-${modeId}-${difficultyId}`;
const claveContador = (nombre) => `operacion-nacho-total-${nombre}`;


function leerLista(clave) {
  try {
    const datos = JSON.parse(localStorage.getItem(clave));
    return Array.isArray(datos) ? datos.filter((n) => Number.isFinite(n)) : [];
  } catch {
    return [];
  }
}


// Top 5 de puntuaciones del modo y la dificultad, de mayor a menor.
export function getHighScores(difficultyId, modeId = "campana") {
  try {
    const puntuaciones = leerLista(claveTop(difficultyId, modeId));
    // Las claves legadas (récord único por dificultad y récord global) se
    // conservan como entradas del top de campaña: los récords no deben bajar.
    if (modeId === "campana") {
      const clavesLegadas = [`operacion-nacho-record-${difficultyId}`, "operacion-nacho-record"];
      for (const clave of clavesLegadas) {
        const legado = Number(localStorage.getItem(clave)) || 0;
        if (legado > 0) puntuaciones.push(legado);
      }
    }
    return [...new Set(puntuaciones)].sort((a, b) => b - a).slice(0, TOP_SIZE);
  } catch {
    return [];
  }
}


export function getHighScore(difficultyId, modeId = "campana") {
  return getHighScores(difficultyId, modeId)[0] || 0;
}


// Guarda la puntuación si entra en el top 5 y devuelve su posición (1-5),
// o 0 si se queda fuera.
export function saveHighScore(score, difficultyId, modeId = "campana") {
  const puntos = Math.round(score);
  if (puntos <= 0) return 0;
  const puntuaciones = getHighScores(difficultyId, modeId);
  puntuaciones.push(puntos);
  puntuaciones.sort((a, b) => b - a);
  const top = puntuaciones.slice(0, TOP_SIZE);
  try {
    localStorage.setItem(claveTop(difficultyId, modeId), JSON.stringify(top));
  } catch {
    // El juego sigue funcionando sin almacenamiento.
  }
  return top.indexOf(puntos) + 1;
}


export function getUnlockedAchievements() {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE_LOGROS)) || {};
    return new Set(Object.keys(datos).filter((id) => datos[id]));
  } catch {
    return new Set();
  }
}


// Devuelve true solo la primera vez que se desbloquea el logro.
export function unlockAchievement(id) {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE_LOGROS)) || {};
    if (datos[id]) return false;
    datos[id] = true;
    localStorage.setItem(CLAVE_LOGROS, JSON.stringify(datos));
    return true;
  } catch {
    return false;
  }
}


// Trucos ocultos: marcas aparte de los logros, para que el contador de
// logros del menú no sume lo desbloqueado haciendo trampa.
export function isCheatActive(id) {
  try {
    return !!JSON.parse(localStorage.getItem(CLAVE_TRUCOS))[id];
  } catch {
    return false;
  }
}


// Devuelve true solo la primera vez que se activa el truco.
export function activateCheat(id) {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE_TRUCOS)) || {};
    if (datos[id]) return false;
    datos[id] = true;
    localStorage.setItem(CLAVE_TRUCOS, JSON.stringify(datos));
    return true;
  } catch {
    return false;
  }
}


// Contadores acumulados entre partidas (bajas, esquivas…). Devuelve el total.
export function bumpCounter(nombre, cantidad = 1) {
  try {
    const total = (Number(localStorage.getItem(claveContador(nombre))) || 0) + cantidad;
    localStorage.setItem(claveContador(nombre), String(total));
    return total;
  } catch {
    return 0;
  }
}
