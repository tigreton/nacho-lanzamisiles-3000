// Configuración del juego: datos puros, sin dependencias.
export const W = 1200;
export const H = 675;

export const DIFFICULTIES = {
  easy: {
    label: "FÁCIL",
    playerHp: 9,
    enemyHpMultiplier: 0.8,
    enemySpeedMultiplier: 0.8,
    enemyFireIntervalMultiplier: 1.35,
    enemyBulletHitboxInset: 0.48,
    spawnIntervalMultiplier: 1.35,
    waveDuration: 21,
    bossHpMultiplier: 0.82,
    scoreMultiplier: 0.8,
  },
  normal: {
    label: "NORMAL",
    playerHp: 7,
    enemyHpMultiplier: 1,
    enemySpeedMultiplier: 1,
    enemyFireIntervalMultiplier: 1,
    enemyBulletHitboxInset: 0.2,
    spawnIntervalMultiplier: 1,
    waveDuration: 18,
    bossHpMultiplier: 1,
    scoreMultiplier: 1,
  },
  hard: {
    label: "DIFÍCIL",
    playerHp: 5,
    enemyHpMultiplier: 1.28,
    enemySpeedMultiplier: 1.18,
    enemyFireIntervalMultiplier: 0.72,
    enemyBulletHitboxInset: 0.12,
    spawnIntervalMultiplier: 0.72,
    waveDuration: 16,
    bossHpMultiplier: 1.3,
    scoreMultiplier: 1.35,
  },
};


export const HELICOPTERS = {
  v1: {
    label: "BLINDADO",
    description: "Más vida y placas que reducen el daño",
    maxHpBonus: 2,
    damageReduction: 0.25,
    speedMultiplier: 0.94,
    fireCooldownMultiplier: 1,
    hitboxBonus: 0,
  },
  v2: {
    label: "SIGILO",
    description: "Más rápido, dispara antes y es más difícil de golpear",
    maxHpBonus: 0,
    damageReduction: 0,
    speedMultiplier: 1.22,
    fireCooldownMultiplier: 0.72,
    hitboxBonus: 0.13,
  },
};


export const SHOP_ITEMS = {
  life: { price: 3 },
  explosive: { price: 5 },
  shield: { price: 6 },
  rapid: { price: 4 },
  homing: { price: 6 },
  ally: { price: 7 },
};


// Kamikaze: patrulla hasta acercarse, avisa (parpadeo) KAMIKAZE_TELEGRAPH
// segundos y se lanza en picado recto hacia donde estabas: no corrige, así
// que se esquiva moviéndose en el último momento.
export const KAMIKAZE_TRIGGER_DISTANCE = 430;
export const KAMIKAZE_TELEGRAPH = 0.5;
export const KAMIKAZE_DIVE_SPEED = 560;
export const KAMIKAZE_DAMAGE = 2;

// Escuadrón en V: cinco cazas que comparten ancla. Si caen todos antes de
// que la formación se disperse (ancla a SQUAD_DISPERSE_X del jugador),
// sueltan monedas extra.
export const SQUAD_SIZE = 5;
export const SQUAD_DISPERSE_X = 430;
export const SQUAD_BONUS_COINS = 5;
export const SQUAD_BONUS_SCORE = 800;

// Blindado: la placa frontal (GUNSHIP_ARMOR, misma geometría que se dibuja)
// repele los disparos normales. La cúpula roja del morro (punto débil, daño
// doble) queda por encima de la placa y en el borde de ataque, de modo que un
// disparo que llegue alto la toca antes que el casco. Quien pase por encima
// o por detrás daña con normalidad. Teledirigidos y explosivos ignoran toda
// la coraza.
export const GUNSHIP_WEAKPOINT = { offsetX: -0.3, offsetY: -0.38, radius: 0.18 };
export const GUNSHIP_ARMOR = { x1: -0.5, x2: -0.02, y1: -0.3, y2: 0.42 };

// Carga de disparo: mantener pulsado el disparo carga hasta CHARGE_TIME
// segundos; al soltar con al menos CHARGE_MIN sale un misil grande cuyo
// daño y onda expansiva escalan con la carga.
export const CHARGE_TIME = 1.15;
export const CHARGE_MIN = 0.35;
export const CHARGE_COOLDOWN = 0.42;

// Misiles teledirigidos: corrigen su rumbo hacia el enemigo más cercano
// con HOMING_TURN_RATE rad/s como máximo (se pueden ver venir).
export const HOMING_TURN_RATE = 4.2;
export const HOMING_SPEED = 620;
export const HOMING_PACK_SIZE = 8;

// Dron aliado: escolta al helicóptero durante la oleada siguiente a la
// compra y dispara al enemigo más cercano por su cuenta.
export const ALLY_OFFSET_X = -120;
export const ALLY_OFFSET_Y = -78;
export const ALLY_FIRE_INTERVAL = 0.34;
export const ALLY_BULLET_SPEED = 720;


// Combo: cada 4 bajas seguidas el multiplicador de puntos sube 1 (hasta x8).
// Se pierde al recibir daño o si pasan COMBO_TIMEOUT segundos sin matar.
export const COMBO_TIMEOUT = 3;
export const COMBO_KILLS_PER_STEP = 4;
export const MAX_COMBO_MULTIPLIER = 8;

// Esquiva de milagro: puntos extra si un proyectil enemigo pasa a menos de
// NEAR_MISS_RADIUS píxeles del helicóptero sin llegar a tocarlo.
export const NEAR_MISS_RADIUS = 90;
export const NEAR_MISS_POINTS = 30;

// Logros: se desbloquean una sola vez y se guardan junto a los récords.
export const ACHIEVEMENTS = {
  "primer-jefe": { label: "MATAJEFES", description: "Derriba tu primer acorazado" },
  cazadirigibles: { label: "CAZADIRIGIBLES", description: "Derriba el dirigible de globos" },
  intocable: { label: "INTOCABLE", description: "Completa una oleada sin recibir daño" },
  "cien-bajas": { label: "CENTENAR", description: "Acumula 100 bajas en total" },
  imparable: { label: "IMPARABLE", description: "Encadena 15 bajas seguidas" },
  esquivador: { label: "AL LÍMITE", description: "Acumula 25 esquivas de milagro" },
  veterano: { label: "VETERANO", description: "Alcanza la oleada 10" },
};


export const SHIELD_DURATION = 15;
export const SHIELD_RADIUS = 86;

export const CROPS = {
  backgrounds: [
    [743, 755, 248, 148],
    [1021, 754, 238, 149],
    [1288, 754, 234, 149],
  ],
  player: [
    [18, 47, 101, 99],
    [119, 47, 103, 99],
    [218, 47, 102, 99],
    [310, 47, 99, 99],
    [402, 47, 99, 99],
    [492, 47, 96, 99],
    [579, 47, 98, 99],
    [667, 47, 83, 99],
  ],
  face: [796, 49, 95, 101],
  missile: [519, 229, 140, 82],
  enemyHeli: [
    [18, 380, 105, 95],
    [118, 380, 106, 95],
    [216, 380, 101, 95],
    [311, 380, 103, 95],
    [407, 380, 103, 95],
  ],
  drone: [
    [533, 380, 83, 96],
    [615, 380, 84, 96],
    [696, 380, 81, 96],
    [772, 380, 81, 96],
    [849, 380, 80, 96],
    [925, 380, 82, 96],
  ],
  fighter: [
    [1033, 383, 116, 88],
    [1138, 383, 112, 88],
    [1238, 383, 108, 88],
    [1337, 383, 109, 88],
    [1437, 383, 82, 88],
  ],
  boss: [31, 543, 337, 166],
  explosion: [
    [397, 541, 67, 68],
    [467, 541, 67, 68],
    [538, 541, 68, 68],
    [611, 541, 68, 68],
    [683, 541, 69, 68],
    [754, 541, 69, 68],
    [824, 541, 69, 68],
    [893, 541, 68, 68],
    [397, 615, 68, 76],
    [467, 615, 68, 76],
    [538, 615, 69, 76],
    [610, 615, 69, 76],
    [682, 615, 70, 76],
    [753, 615, 70, 76],
    [824, 615, 70, 76],
    [893, 615, 69, 76],
  ],
  enemyBullet: [706, 943, 61, 67],
  playerBullet: [1057, 945, 76, 67],
  coin: [1245, 942, 90, 81],
  powerups: [
    [35, 942, 84, 80],
    [120, 942, 85, 80],
    [205, 942, 85, 80],
    [377, 942, 88, 80],
  ],
};

export const AIRSHIP_CROPS = {
  boss: [35, 65, 845, 825],
  balloons: [
    [925, 60, 260, 425],
    [1215, 60, 275, 425],
    [920, 515, 255, 425],
    [1215, 515, 275, 425],
  ],
};

export const MAX_PARTICLES = 400;
