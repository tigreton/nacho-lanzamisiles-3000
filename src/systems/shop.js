// Armeria entre oleadas.
import { SHOP_ITEMS, SHIELD_DURATION } from "../config.js";
import { G, setMode } from "../state.js";
import { tone } from "../audio.js";
import { createBurst } from "../entities/particles.js";
import { advanceWave } from "./waves.js";


export function updateShopUI() {
  if (!G.state || !G.player) return;
  const nextWave = G.state.wave + 1;
  G.ui.shopCoins.textContent = `${G.state.coins} MONEDAS`;
  G.ui.shopWave.textContent = `PREPARANDO OLEADA ${nextWave}`;
  G.ui.shopSummary.textContent = `OLEADA ${G.state.wave} SUPERADA · Dificultad ${G.state.difficulty.label}`;
  G.ui.continueButton.textContent = `CONTINUAR · OLEADA ${nextWave}`;

  for (const button of G.ui.shopItemButtons) {
    const itemId = button.dataset.shopItem;
    const item = SHOP_ITEMS[itemId];
    const status = button.querySelector(".shop-item-status");
    const lifeAlreadyFull = itemId === "life" && G.player.hp >= G.player.maxHp;
    const canBuy = G.state.coins >= item.price && !lifeAlreadyFull;
    button.disabled = !canBuy;
    if (lifeAlreadyFull) status.textContent = "COMPLETO";
    else if (G.state.coins < item.price) status.textContent = "FALTAN MONEDAS";
    else if (itemId === "explosive" && G.player.explosiveAmmo > 0) status.textContent = `${G.player.explosiveAmmo} RESTANTES`;
    else status.textContent = "DISPONIBLE";
  }
}


export function buyShopItem(itemId) {
  if (G.mode !== "shop" || !SHOP_ITEMS[itemId]) return;
  const item = SHOP_ITEMS[itemId];
  if (G.state.coins < item.price) return;
  if (itemId === "life" && G.player.hp >= G.player.maxHp) return;

  G.state.coins -= item.price;
  if (itemId === "life") G.player.hp = Math.min(G.player.maxHp, G.player.hp + 1);
  if (itemId === "shield") G.player.shield = Math.max(G.player.shield, SHIELD_DURATION);
  if (itemId === "rapid") G.player.rapid = Math.max(G.player.rapid, 10);
  if (itemId === "explosive") G.player.explosiveAmmo += 8;
  const purchaseColor = itemId === "shield" ? "#68d8ff" : itemId === "explosive" ? "#ff8a18" : "#d8f23b";
  createBurst(G.player.x, G.player.y, purchaseColor, 12, 150);
  tone(itemId === "life" ? 430 : 620, 0.16, "sine", 0.028, 220);
  updateShopUI();
}


export function openShop() {
  if (G.mode !== "playing") return;
  for (const pickup of G.pickups) {
    if (pickup.type === "coin") G.state.coins += 1;
  }
  G.enemies = [];
  G.enemyBullets = [];
  G.playerBullets = [];
  G.balloonBaskets = [];
  G.airshipGondolas = [];
  G.pickups = [];
  G.state.bossClearTimer = 0;
  updateShopUI();
  setMode("shop");
  tone(300, 0.13, "square", 0.026, 160);
}


export function continueFromShop() {
  if (G.mode !== "shop") return;
  advanceWave();
  setMode("playing");
  G.lastTime = performance.now();
  G.canvas.focus();
}

