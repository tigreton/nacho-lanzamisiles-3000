// Audio WebAudio: tonos sintetizados, sin ficheros.
import { G } from "./state.js";

let audioContext = null;


let soundEnabled = true;


export function getAudioContext() {
  return audioContext;
}

export function unlockAudio() {
  if (!audioContext) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (AudioCtor) audioContext = new AudioCtor();
  }
  if (audioContext?.state === "suspended") audioContext.resume();
}


export function tone(frequency, duration, type = "square", volume = 0.025, slide = 0) {
  if (!soundEnabled || !audioContext) return;
  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  oscillator.frequency.linearRampToValueAtTime(Math.max(40, frequency + slide), now + duration);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + duration);
}


export function toggleSound() {
  soundEnabled = !soundEnabled;
  G.ui.soundButton.textContent = `SONIDO: ${soundEnabled ? "ON" : "OFF"}`;
  if (soundEnabled) {
    unlockAudio();
    tone(520, 0.09, "square", 0.03);
  }
}

