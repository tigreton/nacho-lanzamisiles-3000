# Plan de ejecución — Operación Nacho

Plan de mejora derivado de la auditoría del proyecto (2026-10-10).
Objetivo: eliminar deuda técnica, reducir peso, mejorar experiencia de usuario
y dejar el repositorio en condiciones mantenibles, **sin cambiar la jugabilidad existente**
salvo en los puntos expresamente indicados.

Cada fase se puede entregar y verificar de forma independiente.
Dentro de cada fase las tareas están ordenadas por prioridad
(**P1** = imprescindible, **P2** = importante, **P3** = deseable).

> **Sistema de seguimiento:** el estado de cada tarea vive en
> `plans/estado-tareas.json` y el historial de decisiones en
> `plans/registro-ejecucion.md`. Se gestionan con
> `node plans/herramientas/tareas.js` (`proxima` → `iniciar` → ejecutar y
> verificar → `completar` con decisiones, archivos, verificación y commit).

---

## Fase 0 — Higiene del repositorio ⚡ (30 min)

Sin tocar código. Todo es reversible y de bajo riesgo.

| # | Prioridad | Tarea | Detalle |
|---|-----------|-------|---------|
| 0.1 | P1 | Crear `.gitignore` | Ignorar `.DS_Store`, `gui-test-screenshots/`, `Thumbs.db` |
| 0.2 | P1 | Quitar `.DS_Store` del índice | `git rm --cached .DS_Store` |
| 0.3 | P2 | Decidir qué hacer con `gui-test-screenshots/` | Borrarlo o dejarlo ignorado (no debe entrar al repo) |
| 0.4 | P2 | Commits atómicos a partir de ahora | Un commit por fase/tarea con mensaje descriptivo (no fechas sueltas) |
| 0.5 | P3 | Añadir `LICENSE` | Solo si se piensa publicar el código |
| 0.6 | P3 | Añadir favicon | Reutilizar un recorte 32×32 del helicóptero |

**Verificación:** `git status` limpio, la web sigue funcionando igual.

---

## Fase 1 — Limpieza de código muerto 🧹 (1 h)

Eliminar ~350 líneas que nunca se ejecutan. Buscar con grep antes de borrar
para confirmar que no hay usos nuevos.

| # | Prioridad | Tarea | Referencia actual |
|---|-----------|-------|-------------------|
| 1.1 | P1 | Borrar `drawAirship()` (~175 líneas) | `game.js:1603-1777`, nunca se llama |
| 1.2 | P1 | Borrar `drawBalloon()` (~140 líneas) | `game.js:1779-1919`, nunca se llama |
| 1.3 | P2 | Borrar `sprites.launcher` y `CROPS.launcher` | `game.js:130`, `game.js:513` — se recorta pero no se dibuja |
| 1.4 | P2 | Borrar `state.defeated` | `game.js:1031` — se incrementa, nunca se lee |
| 1.5 | P2 | Borrar `previousMode` | `game.js:206` — siempre vale `"playing"`; simplificar `togglePause` |
| 1.6 | P3 | Reducir `CROPS.missile` al frame usado (`[4]`) | `game.js:122-129`, solo se usa `missile[4]` en `game.js:2106` |
| 1.7 | P3 | Borrar campo `enemy.sprite` | `game.js:717` — se inicializa, nunca se lee |
| 1.8 | P3 | Borrar `powerups[3]` del crop | `game.js:175-181` — índice 3 nunca se dibuja |

**Verificación:** el juego arranca, todas las oleadas/jefes/tienda funcionan igual.
**Commit:** `refactor: eliminar código muerto (drawAirship, drawBalloon y campos sin uso)`

---

## Fase 2 — Assets y carga 📦 (2-3 h)

La mejora con mayor impacto percibido: peso y robustez de carga.

| # | Prioridad | Tarea | Detalle |
|---|-----------|-------|---------|
| 2.1 | P1 | Optimizar los 5 PNG (5,6 MB en total) | `pngquant --quality=70-90` (o conversión a WebP con fallback). Objetivo: < 1,5 MB totales |
| 2.2 | P1 | Self-host de las fuentes | Descargar `Black Ops One` e `Inter` a `assets/fonts/`, usar `@font-face` con `font-display: swap` en vez del `@import` de Google Fonts (`style.css:1`) |
| 2.3 | P1 | Esperar fuentes antes del HUD | `document.fonts.load('26px "Black Ops One"')` + `Inter` antes de dar por terminada la carga, para que el canvas nunca mida texto con la fuente de sustitución |
| 2.4 | P2 | Limpiar la lámina `juego-nacho.png` offline | Quitar el fondo ajedrezado una sola vez (GIMP/scripts), guardar PNG con transparencia real |
| 2.5 | P2 | Eliminar el quitafondos en runtime | Tras 2.4, borrar el flood-fill de `cutSprite` (`game.js:404-507`, ~100 líneas): `cutSprite` pasa a ser un recorte simple `drawImage` |
| 2.6 | P3 | Simplificar el README | Al desaparecer el quitafondos, la advertencia sobre abrir `index.html` directo se puede rebajar |

**Verificación:** carga en red lenta (throttle) visiblemente más rápida; HUD con la fuente correcta desde el primer frame; sprites sin fondo ajedrezado.
**Commit:** `perf: optimizar assets y fuentes locales (−4 MB de descarga)`

---

## Fase 3 — UX y accesibilidad 🎮 (2 h)

Cambios pequeños de código con gran mejora de experiencia.

| # | Prioridad | Tarea | Detalle |
|---|-----------|-------|---------|
| 3.1 | P1 | Mostrar el récord | En el menú y en la pantalla final. Clave de `localStorage` por dificultad (`operacion-nacho-record-easy/normal/hard`) |
| 3.2 | P1 | Autopausa al perder foco | `visibilitychange` + `blur` → si `mode === "playing"`, `togglePause()` |
| 3.3 | P1 | Espacio solo se bloquea en partida | En `game.js:2265-2271`, aplicar `preventDefault`/`stopImmediatePropagation` únicamente cuando `mode === "playing"`, para que los botones del menú/tienda respondan a Espacio |
| 3.4 | P2 | Lanzador para Windows | `JUGAR.bat` (usa `python` en vez de `python3`, abre `http://127.0.0.1:8080`) y README con instrucciones para macOS y Windows |
| 3.5 | P3 | Documentar `KeyJ` como disparo alternativo | En el `controls-card` del menú y en el README |
| 3.6 | P3 | Unificar duración de ráfaga | Tienda 10 s vs pickup 8 s (`game.js:1078`): decidir un valor y documentarlo |
| 3.7 | P3 | Renombrar `enemyFireMultiplier` | A `enemyFireIntervalMultiplier` (>1 = dispara menos) en las 3 dificultades y sus usos |

**Verificación:** cambiar de pestaña en mitad de una oleada pausa el juego; el récord aparece tras una partida récord; los botones se activan con Espacio.
**Commit:** `feat: récord por dificultad, autopausa y corrección de accesibilidad de Espacio`

---

## Fase 4 — Rendimiento 🚀 (2-3 h)

| # | Prioridad | Tarea | Detalle |
|---|-----------|-------|---------|
| 4.1 | P1 | Canvas adaptativo con DPR | Dimensionar el canvas al tamaño CSS × `devicePixelRatio` y escalar el contexto. Hoy el juego se escala hacia arriba desde 1200×675 en monitores grandes (borroso) |
| 4.2 | P2 | Pre-renderizar glows | Al preparar sprites, hornear el `shadowBlur` en un canvas offscreen (tamaño + margen) y dibujar ese canvas en el loop en lugar de glow en tiempo real |
| 4.3 | P3 | Limitar partículas | Tope duro al array `particles` (p. ej. 400) para evitar picos en oleadas densas + jefes |

**Verificación:** texto nítido en pantallas retina/grandes; FPS estable con oleada densa + escudo + explosiones (probar con el throttle de CPU de DevTools).
**Commit:** `perf: canvas DPR-adaptativo y glows pre-renderizados`

---

## Fase 5 — Arquitectura 🏗️ (medio día)

Solo cuando las fases 1-4 estén en main: refactor sin cambio de comportamiento.

| # | Prioridad | Tarea | Detalle |
|---|-----------|-------|---------|
| 5.1 | P1 | Extraer configuración | `src/config.js`: dificultades, helicópteros, tienda, crops, constantes de gameplay (hitboxes, velocidades, tiempos). Adiós a los números mágicos dispersos |
| 5.2 | P1 | Dividir `game.js` en módulos ES | Propuesta: `main.js`, `audio.js`, `input.js`, `entities/` (jugador, enemigos, jefes, pickups), `systems/` (colisiones, oleadas), `render.js`. El juego ya exige servidor local, así que los módulos no añaden ningún requisito |
| 5.3 | P2 | Migrar el HTML a los módulos | `<script type="module" src="src/main.js">` |
| 5.4 | P3 | Linter | `eslint` (o `standard`) con script npm básico, sin instalar dependencias de runtime |

**Verificación:** partida completa (oleada 1 → jefe oleada 4 → dirigible oleada 8, tienda, cambio de helicóptero) sin regresiones.
**Commit:** uno por módulo extraído.

---

## Fase 6 — Extras y publicación ✨ (a demanda)

Nada de esto es deuda; son ampliaciones opcionales.

| # | Prioridad | Tarea | Detalle |
|---|-----------|-------|---------|
| 6.1 | P2 | Música chiptune | Loop sencillo de osciladores WebAudio coherente con los `tone()` actuales + control de volumen |
| 6.2 | P2 | Deploy a GitHub Pages | El proyecto ya es 100% estático; solo falta activarlo |
| 6.3 | P3 | Soporte de gamepad | Gamepad API: stick = mover, botón A = disparar, Start = pausa |
| 6.4 | P3 | Metadatos og / card para compartir | `og:title`, `og:image` con una captura del juego |
| 6.5 | P3 | Pantalla de "cómo jugar" | Resumen de enemigos y powerups con sus sprites (reutiliza `drawMenuBackdrop`) |

---

## Resumen de dependencias

```
Fase 0 (repo)          ── independiente
Fase 1 (código muerto) ── independiente
Fase 2.4/2.5 (lámina limpia ↔ borrar cutSprite) ── van juntas
Fase 3 (UX)            ── mejor tras Fase 1 (menos código que tocar)
Fase 4 (rendimiento)   ── 4.2 depende de que los sprites ya estén limpios (Fase 2)
Fase 5 (arquitectura)  ── hacer SIEMPRE al final, sobre el código ya limpio
Fase 6 (extras)        ── a demanda, sin dependencias duras
```

## Criterio de verificación global (tras cada fase)

1. Partida completa en las 3 dificultades (al menos Fácil hasta oleada 5).
2. Jefe acorazado (oleada 4) y dirigible con globos (oleada 8).
3. Tienda: comprar los 4 objetos; vida llena deshabilita la compra.
4. Base aérea: aterrizar, cambiar de helicóptero y despegar.
5. Pausa/reanudar, silenciar sonido, récord guardado.
6. Sin errores en consola.
