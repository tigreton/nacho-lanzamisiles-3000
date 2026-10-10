// Música chiptune: loop de osciladores coherente con los tone() del juego.
// Secuenciador con lookahead: programa notas 180 ms por delante del reloj del
// AudioContext, sin depender de la precisión de setInterval.
import { G } from "./state.js";
import { getAudioContext } from "./audio.js";

const CLAVE_MUSICA = "operacion-nacho-music";
const PASO = 60 / 130 / 2; // corcheas a 130 BPM
const VOLUMEN_MUSICA = 0.5;

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
// Am - F - C - G, dos compases de corcheas (MIDI).
const BAJO = [45, 45, 45, 45, 41, 41, 41, 41, 48, 48, 48, 48, 43, 43, 43, 43];
const GUIA = [69, 72, 76, 72, 65, 69, 72, 69, 72, 76, 79, 76, 67, 71, 74, 71];

let musicEnabled = localStorage.getItem(CLAVE_MUSICA) !== "off";
let musicGain = null;
let temporizador = null;
let paso = 0;
let proximo = 0;

function nota(frecuencia, cuando, duracion, tipo, volumen) {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = tipo;
  osc.frequency.value = frecuencia;
  gain.gain.setValueAtTime(volumen, cuando);
  gain.gain.exponentialRampToValueAtTime(0.0001, cuando + duracion);
  osc.connect(gain);
  gain.connect(musicGain);
  osc.start(cuando);
  osc.stop(cuando + duracion);
}

function programar() {
  const ctx = getAudioContext();
  if (!ctx || !musicGain) return;
  while (proximo < ctx.currentTime + 0.18) {
    const t = Math.max(proximo, ctx.currentTime + 0.01);
    nota(midi(BAJO[paso % BAJO.length]), t, PASO * 0.9, "square", 0.022);
    nota(midi(GUIA[paso % GUIA.length]), t, PASO * 0.8, "triangle", 0.03);
    proximo += PASO;
    paso += 1;
  }
}

export function ensureMusic() {
  const ctx = getAudioContext();
  if (!ctx || !musicEnabled || temporizador) return;
  musicGain = ctx.createGain();
  musicGain.gain.value = VOLUMEN_MUSICA;
  musicGain.connect(ctx.destination);
  paso = 0;
  proximo = ctx.currentTime + 0.05;
  programar();
  temporizador = setInterval(programar, 60);
}

export function stopMusic() {
  if (temporizador) clearInterval(temporizador);
  temporizador = null;
  if (musicGain) {
    musicGain.disconnect();
    musicGain = null;
  }
}

export function toggleMusic() {
  musicEnabled = !musicEnabled;
  try {
    localStorage.setItem(CLAVE_MUSICA, musicEnabled ? "on" : "off");
  } catch {
    // sin almacenamiento la preferencia vive lo que dura la sesion
  }
  G.ui.musicButton.textContent = `MÚSICA: ${musicEnabled ? "ON" : "OFF"}`;
  if (musicEnabled) ensureMusic();
  else stopMusic();
}

export function initMusicUI() {
  G.ui.musicButton.textContent = `MÚSICA: ${musicEnabled ? "ON" : "OFF"}`;
  G.ui.musicButton.addEventListener("click", () => {
    toggleMusic();
    if (musicEnabled) ensureMusic();
  });
}
