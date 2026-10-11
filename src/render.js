// Renderizado: fondo, entidades, HUD y banners sobre el canvas logico.
import {
  W,
  H,
  CROPS,
  SHIELD_RADIUS,
  COMBO_TIMEOUT,
  CHARGE_TIME,
  GUNSHIP_WEAKPOINT,
  BOSSES,
} from "./config.js";
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


function drawGunshipWeakpoint(enemy) {
  // Punto débil: cúpula roja pulsante sobre el morro, donde los impactos
  // hacen daño doble (coincide con el círculo de hitsGunshipWeakpoint).
  const weakX = enemy.x + enemy.w * GUNSHIP_WEAKPOINT.offsetX;
  const weakY = enemy.y + enemy.h * GUNSHIP_WEAKPOINT.offsetY;
  const weakR = enemy.w * GUNSHIP_WEAKPOINT.radius * 0.62;
  const pulso = 0.75 + Math.sin(G.state.elapsed * 7) * 0.25;
  G.ctx.save();
  G.ctx.shadowColor = "#ff3b18";
  G.ctx.shadowBlur = 10 + 8 * pulso;
  G.ctx.fillStyle = `rgba(255, 60, 25, ${0.55 + pulso * 0.3})`;
  G.ctx.beginPath();
  G.ctx.arc(weakX, weakY, weakR, 0, Math.PI * 2);
  G.ctx.fill();
  G.ctx.strokeStyle = "rgba(255, 214, 200, 0.85)";
  G.ctx.lineWidth = 2;
  G.ctx.stroke();
  G.ctx.restore();
}


function drawAirshipSprite(enemy) {
  drawSprite(G.sprites.airshipBoss, enemy.x, enemy.y, enemy.w, enemy.h, {
    rotate: Math.sin(enemy.age * 0.65) * 0.018,
    glow: enemy.phase2 ? "rgba(255, 72, 20, 0.42)" : "rgba(255, 72, 20, 0.22)",
    blur: 16,
  });
}


// La fortaleza usa la lámina IA assets/ia-fortress.webp; sobre el casco se
// dibujan solo los anclajes de sus torretas (montura viva, cráter derribada).
function drawFortress(fortress) {
  drawSprite(G.sprites.iaFortress, fortress.x, fortress.y, fortress.w, fortress.h, {
    rotate: Math.sin(fortress.age * 0.7) * 0.012,
    glow: fortress.phase2 ? "rgba(255, 45, 10, 0.5)" : "rgba(255, 60, 20, 0.3)",
    blur: 20,
  });

  G.ctx.save();
  G.ctx.translate(fortress.x, fortress.y);
  G.ctx.rotate(Math.sin(fortress.age * 0.7) * 0.012);
  for (const socket of fortress.turretSockets) {
    if (socket.alive) {
      G.ctx.fillStyle = "#46565e";
      G.ctx.strokeStyle = "#11181b";
      G.ctx.lineWidth = 4;
      G.ctx.beginPath();
      G.ctx.arc(socket.offsetX, socket.offsetY, 24, 0, Math.PI * 2);
      G.ctx.fill();
      G.ctx.stroke();
    } else {
      G.ctx.fillStyle = "#12181b";
      G.ctx.beginPath();
      G.ctx.arc(socket.offsetX, socket.offsetY, 22, 0, Math.PI * 2);
      G.ctx.fill();
      G.ctx.fillStyle = `rgba(255, 96, 24, ${0.35 + Math.sin(fortress.age * 6 + socket.offsetX) * 0.2})`;
      G.ctx.beginPath();
      G.ctx.arc(socket.offsetX, socket.offsetY, 9, 0, Math.PI * 2);
      G.ctx.fill();
    }
  }
  G.ctx.restore();
}


// Torreta de la fortaleza: lámina IA que gira siguiendo al helicóptero.
// Avisa con un fogonazo cuando está a punto de disparar.
function drawTurret(turret) {
  const angulo = Math.atan2(G.player.y - turret.y, G.player.x - turret.x);
  const sprite = turret.turretKind === "spread" ? G.sprites.iaTurretSpread : G.sprites.iaTurretAim;
  drawSprite(sprite, turret.x, turret.y, turret.w, turret.h, { rotate: angulo });

  if (turret.fireTimer < 0.32) {
    const aviso = 1 - turret.fireTimer / 0.32;
    G.ctx.save();
    G.ctx.translate(turret.x, turret.y);
    G.ctx.rotate(angulo);
    G.ctx.fillStyle = turret.parent?.phase2 ? "#ff3013" : "#ff8a18";
    G.ctx.globalAlpha = 0.35 + aviso * 0.6;
    G.ctx.beginPath();
    G.ctx.arc(turret.w * 0.72, 0, 5 + aviso * 4, 0, Math.PI * 2);
    G.ctx.fill();
    G.ctx.restore();
  }

  // Barra de daño propia: cada torreta es un mini-objetivo y conviene
  // ver lo que le queda.
  if (turret.hp < turret.maxHp) {
    const ancho = 46;
    const x = turret.x - ancho / 2;
    const y = turret.y - 34;
    G.ctx.fillStyle = "rgba(4, 9, 12, 0.8)";
    G.ctx.fillRect(x - 2, y - 2, ancho + 4, 8);
    G.ctx.fillStyle = "rgba(255,255,255,0.2)";
    G.ctx.fillRect(x, y, ancho, 4);
    G.ctx.fillStyle = "#ffb02e";
    G.ctx.fillRect(x, y, ancho * clamp(turret.hp / turret.maxHp, 0, 1), 4);
  }
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
  const indice = backgroundIndex % CROPS.backgrounds.length;
  if (indice === 2 && G.sprites.iaAtardecer) {
    // El atardecer de las oleadas 11-12 usa la lámina IA completa: el
    // recorte del atlas original es 234x149 estirado a pantalla y su
    // resplandor saturado se comía la lectura del combate.
    G.ctx.drawImage(G.sprites.iaAtardecer, 0, 0, W, H);
  } else {
    const crop = CROPS.backgrounds[indice];
    G.ctx.drawImage(G.sheet, crop[0], crop[1], crop[2], crop[3], 0, 0, W, H);
  }

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
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
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
  if (G.player.homingAmmo > 0) powerLabels.push({ text: `TELEDIRIGIDOS ${G.player.homingAmmo}`, color: "#b6ff3c" });
  if (G.ally) powerLabels.push({ text: "DRON ALIADO", color: "#6cecff" });
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
  G.ctx.fillText(G.state.gameMode === "jefes" ? "JEFE" : "OLEADA", W / 2, 34);
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
    G.ctx.fillStyle = boss.phase2 ? "#ff2a12" : "#ff4d21";
    G.ctx.fill();
    // Marca del 50%: el umbral donde el jefe entra en fase final.
    G.ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    G.ctx.fillRect(x + barWidth * 0.5 - 1, y, 2, 14);
    let etiqueta = BOSSES[boss.type].barLabel;
    if (boss.type === "fortress") etiqueta += ` · TORRETAS ${boss.turretsLeft}`;
    if (boss.phase2) etiqueta += " · ¡FURIA!";
    G.ctx.textAlign = "center";
    G.ctx.fillStyle = boss.phase2 ? "#ffb3a3" : "#fff";
    G.ctx.font = '900 10px Inter, sans-serif';
    G.ctx.fillText(etiqueta, W / 2, y - 13);
  }
  G.ctx.restore();
}


function drawBalloonBasket(basket) {
  // Cesta desprendida con sus cuerdas rotas: lámina IA ia-basket.webp.
  drawSprite(G.sprites.iaBasket, basket.x, basket.y, basket.w, basket.h, {
    rotate: clamp(basket.vx / 900, -0.24, 0.24) + Math.sin(basket.age * 7 + basket.phase) * 0.08,
    glow: "rgba(255, 91, 39, 0.52)",
    blur: 10,
  });
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
  // Plataforma volante con pista de aterrizaje: lámina IA ia-airbase.webp.
  // El letrero ATERRIZA se dibuja encima porque es la instrucción de juego.
  drawSprite(G.sprites.iaAirbase, base.x, base.y, base.w, base.h, {
    glow: "rgba(91, 227, 255, 0.45)",
    blur: 16,
  });
  G.ctx.save();
  G.ctx.translate(base.x, base.y);
  G.ctx.fillStyle = "#132126";
  G.ctx.font = '900 16px Inter, sans-serif';
  G.ctx.textAlign = "center";
  G.ctx.textBaseline = "middle";
  G.ctx.fillText("ATERRIZA", 0, -base.h * 0.22);
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

  if (G.ally) {
    // La lámina IA del aliado mira a la izquierda como el resto del arte
    // enemigo: se voltea para escoltar al helicóptero mirando a la derecha.
    drawSprite(G.sprites.iaAlly, G.ally.x, G.ally.y, 64, 74, {
      flipX: true,
      glow: "rgba(108, 236, 255, 0.55)",
      blur: 12,
    });
  }

  for (const bullet of G.playerBullets) {
    if (bullet.homing) {
      drawSprite(G.sprites.iaHoming, bullet.x, bullet.y, bullet.w, bullet.h, {
        rotate: Math.atan2(bullet.vy, bullet.vx),
        glow: "#b6ff3c",
        blur: 13,
      });
    } else if (bullet.charged) {
      drawSprite(G.sprites.missile, bullet.x, bullet.y, bullet.w, bullet.h, {
        glow: "#ffb02e",
        blur: 18,
      });
    } else if (bullet.fromAlly) {
      drawSprite(G.sprites.playerBullet, bullet.x, bullet.y, bullet.w, bullet.h, {
        rotate: Math.atan2(bullet.vy, bullet.vx),
        glow: "#6cecff",
        blur: 10,
      });
    } else {
      const sprite = bullet.charged
        ? G.sprites.iaCharged
        : bullet.explosive
          ? G.sprites.missile
          : G.sprites.playerBullet;
      drawSprite(sprite, bullet.x, bullet.y, bullet.w, bullet.h, {
        glow: bullet.charged ? "#ffd63c" : bullet.explosive ? "#ff8a18" : "#6cecff",
        blur: 13,
      });
    }
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
        glow: enemy.phase2 ? "rgba(255, 45, 10, 0.45)" : undefined,
        blur: 18,
      });
    } else if (enemy.type === "airship") {
      drawAirshipSprite(enemy);
    } else if (enemy.type === "fortress") {
      drawFortress(enemy);
    } else if (enemy.type === "turret") {
      drawTurret(enemy);
    } else if (enemy.type === "balloon") {
      drawBalloonSprite(enemy);
    } else if (enemy.type === "drone") {
      const frame = Math.floor(enemy.age * 6 + enemy.phase) % G.sprites.drone.length;
      drawSprite(G.sprites.drone[frame], enemy.x, enemy.y, enemy.w, enemy.h, {
        rotate: Math.sin(enemy.age * 3) * 0.05,
      });
    } else if (enemy.type === "kamikaze") {
      // El diseño IA mira a la izquierda: en el piqué se orienta según el
      // rumbo fijado, y en el aviso parpadea blanco/rojo.
      const parpadeo = enemy.diveState === "telegraph" && Math.floor(enemy.telegraphTimer * 16) % 2 === 0;
      drawSprite(G.sprites.iaKamikaze, enemy.x, enemy.y, enemy.w, enemy.h, {
        rotate: enemy.diveState === "dive" ? Math.atan2(enemy.vy, enemy.vx) - Math.PI : 0,
        glow: parpadeo ? "rgba(255, 255, 255, 0.95)" : "rgba(255, 40, 10, 0.6)",
        blur: 14,
      });
    } else if (enemy.type === "gunship") {
      // El blindado tiene lámina propia: la coraza y la cúpula roja del punto
      // débil vienen ya en el arte (ia-gunship.webp).
      drawSprite(G.sprites.iaGunship, enemy.x, enemy.y, enemy.w, enemy.h);
      drawGunshipWeakpoint(enemy);
    } else if (enemy.type === "fighter") {
      const frame = Math.floor(enemy.phase) % G.sprites.fighter.length;
      const squad = enemy.squadId != null ? G.state.squads[enemy.squadId] : null;
      const enFormacion = squad && !squad.dispersed;
      drawSprite(
        G.sprites.fighter[frame],
        enemy.x,
        enemy.y,
        enemy.w,
        enemy.h,
        enFormacion ? { glow: "rgba(255, 176, 46, 0.42)", blur: 12 } : {},
      );
    } else {
      const frame = Math.floor(enemy.age * 5 + enemy.phase) % G.sprites.enemyHeli.length;
      drawSprite(G.sprites.enemyHeli[frame], enemy.x, enemy.y, enemy.w, enemy.h);
    }
    G.ctx.restore();
  }

  const playerAlpha =
    G.player.invulnerable > 0 && Math.floor(G.player.invulnerable * 14) % 2 === 0 ? 0.32 : 1;
  if (G.player.shield > 0) {
    // Burbuja de energía IA bajo el helicóptero, latiendo mientras dura.
    const radio = SHIELD_RADIUS + Math.sin(G.state.elapsed * 5) * 3;
    drawSprite(G.sprites.iaShield, G.player.x, G.player.y, radio * 2, radio * 2, {
      alpha: 0.62 + Math.sin(G.state.elapsed * 5) * 0.12,
    });
  }
  const playerSprite = G.sprites.playerVariants?.[G.player.helicopter] || G.sprites.player[G.player.frame];
  drawSprite(playerSprite, G.player.x, G.player.y, G.player.w, G.player.h, {
    rotate: G.player.tilt,
    alpha: playerAlpha,
  });

  // Medidor de carga: un arco alrededor del helicóptero que se cierra al
  // mantener el disparo; al completarse pasa a naranja y late.
  if (G.player.charge > 0) {
    const progress = clamp(G.player.charge / CHARGE_TIME, 0, 1);
    const cargado = progress >= 1;
    G.ctx.save();
    G.ctx.translate(G.player.x, G.player.y);
    G.ctx.strokeStyle = cargado ? "#ff8a18" : "#ffd63c";
    G.ctx.lineWidth = 5;
    G.ctx.shadowColor = cargado ? "#ff8a18" : "#ffd63c";
    G.ctx.shadowBlur = cargado ? 16 : 8;
    if (cargado) G.ctx.globalAlpha = 0.7 + Math.sin(G.state.elapsed * 14) * 0.3;
    G.ctx.beginPath();
    G.ctx.arc(0, 0, 80, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
    G.ctx.stroke();
    G.ctx.restore();
  }
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
  G.ctx.fillText("CÓMO JUGAR", W / 2, 60);

  const etiqueta = (texto, x, y) => {
    G.ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
    G.ctx.font = "900 12px Inter, sans-serif";
    G.ctx.fillText(texto, x, y);
  };
  const seccion = (texto, y) => {
    G.ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    G.ctx.font = "900 13px Inter, sans-serif";
    G.ctx.fillText(texto, W / 2, y);
  };

  seccion("ENEMIGOS", 112);
  // Centros calculados para un hueco fijo de 47 px entre sprites, con los dos
  // jefes (más anchos) separados del resto y de entre sí.
  const enemigos = [
    [G.sprites.enemyHeli?.[0], "HELI", 124, 88],
    [G.sprites.drone?.[0], "DRON", 255, 80],
    [G.sprites.fighter?.[0], "CAZA", 390, 96],
    [G.sprites.iaKamikaze, "KAMIKAZE", 525, 80],
    [G.sprites.iaGunship, "BLINDADO", 658, 92],
    [G.sprites.boss, "ACORAZADO", 826, 150],
    [G.sprites.airshipBoss, "DIRIGIBLE", 1033, 170],
  ];
  for (const [sprite, texto, x, tam] of enemigos) {
    drawSprite(sprite, x, 196, tam, tam * 0.75, { glow: "rgba(255, 72, 20, 0.25)", blur: 12 });
    etiqueta(texto, x, 270);
  }

  seccion("BOTÍN", 318);
  const botin = [
    [G.sprites.coin, "MONEDA", 250],
    [G.sprites.powerups?.[0], "RÁFAGA", 460],
    [G.sprites.powerups?.[1], "ESCUDO", 670],
    [G.sprites.powerups?.[2], "VIDA", 880],
    [G.sprites.powerups?.[3], "ESTRELLA", 1060],
  ];
  for (const [sprite, texto, x] of botin) {
    drawSprite(sprite, x, 386, 64, 62, { glow: "#9ce7ff", blur: 10 });
    etiqueta(texto, x, 444);
  }

  // La esquina superior derecha queda libre para el botón VOLVER del HTML.
  seccion("CONTROLES", 488);
  G.ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
  G.ctx.font = "700 13px Inter, sans-serif";
  G.ctx.fillText("WASD / flechas mover · ESPACIO / J disparar · P / ESC pausa · ratón y táctil arrastrando", W / 2, 514);
  G.ctx.fillText("Mantén pulsado el disparo para cargar un misil grande · suelta para lanzarlo", W / 2, 535);
  G.ctx.fillText("Mando: stick mueve · A dispara (mantén para cargar) · Start pausa", W / 2, 556);
  G.ctx.fillStyle = "#d8f23b";
  G.ctx.fillText("Kamikazes avisan antes de lanzarse · Al blindado, apúntale a la cúpula roja (daño doble) · Bajas seguidas = multiplicador", W / 2, 582);
  G.ctx.fillText("Tres jefes rotan cada 4 oleadas y se enfurecen al 50% · A la fortaleza, derríbale las torretas · Rozar = puntos", W / 2, 603);
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

