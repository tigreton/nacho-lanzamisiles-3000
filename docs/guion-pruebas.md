# Guion de pruebas — Operación Nacho

Lista de pasos reutilizable para pasar el QA funcional del juego en una
sesión de navegador. Deriva del QA del 2026-10-10 y de la re-validación
del build modular (`src/`) del mismo día; es la lista de pasos de la tarea
Q2. de [plans/plan-qa.md](../plans/plan-qa.md).

**Cómo usarlo:** sirve el juego (`JUGAR.bat` / `python -m http.server`),
ábrelo en un navegador de escritorio y recorre los bloques en orden.
Cada bloque tiene pasos concretos y criterios de éxito; anota cualquier
desviación con captura. Tiempo estimado de la pasada completa: 20-30 min
(jugador humano), ~15 min si se saltan los bloques marcados como
*solo-código*.

## Notas de entorno (importantes para sesiones automatizadas)

- **Autopause:** al perder el foco o la visibilidad, la partida se pausa
  (`src/input.js`). Es comportamiento deseado; en pruebas automatizadas
  hay que reanudar (botón CONTINUAR) tras cada cambio de ventana.
- **Navegadores embebidos sin foco** (como el navegador integrado de un
  IDE) pueden congelar el bucle `requestAnimationFrame` entre comandos:
  el canvas no avanza aunque la pestaña esté «visible». Síntoma: HUD y
  banner congelados con 0 puntos. Remedio: jugar en una ventana de
  navegador normal con el foco, o bombeaar frames (p. ej. grabando vídeo
  de la pestaña) durante las pausas del harness.
- El primer clic tras una recarga puede no registrar: reintentar y
  verificar el efecto (`aria-pressed`, cambio de pantalla) antes de seguir.

## B1 — Menú y arranque

1. Cargar la página: la pantalla «Cargando el arsenal…» desaparece y el
   menú muestra sprites (jefe de fondo, helicópteros).
2. Cambiar dificultad entre FÁCIL / NORMAL / DIFÍCIL: el botón queda
   marcado (`aria-pressed="true"`), la línea de récord cambia de texto
   («RÉCORD X: N» / «AÚN SIN RÉCORD EN X»).
3. Cambiar helicóptero (BLINDADO / SIGILO): marcado y vista previa.
4. «CÓMO JUGAR» muestra el manual y VOLVER regresa.
5. JUGAR arranca la partida: banner «<DIFICULTAD> · OLEADA 1», HUD
   completo (blindaje, oleada, puntos, monedas).

**Pasa si:** sin errores en consola (`window.__erroresQA` vacío si está
el colector), todos los estados visibles cambian al clic y el HUD arranca
con el blindaje de la dificultad (FÁCIL+BLINDADO = 11 segmentos,
NORMAL = 9, DIFÍCIL = 7).

## B2 — Partida (oleada 1)

1. Mover con WASD/flechas y con el puntero (arrastrar con ratón = mover +
   autodisparo). En viewport estrecho (⩽760 px) o pantalla táctil aparece la
   botonera: botón de disparo mantener/soltar = disparar y cargar, botón de
   habilidad = activarla y recargar con velo circular; en ese modo arrastrar
   solo mueve.
2. Disparar con ESPACIO/J. Los enemigos entran por la derecha, disparan
   proyectiles evitables y estallan al morir (monedas y mejoras al botín).
3. Recoger una moneda: contador de monedas +1.
4. Esperar a que termine el tiempo de oleada (FÁCIL 21 s, NORMAL 18 s,
   DIFÍCIL 16 s): aparece la armería y las monedas sueltas se cobran solas.

**Pasa si:** el combate responde, la puntuación sube (FÁCIL aplica ×0.8)
y la armería abre sola al agotarse la oleada.

## B3 — Pausa y sonido

1. P: pantalla PAUSA; botón CONTINUAR o P/Escape reanuda.
2. Botón PAUSA/SEGUIR de la cabecera alterna igual.
3. SONIDO ON/OFF silencia efectos; MÚSICA ON/OFF la música.
4. Cambiar de ventana en mitad de oleada: autopausa al volver el foco.

**Pasa si:** nada de lo anterior altera puntuación, oleada ni tiempos, y
la pausa congela el juego de verdad (enemigos quietos).

## B4 — Armería

1. Tras la oleada 1: resumen «OLEADA 1 SUPERADA · Dificultad X», monedas
   y botón «CONTINUAR · OLEADA 2».
2. Sin saldo suficiente: todo «FALTAN MONEDAS» y deshabilitado.
3. Comprar MISIL EXPLOSIVO (5★): estado «8 RESTANTES» aunque luego falten
   monedas (nunca «FALTAN MONEDAS» mientras quede munición).
4. Comprar ESCUDO (6★) y RÁFAGA (4★) si alcanza: estados «DISPONIBLE».
5. VIDA con la vida llena: «COMPLETO» y deshabilitado.
6. CONTINUAR: banner de oleada nueva y fondo nuevo cada 2 oleadas.

**Pasa si:** los estados coinciden con monedas/munición/vida en todo
momento y CONTINUAR avanza la oleada sin restos de la anterior.

## B5 — Base aérea (oleadas pares no-jefe) · *solo-código en la pasada rápida*

1. En oleada 2, a partir de ~6 s: plataforma «ATERRIZA» cruza la pantalla.
2. Aterrizar encima: pantalla CAMBIO DE HELICÓPTERO con ambas previews
   cargadas (sin iconos rotos).
3. Cambiar a SIGILO y DESPEGAR: sprite nuevo y barra 9→7 segmentos (FÁCIL:
   11→9). La plataforma se despide sola a los ~14 s sin bloquear la armería.

**Pasa si:** el cambio aplica stats y sprite en seco, y no bloquea el
flujo de oleada aunque no se aterrice.

## B6 — Jefe acorazado (oleada 4) · *solo-código en la pasada rápida*

1. En la oleada 4: banner «¡ACORAZADO ENEMIGO!» y barra «ACORAZADO 3000».
2. El jefe dispara andanadas en abanico; con ESCUDO REFLECTOR activo las
   balas rebotan (destello azul) y al impactar dañan ×2 al enemigo tocado.
3. Derribarlo: banner «¡JEFE DERRIBADO!», botín (8 monedas + estrella) y
   armería a los ~3,3 s; CONTINUAR lleva a la oleada 5 normal.

**Pasa si:** el ciclo jefe→botín→armería→oleada 5 se cierra sin restos
(globos/cestas/góndolas solo en la oleada 8).

## B7 — Game over y récord

1. Perder toda la vida: «MISIÓN TERMINADA», resumen con dificultad,
   puntuación, récord y monedas.
2. Si la puntuación supera el récord de ESA dificultad: «¡NUEVO RÉCORD!»
   (y solo entonces).
3. VOLVER A JUGAR: partida nueva limpia (oleada 1, saldo 0, sin restos).
4. En el menú, la línea de récord muestra el valor guardado por dificultad.

**Pasa si:** el récord se guarda bajo la clave de su dificultad
(`operacion-nacho-record-<facil|normal|dificil>` en localStorage) y el
reinicio está limpio.

## Matriz de cobertura

| Bloque | e2e en navegador | Verificación alternativa |
|---|---|---|
| B1 Menú | Sí (rápido) | — |
| B2 Partida | Sí (rápido) | — |
| B3 Pausa/sonido | Sí (rápido) | — |
| B4 Armería | Sí (necesita monedas) | Estados por DOM |
| B5 Base aérea | Requiere llegar a oleada 2 | Código: `src/entities/airbase.js` |
| B6 Jefe | Requiere superar 3 oleadas | Código: `src/entities/enemies.js` |
| B7 Game over | Sí (dejarse matar) | localStorage |

Escala del 1 (más rápido) a 3 (más largo): una pasada de humo ejecuta
B1-B4 + B7; la pasada completa añade B5 y B6.
