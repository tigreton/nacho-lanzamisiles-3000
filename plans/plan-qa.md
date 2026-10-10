# Plan de verificación QA — Operación Nacho

Plan derivado del QA funcional del 2026-10-10 (partida real en navegador:
dificultad FÁCIL, ambos helicópteros, oleadas 1-4 con jefe, armerías,
base aérea, game over y récord). **Veredicto del QA: jugable, sin bugs
bloqueantes.**

> **Actualización (2026-10-10, post-refactor):** desde aquel QA se ejecutaron
> las fases 1-5 de [plan-de-mejora.md](plan-de-mejora.md) (48 commits): el
> juego pasó de `game.js` monolítico a **módulos ES en `src/`**, con assets
> optimizados, fuentes self-hosted, autopausa, récord por dificultad y canvas
> con DPR. Este plan ya está reescrito sobre esa estructura: las referencias
> de código apuntan a `src/` (buscar por nombre de función si volvieran a
> moverse) y **los resultados originales del QA dan por bueno el build
> monolítico**, así que hay que re-validarlos sobre el build modular (Q2.3).

Complementa a plan-de-mejora.md, no lo sustituye: las mejoras ya planificadas
allí (y ejecutadas: récord por dificultad, autopausa, lanzador Windows…)
no se duplican aquí.

Cada fase se puede entregar y verificar de forma independiente.
Dentro de cada fase las tareas están ordenadas por prioridad
(**P1** = imprescindible, **P2** = importante, **P3** = deseable).

> **Sistema de seguimiento:** el estado de cada tarea vive en
> `plans/estado-qa.json` y el historial en `plans/registro-qa.md`. Al ser un
> plan aparte, las rutas se pasan explícitas al CLI (los flags van **después**
> del comando):
> `node plans/herramientas/tareas.js proxima --estado plans/estado-qa.json --registro plans/registro-qa.md`
> (→ `iniciar` → ejecutar y verificar → `completar`).

---

## Qué el QA ya dio por bueno (build monolítico, pre-refactor)

⚠️ **Caducidad:** esta lista se verificó sobre `game.js` monolítico (commit
5f8edd7). Tras la refactorización a módulos (fases 1-5 del plan de mejora) hay
que re-validarla en el build actual — eso es exactamente la tarea Q2.3. No
retestear a ciegas: usarla como checklist de regresión.

- Menú: carga de sprites, selección de dificultad y helicóptero (`aria-pressed`), previews.
- Controles: puntero (arrastrar = mover + autodisparo), teclado WASD y `P`/`Escape`.
- HUD (blindaje, oleada, puntos, monedas) y banner de oleada.
- Combate: misiles, daño, explosiones, drops y recogida; puntuación FÁCIL ×0.8 correcta.
- Pausa (`P`, `Escape`, botón SEGUIR) y sonido ON/OFF.
- Armería: apertura al fin de oleada, estados deshabilitados, compras
  (misil 5★, escudo 6★, ráfaga 4★), CONTINUAR avanza oleada.
- Base aérea: aterrizaje, cambio de helicóptero (sprite y barra 9→11 segmentos),
  despegue; y su auto-despedida a los 14 s sin bloquear la armería.
- Jefe acorazado: entrada, barra «ACORAZADO 3000», andanadas en abanico y
  rebote del escudo (vídeo `gui-test-screenshots/qa-jefe-combate.webm`).
- Game over: «¡NUEVO RÉCORD!» solo cuando toca (localStorage), resumen y
  reinicio limpio.

Evidencias: `gui-test-screenshots/` quedó fuera del índice al ejecutarse la
tarea 0.3 del plan de mejora (commit 0e39669); las evidencias viven en el
historial de git (commit 5f8edd7) y la copia local sigue en el disco.

---

## Fase Q0 — Correcciones de hallazgos 🔧 (1 h)

Hallazgos del QA original. **Revisados sobre el build modular: los tres
siguen presentes**, solo que en módulos de `src/`.

| # | Prioridad | Tarea | Detalle |
|---|-----------|-------|---------|
| Q0.1 | P1 | Armería: «N RESTANTES» aunque falten monedas | `updateShopUI` (`src/systems/shop.js:22-27`) comprueba `coins < price` antes que `explosiveAmmo > 0`: tras comprar misiles con el saldo exacto, el estado muestra «FALTAN MONEDAS» en vez de «8 RESTANTES». Reordenar las condiciones (el botón sigue deshabilitado si faltan monedas) |
| Q0.2 | P2 | HUD: mostrar todos los potenciadores activos | `drawHud` (`src/render.js:127-136`) solo pinta una etiqueta (EXPLOSIVOS > RÁFAGA > ESCUDO): con misiles en reserva nunca se ve la cuenta atrás de ráfaga/escudo. Pintar las tres (o rotar) |
| Q0.3 | P3 | Valorar 3 s de gracia en la oleada 1 | `spawnEnemy` (`src/entities/enemies.js:28`, `fireTimer: rand(0.7, 2.2) * enemyFireIntervalMultiplier`): subir a ≥ 3 s solo en `wave === 1`. Evidencia débil (piloto automático tosco murió 2× en oleada 1 de FÁCIL); decidir con juego humano, descartable si se considera justo |

**Verificación:** tienda con misiles comprados y saldo 0 muestra «N RESTANTES»;
con ráfaga + misiles se ven ambas cuentas; partida normal sin cambios.
**Commit:** `fix: estado de armería con munición propia y HUD de potenciadores`

---

## Fase Q1 — Verificación end-to-end pendiente 🎯 (2-3 h)

Flujos que el QA original solo pudo revisar en código (o parcialmente en
vídeo) y que el refactor a módulos hace más necesario validar. Son tareas de
**prueba**, no de código: se cierran con `--verificacion` y evidencia.

> Nota práctica: hay **autopause** al perder foco/visibilidad
> (`src/input.js:45-50`); para pruebas automatizadas o con la pestaña en
> segundo plano, mantener el juego en primer plano o reanudar manualmente.

| # | Prioridad | Tarea | Detalle |
|---|-----------|-------|---------|
| Q1.1 | P1 | Derribar al acorazado y cerrar el ciclo | Banner «¡JEFE DERRIBADO!» y armería a los 3,3 s (`killEnemy`, `src/entities/enemies.js:305-312`; disparo de la tienda en `src/systems/waves.js:66`) y oleada 5 normal tras CONTINUAR. El QA original se quedó a ~20-25% de vida del jefe en 3 intentos (con BLINDADO + escudo + misiles es asequible) |
| Q1.2 | P1 | Dirigible de globos (oleada 8) | Lanza globos de 2 en 2 (`shootEnemy`, `src/entities/enemies.js`); globo derribado → cesta que corrige rumbo y detona a los 5 s (radio 118, 1 de daño, `enemies.js:179`); dirigible destruido → góndola que persigue 10 s con anillo de progreso y detona (radio 142, 2 de daño, `enemies.js:192`) |
| Q1.3 | P2 | Escudo reflector letal | El rebote está visto en vídeo (`src/entities/bullets.js:52-58`); falta confirmar que una bala reflejada (daño ×2) mata al enemigo que la disparó (`bullets.js:74` en adelante) |
| Q1.4 | P2 | NORMAL y DIFÍCIL hasta oleada 2 | El QA solo jugó FÁCIL: spawn ×1/×0.72, velocidad ×1/×1.18, hitbox de proyectil 0.2/0.12 frente a 0.48 (`src/config.js:12-25`). Mínimo: sobrevivir oleada 1 en ambas y notar la diferencia. Verificar también el récord por dificultad recién añadido |
| Q1.5 | P3 | Táctil real en viewport estrecho | Arrastre en ~400×800: mover y disparar (`src/input.js:52-63`), canvas escalado (ahora con DPR, fase 4 del plan de mejora) y hint «ARRASTRA PARA MOVER Y DISPARAR» (`index.html:177`) |

**Verificación:** vídeo o capturas de cada flujo; sin errores visibles.
**Commit:** solo si alguna prueba destapa un bug (arreglarlo sería tarea nueva).

---

## Fase Q2 — Infraestructura y regresión del refactor 🧪

Para que la próxima ronda de QA cueste 15 minutos y no 2 horas, y para
cerrar el refactor con evidencias.

| # | Prioridad | Tarea | Detalle |
|---|-----------|-------|---------|
| Q2.3 | P1 | Regresión completa del build modular | La condición original (fases 1-2 del plan de mejora completas) está largamente superada: **fases 1-5 completas** y el juego es otro binario (módulos ES, assets re-optimizados, cutSprite simplificado, DPR). Re-pasar entera la checklist «Qué el QA ya dio por bueno» + fases Q0/Q1 ya cerradas, con vídeo del jefe y capturas. Es también la evidencia que el plan de mejora exige para dar por buena su fase 5 sin regresiones |
| Q2.1 | P2 | Guion de pruebas reutilizable | `docs/guion-pruebas.md` con los 7 bloques del QA (menú, partida, pausa/sonido, armería, base aérea, jefe, game over), pasos concretos, criterios de éxito y matriz de cobertura e2e vs solo-código. Enlazar desde el README raíz. (Hacerlo antes de Q2.3 lo convierte en su lista de pasos) |
| Q2.2 | P3 | Colector de errores para pruebas | `window.__erroresQA`: listeners de `error` y `unhandledrejection` que acumulan sin cambiar la jugabilidad; el checklist «sin errores en consola» pasa a consultarlo al final de la partida |

**Verificación:** el guion se sigue de principio a fin sin ambigüedad; una
partida con el colector activo reporta 0 errores; la checklist de regresión
Q2.3 queda documentada con evidencias nuevas.
**Commit:** `docs: guion de pruebas reutilizable` / `feat: colector de errores para pruebas`

---

## Resumen de dependencias

```
Fase Q0 (correcciones)  ── independiente; mejor antes de Q1 (menos ruido al probar)
Q1.1 (derribar jefe)    ── independiente
Q1.2 (dirigible)        ── depende de Q1.1 (hay que superar la oleada 4 para llegar a la 8)
Q1.3-Q1.5               ── independientes
Q2.1 (guion)            ── independiente; hacerlo primero convierte Q2.3 en seguir pasos
Q2.3 (regresión)        ── depende de Q2.1; su condición externa (fases 1-5 de plan-de-mejora) YA está cumplida
Q2.2 (colector)         ── independiente; útil antes de Q2.3
```

## Criterio de verificación global (tras cada tarea de código)

1. Partida FÁCIL hasta oleada 2 sin errores visibles (mínimo), con la pestaña
   en primer plano (hay autopausa).
2. Tienda: comprar cualquier objeto y ver el estado/textos correctos.
3. Si se tocó render de jefes: vídeo corto del acorazado (oleada 4).
4. `window.__erroresQA` (si Q2.2 está hecho) vacío al terminar.
