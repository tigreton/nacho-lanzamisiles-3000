// Base aerea volante y bahia de cambio de helicoptero.
import { W, H, HELICOPTERS } from "../config.js";
import { G, setMode, selectHelicopter } from "../state.js";
import { rand, overlaps } from "../utils.js";
import { tone } from "../audio.js";
import { createBurst } from "./particles.js";
import { applyHelicopterStats } from "./player.js";
import { announceWave } from "../systems/waves.js";


export function spawnAirbase() {
  if (G.airbase || G.state.airbaseSpawned) return;
  const homeY = rand(170, H - 170);
  G.airbase = {
    x: W + 180,
    y: homeY,
    homeY,
    w: 250,
    h: 96,
    targetX: W * 0.62,
    vx: 145,
    age: 0,
    dockAge: 0,
    phase: rand(0, Math.PI * 2),
  };
  G.state.airbaseSpawned = true;
  announceWave("BASE AÉREA · CAMBIO DISPONIBLE");
  tone(320, 0.2, "triangle", 0.026, 160);
}


export function updateAirbase(dt) {
  if (!G.airbase) return;
  G.airbase.age += dt;
  G.airbase.y = G.airbase.homeY + Math.sin(G.airbase.age * 1.6 + G.airbase.phase) * 9;

  if (G.airbase.x > G.airbase.targetX) {
    G.airbase.x -= G.airbase.vx * dt;
  } else {
    G.airbase.dockAge += dt;
    if (G.airbase.dockAge > 14) {
      G.airbase = null;
      return;
    }
  }

  if (overlaps(G.player, G.airbase, 0.25)) openHelicopterBay();
}


function openHelicopterBay() {
  if (G.mode !== "playing" || !G.airbase) return;
  selectHelicopter(G.player.helicopter || G.selectedHelicopter);
  G.ui.helicopterSummary.textContent = `Helicóptero actual: ${HELICOPTERS[G.player.helicopter].label}. Elige tu nuevo aparato.`;
  setMode("helicopter");
  tone(520, 0.16, "sine", 0.03, 220);
}


export function continueFromHelicopter() {
  if (G.mode !== "helicopter") return;
  applyHelicopterStats(G.selectedHelicopter);
  createBurst(G.player.x, G.player.y, G.selectedHelicopter === "v2" ? "#66e8ff" : "#d8f23b", 16, 180);
  tone(620, 0.18, "square", 0.028, 260);
  G.airbase = null;
  setMode("playing");
  G.lastTime = performance.now();
  G.canvas.focus();
}

