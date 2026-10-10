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

// Blindado: la placa frontal (GUNSHIP_ARMOR, misma zona que se ve en la
// lámina IA) repele los disparos normales. La cúpula roja superior
// (punto débil, daño doble) queda por encima de la placa, de modo que un
// disparo que llegue alto la toca antes que el casco. Quien pase por encima
// o por detrás daña con normalidad. Teledirigidos y explosivos ignoran toda
// la coraza.
export const GUNSHIP_WEAKPOINT = { offsetX: -0.1, offsetY: -0.4, radius: 0.18 };
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


// Modos de juego: la campaña clásica, la supervivencia sin fin y el modo
// solo jefes, que se desbloquea con el logro del primer dirigible.
export const GAME_MODES = {
  campana: { label: "CAMPAÑA", hint: "Jefes cada 4 oleadas" },
  supervivencia: { label: "SUPERVIVENCIA", hint: "Oleadas sin fin · récord propio" },
  jefes: {
    label: "SOLO JEFES",
    hint: "Jefes seguidos con armería entre medias",
    unlockAchievement: "cazadirigibles",
    lockedHint: "Derriba el dirigible para desbloquearlo",
  },
};


// Jefes: rotan cada 4 oleadas en campaña (oleada 4 acorazado, 8 dirigible,
// 12 fortaleza y vuelta a empezar) y en cadena en el modo solo jefes.
// La fortaleza no dispara: las torretas ponen la potencia de fuego y el
// casco aguanta hasta que caen todas (cada torreta derribada lo castiga).
export const BOSSES = {
  boss: {
    label: "ACORAZADO",
    announce: "¡ACORAZADO ENEMIGO!",
    barLabel: "ACORAZADO 3000",
    defeatedText: "¡JEFE DERRIBADO!",
    score: 5000,
    w: 350,
    h: 182,
    vx: 68,
    yRatio: 0.5,
    bobAmp: 145,
    bobFreq: 0.9,
    spawnX: 260,
    targetX: 220,
    fireTimer: 1.1,
    toneFreq: 92,
    toneSlide: -28,
  },
  airship: {
    label: "DIRIGIBLE",
    announce: "¡DIRIGIBLE DE GLOBOS!",
    barLabel: "DIRIGIBLE DE GLOBOS",
    defeatedText: "¡DIRIGIBLE DERRIBADO!",
    score: 6500,
    w: 350,
    h: 342,
    vx: 52,
    yRatio: 0.32,
    bobAmp: 92,
    bobFreq: 0.65,
    spawnX: 230,
    targetX: 285,
    fireTimer: 1.8,
    toneFreq: 170,
    toneSlide: 80,
  },
  fortress: {
    label: "FORTALEZA",
    announce: "¡FORTALEZA VOLADORA!",
    barLabel: "FORTALEZA VOLADORA",
    defeatedText: "¡FORTALEZA DERRIBADA!",
    score: 7000,
    w: 440,
    h: 264,
    vx: 44,
    yRatio: 0.5,
    bobAmp: 62,
    bobFreq: 0.5,
    spawnX: 320,
    targetX: 310,
    fireTimer: Infinity,
    toneFreq: 58,
    toneSlide: -20,
  },
};

// Anclajes de las torretas sobre el casco de la fortaleza (offsets lógicos
// desde su centro). "spread" dispara abanicos; "aimed" dispara a puntería.
export const FORTRESS_TURRETS = [
  { offsetX: -170, offsetY: -74, kind: "spread" },
  { offsetX: -170, offsetY: 74, kind: "aimed" },
  { offsetX: 55, offsetY: -74, kind: "aimed" },
  { offsetX: 55, offsetY: 74, kind: "spread" },
];

// Al 50% de vida el jefe cambia de patrón y se vuelve más agresivo.
export const BOSS_PHASE2_RATIO = 0.5;


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
  "caza-fortalezas": { label: "CAZAFORTALEZAS", description: "Derriba la fortaleza voladora" },
  intocable: { label: "INTOCABLE", description: "Completa una oleada sin recibir daño" },
  "cien-bajas": { label: "CENTENAR", description: "Acumula 100 bajas en total" },
  imparable: { label: "IMPARABLE", description: "Encadena 15 bajas seguidas" },
  esquivador: { label: "AL LÍMITE", description: "Acumula 25 esquivas de milagro" },
  veterano: { label: "VETERANO", description: "Alcanza la oleada 10" },
  resistente: { label: "A PRUEBA DE TODO", description: "Alcanza la oleada 12 en supervivencia" },
};


export const SHIELD_DURATION = 15;
export const SHIELD_RADIUS = 86;

export const CROPS = {
  backgrounds: [[743, 755, 248, 148], [1021, 754, 238, 149], [1288, 754, 234, 149]],
  player: [[20, 52, 101, 87], [121, 53, 98, 85], [219, 46, 93, 92], [312, 53, 91, 85], [403, 48, 90, 90], [493, 56, 89, 82], [582, 58, 87, 82], [669, 62, 81, 80]],
  face: [804, 64, 80, 84],
  missile: [524, 239, 137, 54],
  enemyHeli: [[20, 391, 103, 80], [123, 391, 98, 81], [221, 379, 96, 93], [317, 380, 95, 93], [412, 391, 100, 82]],
  drone: [[541, 388, 80, 86], [621, 393, 78, 80], [699, 396, 73, 78], [772, 384, 74, 90], [846, 399, 76, 76], [922, 401, 75, 74]],
  fighter: [[1031, 405, 112, 61], [1143, 405, 100, 61], [1243, 408, 95, 58], [1338, 405, 97, 63], [1435, 408, 85, 60]],
  boss: [38, 541, 325, 169],
  explosion: [[404, 545, 62, 55], [466, 546, 69, 53], [535, 545, 71, 54], [606, 544, 71, 56], [677, 543, 71, 57], [748, 546, 71, 53], [819, 545, 67, 54], [886, 545, 61, 55], [402, 622, 63, 55], [465, 625, 68, 52], [533, 624, 72, 53], [605, 628, 69, 48], [674, 628, 78, 48], [752, 630, 71, 46], [823, 631, 70, 46], [893, 634, 62, 43]],
  enemyBullet: [713, 957, 46, 45],
  playerBullet: [1055, 959, 66, 44],
  coin: [1254, 951, 57, 62],
  powerups: [[45, 945, 62, 63], [131, 942, 60, 67], [214, 946, 65, 63], [386, 946, 59, 59]],
};

export const AIRSHIP_CROPS = {
  boss: [46, 71, 824, 817],
  balloons: [[939, 75, 236, 394], [1237, 75, 236, 395], [930, 528, 236, 395], [1228, 528, 236, 397]],
};

export const MAX_PARTICLES = 400;
