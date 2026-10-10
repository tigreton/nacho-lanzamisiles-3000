// Particulas, explosiones y estrellas del fondo.
import { W, H, MAX_PARTICLES } from "../config.js";
import { G } from "../state.js";
import { rand } from "../utils.js";


export function createBurst(x, y, color, count = 8, speed = 150) {
  // Tope duro: en oleadas densas con jefes las explosiones podian acumular
  // miles de particulas y castigar el frame time.
  const restantes = MAX_PARTICLES - G.particles.length;
  const nuevos = Math.min(count, Math.max(0, restantes));
  for (let i = 0; i < nuevos; i += 1) {
    const angle = rand(0, Math.PI * 2);
    const velocity = rand(speed * 0.35, speed);
    G.particles.push({
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      life: rand(0.18, 0.52),
      maxLife: 0.52,
      size: rand(2, 6),
      color,
    });
  }
}


export function createExplosion(x, y, size = 110) {
  G.effects.push({ x, y, size, age: 0, duration: 0.72 });
  createBurst(x, y, "#ff8a18", Math.round(size / 10), size * 1.25);
  G.state.shake = Math.max(G.state.shake, Math.min(13, size / 13));
}


export function createFloater(x, y, text, color = "#ffffff") {
  G.floaters.push({ x, y, text, color, age: 0, duration: 0.9 });
}


export function updateEffects(dt) {
  for (const effect of G.effects) effect.age += dt;
  G.effects = G.effects.filter((effect) => effect.age < effect.duration);

  for (const floater of G.floaters) {
    floater.age += dt;
    floater.y -= 46 * dt;
  }
  G.floaters = G.floaters.filter((floater) => floater.age < floater.duration);

  for (const particle of G.particles) {
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= Math.pow(0.96, dt * 60);
    particle.vy *= Math.pow(0.96, dt * 60);
  }
  G.particles = G.particles.filter((particle) => particle.life > 0);

  for (const star of G.stars) {
    star.x -= star.speed * dt;
    if (star.x < -5) {
      star.x = W + 5;
      star.y = rand(0, H);
    }
  }
}

