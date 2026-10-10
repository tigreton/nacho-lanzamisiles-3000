// Renderizado: fondo, entidades, HUD y banners sobre el canvas logico.
import { W, H, CROPS, SHIELD_RADIUS, COMBO_TIMEOUT } from "./config.js";
import { G, comboMultiplier } from "./state.js";
import { rand, clamp, isBossEnemy } from "./utils.js";
import { bakedGlow } from "./sprites.js";


function drawSprite(image, x, y, width, height, options = {}) {
  if (!image) return;
  G.ctx.save();
  G.ctx.translate(x, y);
  if (options.rotate) G.ctx.rotate(options.rotate);
  if (options.flipX) G.ctx.scale(-1, 1);
  if (options.alpha !== undefined) G.ctx.globalAlpha = options.alpha;
  if (options.glow) {
    const horneado = bakedGlow(image, options.glow, options.blur || 14);
    const w = horneado.width * (width / image.width);
    const h = horneado.height * (height / image.height);
    G.ctx.drawImage(horneado, -w / 2, -h / 2, w, h);
  } else {
    G.ctx.drawImage(image, -width / 2, -height / 2, width, height);
  }
  G.ctx.restore();
}


function drawAirshipSprite(enemy) {
  drawSprite(G.sprites.airshipBoss, enemy.x, enemy.y, enemy.w, enemy.h, {
    rotate: Math.sin(enemy.age * 0.65) * 0.018,
    glow: "rgba(255, 72, 20, 0.22)",
    blur: 16,
  });
}


function drawBalloonSprite(enemy) {
  const bob = Math.sin(enemy.age * 5 + enemy.phase) * 4;
  const animationPose = Math.floor(enemy.age * 2.4 + enemy.phase) % 2;
  const frame = enemy.spriteVariant + animationPose * 2;
  drawSprite(G.sprites.balloons[frame], enemy.x, enemy.y + bob, enemy.w, enemy.h, {
    rotate: Math.sin(enemy.age * 2.1 + enemy.phase) * 0.035,
    glow: "rgba(255, 74, 35, 0.32)",
    blur: 9,
  });
}


function drawBackground(backgroundIndex = 0) {
  const crop = CROPS.backgrounds[backgroundIndex % CROPS.backgrounds.length];
  G.ctx.drawImage(G.sheet, crop[0], crop[1], crop[2], crop[3], 0, 0, W, H);

  const tint = G.ctx.createLinearGradient(0, 0, 0, H);
  tint.addColorStop(0, "rgba(12, 49, 72, 0.04)");
  tint.addColorStop(0.62, "rgba(1, 18, 25, 0.02)");
  tint.addColorStop(1, "rgba(0, 7, 11, 0.38)");
  G.ctx.fillStyle = tint;
  G.ctx.fillRect(0, 0, W, H);

  if (G.state) {
    for (const star of G.stars) {
      G.ctx.globalAlpha = star.alpha;
      G.ctx.fillStyle = backgroundIndex === 2 ? "#ffbb65" : "#d6f7ff";
      G.ctx.fillRect(star.x, star.y, star.size * 6, star.size);
    }
    G.ctx.globalAlpha = 1;
  }
}


function drawMenuBackdrop() {
  drawBackground(0);
  const rightShade = G.ctx.createLinearGradient(W * 0.45, 0, W, 0);
  rightShade.addColorStop(0, "rgba(0, 17, 24, 0)");
  rightShade.addColorStop(1, "rgba(0, 17, 24, 0.16)");
  G.ctx.fillStyle = rightShade;
  G.ctx.fillRect(0, 0, W, H);

  drawSprite(G.sprites.boss, W * 0.81, H * 0.52, 410, 205, {
    rotate: -0.02,
    glow: "rgba(255, 72, 20, 0.28)",
    blur: 24,
  });
  drawSprite(G.sprites.player[0], W * 0.59, H * 0.4, 190, 145, {
    rotate: 0.02,
    glow: "rgba(95, 226, 255, 0.25)",
    blur: 22,
  });
  drawSprite(G.sprites.drone[4], W * 0.68, H * 0.2, 88, 98);
  drawSprite(G.sprites.fighter[2], W * 0.9, H * 0.22, 145, 88);
}


function roundedRect(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  G.ctx.beginPath();
  G.ctx.roundRect(x, y, width, height, r);
}


function drawHud() {
  G.ctx.save();
  G.ctx.textBaseline = "middle";

  roundedRect(18, 17, 390, 72, 12);
  G.ctx.fillStyle = "rgba(4, 13, 18, 0.77)";
  G.ctx.fill();
  G.ctx.strokeStyle = "rgba(255,255,255,0.18)";
  G.ctx.stroke();

  drawSprite(G.sprites.face, 57, 53, 64, 66);
  G.ctx.fillStyle = "#d8f23b";
  G.ctx.font = '700 12px Inter, sans-serif';
  G.ctx.fillText("BLINDAJE", 96, 37);

  const segmentGap = 3;
  const healthBarWidth = 294;
  const segmentWidth = Math.min(
    35,
    (healthBarWidth - segmentGap * Math.max(0, G.player.maxHp - 1)) / G.player.maxHp,
  );
  for (let i = 0; i < G.player.maxHp; i += 1) {
    roundedRect(96 + i * (segmentWidth + segmentGap), 51, segmentWidth, 16, 3);
    G.ctx.fillStyle = i < G.player.hp ? (i < 2 ? "#ff5a24" : "#d7ef31") : "rgba(255,255,255,0.13)";
    G.ctx.fill();
  }

  const powerLabels = [];
  if (G.player.explosiveAmmo > 0) powerLabels.push({ text: `EXPLOSIVOS ${G.player.explosiveAmmo}`, color: "#ff8a18" });
  if (G.player.rapid > 0) powerLabels.push({ text: `RÁFAGA ${Math.ceil(G.player.rapid)}s`, color: "#ffb02e" });
  if (G.player.shield > 0) powerLabels.push({ text: `ESCUDO ${Math.ceil(G.player.shield)}s`, color: "#68d8ff" });
  G.ctx.font = '900 11px Inter, sans-serif';
  let labelX = 96;
  for (const { text, color } of powerLabels) {
    G.ctx.fillStyle = color;
    G.ctx.fillText(text, labelX, 77);
    labelX += G.ctx.measureText(text).width + 18;
  }

  roundedRect(W / 2 - 78, 17, 156, 60, 10);
  G.ctx.fillStyle = "rgba(4, 13, 18, 0.77)";
  G.ctx.fill();
  G.ctx.strokeStyle = "rgba(255,255,255,0.18)";
  G.ctx.stroke();
  G.ctx.textAlign = "center";
  G.ctx.fillStyle = "rgba(255,255,255,0.62)";
  G.ctx.font = '900 10px Inter, sans-serif';
  G.ctx.fillText("OLEADA", W / 2, 34);
  G.ctx.fillStyle = "#ffffff";
  G.ctx.font = '400 26px "Black Ops One", Impact, sans-serif';
  G.ctx.fillText(String(G.state.wave).padStart(2, "0"), W / 2, 57);

  // Combo activo: multiplicador vigente y barra del tiempo que queda
  // antes de que la racha caduque.
  if (G.state.combo.kills > 0) {
    const comboColor = comboMultiplier() > 1 ? "#ffb02e" : "rgba(255,255,255,0.66)";
    const restante = clamp(G.state.combo.timer / COMBO_TIMEOUT, 0, 1);
    G.ctx.fillStyle = comboColor;
    G.ctx.font = '400 15px "Black Ops One", Impact, sans-serif';
    G.ctx.fillText(`COMBO x${comboMultiplier()}`, W / 2, 97);
    roundedRect(W / 2 - 34, 105, 68, 6, 3);
    G.ctx.fillStyle = "rgba(255,255,255,0.22)";
    G.ctx.fill();
    if (restante > 0) {
      roundedRect(W / 2 - 34 + 68 * (1 - restante), 105, 68 * restante, 6, 3);
      G.ctx.fillStyle = comboColor;
      G.ctx.fill();
    }
  }

  roundedRect(W - 300, 17, 282, 72, 12);
  G.ctx.fillStyle = "rgba(4, 13, 18, 0.77)";
  G.ctx.fill();
  G.ctx.strokeStyle = "rgba(255,255,255,0.18)";
  G.ctx.stroke();
  G.ctx.textAlign = "right";
  G.ctx.fillStyle = "rgba(255,255,255,0.58)";
  G.ctx.font = '900 10px Inter, sans-serif';
  G.ctx.fillText("PUNTOS", W - 114, 36);
  G.ctx.fillStyle = "#ffffff";
  G.ctx.font = '400 25px "Black Ops One", Impact, sans-serif';
  G.ctx.fillText(G.state.score.toLocaleString("es-ES"), W - 114, 62);
  drawSprite(G.sprites.coin, W - 67, 53, 45, 43);
  G.ctx.textAlign = "left";
  G.ctx.fillStyle = "#ffd63c";
  G.ctx.font = '900 18px Inter, sans-serif';
  G.ctx.fillText(String(G.state.coins), W - 46, 54);

  const boss = G.enemies.find((enemy) => isBossEnemy(enemy));
  if (boss) {
    const barWidth = 560;
    const x = W / 2 - barWidth / 2;
    const y = H - 39;
    roundedRect(x - 8, y - 8, barWidth + 16, 30, 8);
    G.ctx.fillStyle = "rgba(4, 9, 12, 0.82)";
    G.ctx.fill();
    roundedRect(x, y, barWidth, 14, 5);
    G.ctx.fillStyle = "rgba(255,255,255,0.13)";
    G.ctx.fill();
    roundedRect(x, y, barWidth * clamp(boss.hp / boss.maxHp, 0, 1), 14, 5);
    G.ctx.fillStyle = "#ff4d21";
    G.ctx.fill();
    G.ctx.textAlign = "center";
    G.ctx.fillStyle = "#fff";
    G.ctx.font = '900 10px Inter, sans-serif';
    G.ctx.fillText(boss.type === "airship" ? "DIRIGIBLE DE GLOBOS" : "ACORAZADO 3000", W / 2, y - 13);
  }
  G.ctx.restore();
}


function drawBalloonBasket(basket) {
  G.ctx.save();
  G.ctx.translate(basket.x, basket.y);
  G.ctx.rotate(clamp(basket.vx / 900, -0.24, 0.24) + Math.sin(basket.age * 7 + basket.phase) * 0.08);
  G.ctx.shadowColor = "rgba(255, 91, 39, 0.52)";
  G.ctx.shadowBlur = 10;

  // Broken suspension ropes show that the basket has detached from the balloon.
  G.ctx.strokeStyle = "rgba(237, 205, 128, 0.9)";
  G.ctx.lineWidth = 2;
  G.ctx.beginPath();
  G.ctx.moveTo(-11, -14);
  G.ctx.lineTo(-7, -4);
  G.ctx.moveTo(11, -14);
  G.ctx.lineTo(7, -4);
  G.ctx.stroke();

  const basketFill = G.ctx.createLinearGradient(0, -5, 0, 15);
  basketFill.addColorStop(0, "#d18a3d");
  basketFill.addColorStop(0.5, "#8a4e2b");
  basketFill.addColorStop(1, "#42251d");
  G.ctx.fillStyle = basketFill;
  G.ctx.strokeStyle = "#211615";
  G.ctx.lineWidth = 3;
  G.ctx.beginPath();
  G.ctx.moveTo(-14, -5);
  G.ctx.lineTo(14, -5);
  G.ctx.lineTo(11, 14);
  G.ctx.lineTo(-11, 14);
  G.ctx.closePath();
  G.ctx.fill();
  G.ctx.stroke();

  G.ctx.strokeStyle = "rgba(255, 205, 111, 0.62)";
  G.ctx.lineWidth = 1.3;
  G.ctx.beginPath();
  G.ctx.moveTo(-10, 1);
  G.ctx.lineTo(10, 6);
  G.ctx.moveTo(-9, 8);
  G.ctx.lineTo(9, 2);
  G.ctx.stroke();

  G.ctx.fillStyle = "#ff4925";
  G.ctx.shadowColor = "#ff3b18";
  G.ctx.shadowBlur = 8;
  G.ctx.beginPath();
  G.ctx.arc(0, -1, 3, 0, Math.PI * 2);
  G.ctx.fill();
  G.ctx.restore();
}


function drawAirshipGondola(gondola) {
  G.ctx.save();
  G.ctx.translate(gondola.x, gondola.y);
  G.ctx.rotate(clamp(gondola.vx / 900, -0.25, 0.25) + Math.sin(gondola.age * 4.5 + gondola.phase) * 0.05);
  drawSprite(G.sprites.airshipGondola, 0, 0, gondola.w, gondola.h, {
    glow: "rgba(255, 73, 28, 0.58)",
    blur: 17,
  });

  // The ring counts down the ten-second pursuit phase.
  const remaining = clamp(1 - gondola.age / 10, 0, 1);
  G.ctx.strokeStyle = "rgba(255, 208, 83, 0.9)";
  G.ctx.lineWidth = 3;
  G.ctx.beginPath();
  G.ctx.arc(0, -34, 11, -Math.PI / 2, -Math.PI / 2 + remaining * Math.PI * 2);
  G.ctx.stroke();
  G.ctx.restore();
}


function drawAirbase(base) {
  G.ctx.save();
  G.ctx.translate(base.x, base.y);
  G.ctx.shadowColor = "rgba(91, 227, 255, 0.52)";
  G.ctx.shadowBlur = 18;

  // A compact flying platform with a clear landing pad and approach lights.
  G.ctx.fillStyle = "rgba(79, 220, 255, 0.12)";
  G.ctx.beginPath();
  G.ctx.ellipse(0, 38, 105, 13, 0, 0, Math.PI * 2);
  G.ctx.fill();

  G.ctx.fillStyle = "#243238";
  G.ctx.strokeStyle = "#101719";
  G.ctx.lineWidth = 5;
  G.ctx.beginPath();
  G.ctx.moveTo(-112, -20);
  G.ctx.lineTo(107, -20);
  G.ctx.lineTo(122, 12);
  G.ctx.lineTo(91, 31);
  G.ctx.lineTo(-91, 31);
  G.ctx.lineTo(-122, 12);
  G.ctx.closePath();
  G.ctx.fill();
  G.ctx.stroke();

  G.ctx.shadowBlur = 0;
  G.ctx.fillStyle = "#d8f23b";
  G.ctx.strokeStyle = "#536a16";
  G.ctx.lineWidth = 3;
  G.ctx.beginPath();
  G.ctx.moveTo(-74, -8);
  G.ctx.lineTo(74, -8);
  G.ctx.lineTo(61, 13);
  G.ctx.lineTo(-61, 13);
  G.ctx.closePath();
  G.ctx.fill();
  G.ctx.stroke();

  G.ctx.fillStyle = "#132126";
  G.ctx.font = '900 16px Inter, sans-serif';
  G.ctx.textAlign = "center";
  G.ctx.textBaseline = "middle";
  G.ctx.fillText("ATERRIZA", 0, 3);

  G.ctx.strokeStyle = "#162326";
  G.ctx.lineWidth = 4;
  for (const x of [-78, 78]) {
    G.ctx.beginPath();
    G.ctx.moveTo(x, 22);
    G.ctx.lineTo(x * 0.72, 47);
    G.ctx.stroke();
  }
  for (const x of [-84, -42, 42, 84]) {
    G.ctx.fillStyle = Math.floor(base.age * 5 + x) % 2 === 0 ? "#ffe95b" : "#ff6b2c";
    G.ctx.beginPath();
    G.ctx.arc(x, -27, 4, 0, Math.PI * 2);
    G.ctx.fill();
  }

  G.ctx.strokeStyle = "#1b2629";
  G.ctx.lineWidth = 6;
  G.ctx.beginPath();
  G.ctx.moveTo(-86, -22);
  G.ctx.lineTo(-113, -48);
  G.ctx.moveTo(86, -22);
  G.ctx.lineTo(113, -48);
  G.ctx.stroke();
  G.ctx.save();
  G.ctx.translate(-124, -56);
  G.ctx.rotate(base.age * 6);
  G.ctx.strokeStyle = "#5d7175";
  G.ctx.lineWidth = 5;
  G.ctx.beginPath();
  G.ctx.moveTo(0, -15);
  G.ctx.lineTo(0, 15);
  G.ctx.moveTo(-15, 0);
  G.ctx.lineTo(15, 0);
  G.ctx.stroke();
  G.ctx.restore();
  G.ctx.save();
  G.ctx.translate(124, -56);
  G.ctx.rotate(-base.age * 6);
  G.ctx.strokeStyle = "#5d7175";
  G.ctx.lineWidth = 5;
  G.ctx.beginPath();
  G.ctx.moveTo(0, -15);
  G.ctx.lineTo(0, 15);
  G.ctx.moveTo(-15, 0);
  G.ctx.lineTo(15, 0);
  G.ctx.stroke();
  G.ctx.restore();
  G.ctx.restore();
}


function drawEntities() {
  for (const pickup of G.pickups) {
    const bob = Math.sin(pickup.age * 7) * 4;
    if (pickup.type === "coin") {
      drawSprite(G.sprites.coin, pickup.x, pickup.y + bob, pickup.w, pickup.h, {
        glow: "#ffd63c",
        blur: 9,
      });
    } else {
      const index = { rapid: 0, shield: 1, heart: 2, star: 3 }[pickup.type] ?? 3;
      drawSprite(G.sprites.powerups[index], pickup.x, pickup.y + bob, pickup.w, pickup.h, {
        glow: pickup.type === "heart" ? "#ff472c" : "#9ce7ff",
        blur: 10,
      });
    }
  }

  if (G.airbase) drawAirbase(G.airbase);

  for (const bullet of G.playerBullets) {
    drawSprite(bullet.explosive ? G.sprites.missile : G.sprites.playerBullet, bullet.x, bullet.y, bullet.w, bullet.h, {
      glow: bullet.explosive ? "#ff8a18" : "#6cecff",
      blur: 13,
    });
  }

  for (const bullet of G.enemyBullets) {
    drawSprite(G.sprites.enemyBullet, bullet.x, bullet.y, bullet.w, bullet.h, {
      rotate: bullet.age * (bullet.reflected ? -4 : 4),
      glow: bullet.reflected ? "#68d8ff" : "#ff6a23",
      blur: 11,
    });
  }

  for (const basket of G.balloonBaskets) drawBalloonBasket(basket);
  for (const gondola of G.airshipGondolas) drawAirshipGondola(gondola);

  for (const enemy of G.enemies) {
    G.ctx.save();
    if (enemy.flash > 0) {
      G.ctx.globalAlpha = 0.5 + Math.random() * 0.5;
      G.ctx.filter = "brightness(1.8)";
    }
    if (enemy.type === "boss") {
      drawSprite(G.sprites.boss, enemy.x, enemy.y, enemy.w, enemy.h, {
        rotate: Math.sin(enemy.age * 1.4) * 0.015,
      });
    } else if (enemy.type === "airship") {
      drawAirshipSprite(enemy);
    } else if (enemy.type === "balloon") {
      drawBalloonSprite(enemy);
    } else if (enemy.type === "drone") {
      const frame = Math.floor(enemy.age * 6 + enemy.phase) % G.sprites.drone.length;
      drawSprite(G.sprites.drone[frame], enemy.x, enemy.y, enemy.w, enemy.h, {
        rotate: Math.sin(enemy.age * 3) * 0.05,
      });
    } else if (enemy.type === "fighter") {
      const frame = Math.floor(enemy.phase) % G.sprites.fighter.length;
      drawSprite(G.sprites.fighter[frame], enemy.x, enemy.y, enemy.w, enemy.h);
    } else {
      const frame = Math.floor(enemy.age * 5 + enemy.phase) % G.sprites.enemyHeli.length;
      drawSprite(G.sprites.enemyHeli[frame], enemy.x, enemy.y, enemy.w, enemy.h);
    }
    G.ctx.restore();
  }

  const playerAlpha =
    G.player.invulnerable > 0 && Math.floor(G.player.invulnerable * 14) % 2 === 0 ? 0.32 : 1;
  if (G.player.shield > 0) {
    G.ctx.save();
    G.ctx.beginPath();
    G.ctx.arc(G.player.x, G.player.y, SHIELD_RADIUS + Math.sin(G.state.elapsed * 5) * 3, 0, Math.PI * 2);
    G.ctx.strokeStyle = "rgba(88, 218, 255, 0.72)";
    G.ctx.lineWidth = 4;
    G.ctx.shadowColor = "#5be4ff";
    G.ctx.shadowBlur = 14;
    G.ctx.stroke();
    G.ctx.restore();
  }
  const playerSprite = G.sprites.playerVariants?.[G.player.helicopter] || G.sprites.player[G.player.frame];
  drawSprite(playerSprite, G.player.x, G.player.y, G.player.w, G.player.h, {
    rotate: G.player.tilt,
    alpha: playerAlpha,
  });
}


function drawEffects() {
  for (const effect of G.effects) {
    const progress = effect.age / effect.duration;
    const index = Math.min(
      G.sprites.explosion.length - 1,
      Math.floor(progress * G.sprites.explosion.length),
    );
    const scale = 0.75 + Math.sin(progress * Math.PI) * 0.45;
    drawSprite(
      G.sprites.explosion[index],
      effect.x,
      effect.y,
      effect.size * scale,
      effect.size * scale,
      { alpha: clamp(1.35 - progress, 0, 1) },
    );
  }

  for (const particle of G.particles) {
    G.ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
    G.ctx.fillStyle = particle.color;
    G.ctx.beginPath();
    G.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    G.ctx.fill();
  }
  G.ctx.globalAlpha = 1;

  G.ctx.textAlign = "center";
  G.ctx.textBaseline = "middle";
  G.ctx.font = '900 13px Inter, sans-serif';
  for (const floater of G.floaters) {
    G.ctx.globalAlpha = clamp(1 - floater.age / floater.duration, 0, 1);
    G.ctx.fillStyle = floater.color;
    G.ctx.fillText(floater.text, floater.x, floater.y);
  }
  G.ctx.globalAlpha = 1;
}


function drawBanner() {
  if (G.state.banner <= 0) return;
  const t = G.state.banner;
  const alpha = Math.min(1, (2.3 - t) * 4, t * 2);
  G.ctx.save();
  G.ctx.globalAlpha = alpha;
  const width = 510;
  const y = H * 0.47;
  const gradient = G.ctx.createLinearGradient(W / 2 - width / 2, 0, W / 2 + width / 2, 0);
  gradient.addColorStop(0, "rgba(3,10,13,0)");
  gradient.addColorStop(0.16, "rgba(3,10,13,0.76)");
  gradient.addColorStop(0.84, "rgba(3,10,13,0.76)");
  gradient.addColorStop(1, "rgba(3,10,13,0)");
  G.ctx.fillStyle = gradient;
  G.ctx.fillRect(W / 2 - width / 2, y - 43, width, 86);
  G.ctx.textAlign = "center";
  G.ctx.textBaseline = "middle";
  G.ctx.fillStyle = "#d8f23b";
  G.ctx.font = '400 37px "Black Ops One", Impact, sans-serif';
  G.ctx.fillText(G.state.bannerText, W / 2, y + 2);
  G.ctx.restore();
}


// Avisos cortos (rachas, logros) bajo el HUD central, sin tapar el banner.
function drawToast() {
  const toast = G.state.toast;
  if (!toast || toast.time <= 0) return;
  const alpha = Math.min(1, (toast.duration - toast.time) * 6, toast.time * 2.5);
  G.ctx.save();
  G.ctx.globalAlpha = alpha;
  G.ctx.textAlign = "center";
  G.ctx.textBaseline = "middle";
  G.ctx.fillStyle = toast.color;
  G.ctx.font = '400 23px "Black Ops One", Impact, sans-serif';
  G.ctx.shadowColor = "rgba(0,0,0,0.65)";
  G.ctx.shadowBlur = 9;
  G.ctx.fillText(toast.text, W / 2, 128);
  G.ctx.restore();
}


function drawHowTo() {
  drawMenuBackdrop();
  G.ctx.fillStyle = "rgba(3, 10, 15, 0.72)";
  G.ctx.fillRect(0, 0, W, H);

  G.ctx.textAlign = "center";
  G.ctx.textBaseline = "middle";
  G.ctx.fillStyle = "#d8f23b";
  G.ctx.font = '400 34px "Black Ops One", Impact, sans-serif';
  G.ctx.fillText("CÓMO JUGAR", W / 2, 64);

  const etiqueta = (texto, x, y) => {
    G.ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
    G.ctx.font = "900 11px Inter, sans-serif";
    G.ctx.fillText(texto, x, y);
  };
  const seccion = (texto, y) => {
    G.ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    G.ctx.font = "900 12px Inter, sans-serif";
    G.ctx.fillText(texto, W / 2, y);
  };

  seccion("ENEMIGOS", 122);
  const enemigos = [
    [G.sprites.enemyHeli?.[0], "HELI", 220],
    [G.sprites.drone?.[0], "DRON", 370],
    [G.sprites.fighter?.[0], "CAZA", 520],
    [G.sprites.boss, "ACORAZADO", 700, 190],
    [G.sprites.airshipBoss, "DIRIGIBLE", 920, 210],
  ];
  for (const [sprite, texto, x, tam = 96] of enemigos) {
    drawSprite(sprite, x, 210, tam, tam * 0.75, { glow: "rgba(255, 72, 20, 0.25)", blur: 12 });
    etiqueta(texto, x, 285);
  }

  seccion("BOTÍN", 350);
  const botin = [
    [G.sprites.coin, "MONEDA", 250],
    [G.sprites.powerups?.[0], "RÁFAGA", 460],
    [G.sprites.powerups?.[1], "ESCUDO", 670],
    [G.sprites.powerups?.[2], "VIDA", 880],
    [G.sprites.powerups?.[3], "ESTRELLA", 1060],
  ];
  for (const [sprite, texto, x] of botin) {
    drawSprite(sprite, x, 425, 64, 62, { glow: "#9ce7ff", blur: 10 });
    etiqueta(texto, x, 482);
  }

  seccion("CONTROLES", 540);
  G.ctx.fillStyle = "rgba(255, 255, 255, 0.66)";
  G.ctx.font = "700 13px Inter, sans-serif";
  G.ctx.fillText("WASD / flechas mover · ESPACIO / J disparar · P / ESC pausa · ratón y táctil arrastrando", W / 2, 572);
  G.ctx.fillText("Mando: stick mueve · A dispara · Start pausa", W / 2, 598);
  G.ctx.fillStyle = "#d8f23b";
  G.ctx.fillText("Sobrevive a las oleadas · Jefes cada 4 · Dirigible cada 8", W / 2, 622);
  G.ctx.fillText("Bajas seguidas = multiplicador · Rozar proyectiles = puntos de esquiva", W / 2, 648);
}

export function render() {
  G.ctx.clearRect(0, 0, W, H);
  if (!G.sheet.complete || !G.sprites.player) {
    G.ctx.fillStyle = "#0a1820";
    G.ctx.fillRect(0, 0, W, H);
    return;
  }

  if (G.mode === "menu" || G.mode === "loading") {
    drawMenuBackdrop();
    return;
  }

  if (G.mode === "howto") {
    drawHowTo();
    return;
  }

  G.ctx.save();
  if (G.state.shake > 0) G.ctx.translate(rand(-G.state.shake, G.state.shake), rand(-G.state.shake, G.state.shake));
  drawBackground(G.state.background);
  drawEntities();
  drawEffects();
  drawHud();
  drawBanner();
  drawToast();
  G.ctx.restore();

  if (G.state.flash > 0) {
    G.ctx.fillStyle = `rgba(255,255,255,${G.state.flash * 1.7})`;
    G.ctx.fillRect(0, 0, W, H);
  }
}

