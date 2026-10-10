# Plan de verificación QA — Operación Nacho

Plan derivado del QA funcional del 2026-10-10 (partida real en navegador:
dificultad FÁCIL, ambos helicópteros, oleadas 1-4 con jefe, armerías,
base aérea, game over y récord). **Veredicto del QA: jugable, sin bugs
bloqueantes.** Este plan recoge lo que quedó pendiente: 3 hallazgos menores,
los flujos que no se pudieron verificar end-to-end y la infraestructura
mínima para repetir las pruebas.

Complementa a [plan-de-mejora.md](plan-de-mejora.md), no lo sustituye: las
mejoras ya planificadas allí (récord por dificultad 3.1, autopausa 3.2,
lanzador Windows 3.4…) **no se duplican** aquí.

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

## Qué el QA ya dio por bueno (no retestear salvo regresión)

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

Evidencias: `gui-test-screenshots/` (13 capturas + 2 vídeos, commit 5f8edd7).
Ojo: si la tarea 0.3 de plan-de-mejora.md borra esa carpeta del repo, las
evidencias siguen disponibles en el historial de git.

---

## Fase Q0 — Correcciones de hallazgos 🔧 (1 h)

Cambios pequeños de código detectados durante el QA. Ninguno afecta a la
jugabilidad base.

| # | Prioridad | Tarea | Detalle |
|---|-----------|-------|---------|
| Q0.1 | P1 | Armería: «N RESTANTES» aunque falten monedas | `updateShopUI` (`game.js:295-302`) comprueba `coins < price` antes que `explosiveAmmo > 0`: tras comprar misiles con el saldo exacto, el estado muestra «FALTAN MONEDAS» en vez de «8 RESTANTES». Reordenar las condiciones (el botón sigue deshabilitado si faltan monedas) |
| Q0.2 | P2 | HUD: mostrar todos los potenciadores activos | `game.js:1539-1548` solo pinta una etiqueta (EXPLOSIVOS > RÁFAGA > ESCUDO): con misiles en reserva nunca se ve la cuenta atrás de ráfaga/escudo. Pintar las tres (o rotar) |
| Q0.3 | P3 | Valorar 3 s de gracia en la oleada 1 | Evidencia débil (un piloto automático tosco murió 2× en oleada 1 de FÁCIL): subir el `fireTimer` inicial (`game.js:714`, hoy `rand(0.7, 2.2)`) a ≥ 3 s solo en `wave === 1`. Decidir con juego humano; descartable si se considera justo |

**Verificación:** tienda con misiles comprados y saldo 0 muestra «N RESTANTES»;
con ráfaga + misiles se ven ambas cuentas; partida normal sin cambios.
**Commit:** `fix: estado de armería con munición propia y HUD de potenciadores`

---

## Fase Q1 — Verificación end-to-end pendiente 🎯 (2-3 h)

Flujos que el QA solo pudo revisar en código (o parcialmente en vídeo).
Son tareas de **prueba**, no de código: se cierran con `--verificacion`
y evidencia (captura o vídeo).

| # | Prioridad | Tarea | Detalle |
|---|-----------|-------|---------|
| Q1.1 | P1 | Derribar al acorazado y cerrar el ciclo | Banner «¡JEFE DERRIBADO!», flash, armería a los 3,3 s si no quedan globos/cestas/góndolas (`game.js:1025-1044`, `1393-1406`) y oleada 5 normal tras CONTINUAR. El QA se quedó a ~20-25% de vida del jefe en 3 intentos (con BLINDADO + escudo + misiles es asequible) |
| Q1.2 | P1 | Dirigible de globos (oleada 8) | Lanza globos de 2 en 2 (`game.js:906-911`); globo derribado → cesta que corrige rumbo y detona a los 5 s (radio 118, 1 de daño, `game.js:810-864`); dirigible destruido → góndola que persigue 10 s con anillo de progreso y detona (radio 142, 2 de daño, `game.js:832-876`) |
| Q1.3 | P2 | Escudo reflector letal | El vídeo del QA muestra el rebote; falta confirmar que una bala reflejada (daño ×2, `game.js:1285-1310`) mata al enemigo que la disparó (`game.js:1320-1331`) |
| Q1.4 | P2 | NORMAL y DIFÍCIL hasta oleada 2 | El QA solo jugó FÁCIL: spawn ×1/×0.72, velocidad ×1/×1.18, hitbox de proyectil 0.2/0.12 frente a 0.48 (`game.js:35-72`). Mínimo: sobrevivir oleada 1 en ambas y notar la diferencia |
| Q1.5 | P3 | Táctil real en viewport estrecho | El QA usó puntero de escritorio: comprobar en ~400×800 que arrastrar mueve y dispara, que el canvas escala y que el hint «ARRASTRA PARA MOVER Y DISPARAR» (`index.html:173`) aparece |

**Verificación:** vídeo o capturas de cada flujo; sin errores visibles.
**Commit:** solo si alguna prueba destapa un bug (arreglarlo sería tarea nueva).

---

## Fase Q2 — Infraestructura de regresión 🧪 (1-2 h)

Para que la próxima ronda de QA cueste 15 minutos y no 2 horas.

| # | Prioridad | Tarea | Detalle |
|---|-----------|-------|---------|
| Q2.1 | P2 | Guion de pruebas reutilizable | `docs/guion-pruebas.md` con los 7 bloques del QA (menú, partida, pausa/sonido, armería, base aérea, jefe, game over), pasos concretos, criterios de éxito y matriz de cobertura e2e vs solo-código. Enlazar desde el README raíz |
| Q2.2 | P3 | Colector de errores para pruebas | `window.__erroresQA`: listeners de `error` y `unhandledrejection` que acumulan sin cambiar la jugabilidad; el checklist «sin errores en consola» pasa a consultarlo al final de la partida |
| Q2.3 | P3 | Re-pase del QA tras plan-de-mejora fases 1-2 | Esas fases borran `drawAirship`/`drawBalloon` (hoy sin llamadas) y simplifican `cutSprite`: repetir el vídeo del jefe y una pasada del guion Q2.1. Esperar a que estén completas |

**Verificación:** el guion se sigue de principio a fin sin ambigüedad; una
partida con el colector activo reporta 0 errores.
**Commit:** `docs: guion de pruebas reutilizable` / `feat: colector de errores para pruebas`

---

## Resumen de dependencias

```
Fase Q0 (correcciones)  ── independiente; mejor antes de Q1 (menos ruido al probar)
Q1.1 (derribar jefe)    ── independiente
Q1.2 (dirigible)        ── depende de Q1.1 (hay que superar la oleada 4 para llegar a la 8)
Q1.3-Q1.5               ── independientes
Fase Q2 (regresión)     ── Q2.1/Q2.2 independientes; Q2.3 requiere fases 1-2 de plan-de-mejora.md
```

## Criterio de verificación global (tras cada tarea de código)

1. Partida FÁCIL hasta oleada 2 sin errores visibles (mínimo).
2. Tienda: comprar cualquier objeto y ver el estado/textos correctos.
3. Si se tocó render de jefes: vídeo corto del acorazado (oleada 4).
4. `window.__erroresQA` (si Q2.2 está hecho) vacío al terminar.
