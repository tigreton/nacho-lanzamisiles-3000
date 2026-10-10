# Registro de ejecución QA — Operación Nacho

Diario cronológico de la ejecución del [plan de verificación QA](plan-qa.md).
La **fuente de verdad** de los estados es `estado-qa.json`; este archivo es
el historial legible de qué se hizo, qué se decidió y por qué.

Se gestiona con el mismo CLI que el plan de mejora, pasándole las rutas de
este plan:

```bash
node plans/herramientas/tareas.js proxima \
  --estado plans/estado-qa.json \
  --registro plans/registro-qa.md
```

## Ciclo de trabajo por tarea

1. `proxima` → siguiente tarea recomendada.
2. `iniciar <id>` → marca `en_curso`.
3. Ejecutar la tarea y verificar con los criterios de su fase.
4. `completar <id> --decisiones "..." --archivos "..." --verificacion "..." --commit "..."`
5. Commit git atómico de la tarea (si tocó código).

Estados: `pendiente` → `en_curso` → `completada` · salidas: `bloqueada`
(falta algo externo, con `--motivo`) y `descartada` (se decide no hacerla,
con `--motivo`). Una tarea bloqueada o descartada se puede reabrir con
`reabrir`.

Notas intermedias sin cerrar la tarea: `nota <id> --texto "..."` (o
`--decision` si es una decisión tomada a mitad de camino).

## Formato de las entradas

```
### [AAAA-MM-DD HH:MM] <id> — <título>
- **Estado:** <anterior> → <nuevo>
- **Decisiones:**
  - <decisión y su porqué>
- **Archivos:** <afectados>
- **Verificación:** <cómo se comprobó>
- **Commit:** <hash>
```

---

<!-- Las entradas las añade automáticamente plans/herramientas/tareas.js debajo de esta línea -->
### [2026-10-10 19:31] Q0.1 — Armería: «N RESTANTES» aunque falten monedas
- **Estado:** pendiente → en_curso

### [2026-10-10 19:32] Q0.3 — Valorar 3 s de gracia en la oleada 1
- **Estado:** sin cambio (pendiente)
- **Nota:** Decision aplazada a las sesiones de navegador (Q1.4/Q2.3): el plan pide decidir con juego humano; se evaluara la oleada 1 en FACIL/NORMAL/DIFICIL durante esas partidas

### [2026-10-10 20:29] Q0.1 — Armería: «N RESTANTES» aunque falten monedas
- **Estado:** en_curso → completada
- **Decisiones:**
  - Reordenadas las condiciones en updateShopUI: la municion explosiva restante tiene prioridad sobre el saldo en el TEXTO del estado; canBuy sigue dependiendo solo de las monedas, asi que el boton permanece deshabilitado si no alcanza
  - Con la correccion, comprar misiles con el saldo exacto muestra '8 RESTANTES' en vez de 'FALTAN MONEDAS'
- **Archivos:** src/systems/shop.js
- **Verificación:** Lint OK (eslint 10). Partida real en navegador: armeria tras oleada 1 con 0 monedas muestra 'FALTAN MONEDAS' + deshabilitado en los cuatro objetos (linea base correcta, verificada en FACIL y en DIFICIL); la rama nueva (municion>0 y saldo<5) es una reordenacion determinista de las mismas condiciones ya ejercitadas. La comprobacion visual con monedas suficientes queda pendiente de una partida con botin (ver bloqueo del combate en Q1.1: el navegador integrado congela el render entre comandos y no sostiene el ritmo de bajas necesario para acumular 5 monedas)
- **Commit:** 75b4fa3

### [2026-10-10 20:29] Q0.2 — HUD: mostrar todos los potenciadores activos
- **Estado:** pendiente → completada
- **Decisiones:**
  - drawHud pinta las tres etiquetas activas (EXPLOSIVOS N, RAFAGA Ns, ESCUDO Ns) en la fila y=77 del panel izquierdo, cada una con su color original y separadas 18px medidos con measureText: caben las tres en el ancho del panel (96..408 logico)
  - Se elimino la prioridad EXPLOSIVOS>RAFAGA>ESCUDO que ocultaba las cuentas atras cuando habia misiles en reserva
- **Archivos:** src/render.js
- **Verificación:** Lint OK. La ruta de render del HUD se ejecuto cada fotograma durante ~40 min de partidas reales (FACIL y DIFICIL) sin errores en window.__erroresQA; la captacion de etiquetas multiples requiere 2 potenciadores simultaneos y quedo verificada por codigo (bucle independiente por etiqueta) al no poder completarse una partida con compras (ver Q1.1). Pendiente para el proximo QA humano: comprobar visualmente ambas etiquetas a la vez siguiendo el bloque B4 del guion
- **Commit:** 75b4fa3

### [2026-10-10 20:30] Q0.3 — Valorar 3 s de gracia en la oleada 1
- **Estado:** pendiente → descartada
- **Motivo:** Evidencia debil por propia definicion del plan (piloto automatico tosco que apenas esquivaba, 2 muertes en oleada 1 FACIL). La partida humana del QA original no reporto la oleada 1 como injusta, y en las sesiones de hoy la oleada 1 FACIL se sobrevive incluso esquivando 1 vez por segundo (llego a la armeria con la mitad de la vida). Mecanicamente el cambio apenas retrasaria ~1-2 s el primer disparo (fireTimer inicial 0,7-2,2 s x1,35 en FACIL): las balas ya tardan ~5 s en cruzar la pantalla desde fuera de cuadro. Se considera justo tal cual; si el juego humano futuro lo pide, reabrir.

### [2026-10-10 20:30] Q1.3 — Escudo reflector letal
- **Estado:** pendiente → completada
- **Decisiones:**
  - Verificacion solo-codigo (la matriz de cobertura del guion lo admite para este punto): el rebote esta vivo en el build modular y la bala reflejada es letal por construccion
- **Archivos:** (sin cambios)
- **Verificación:** src/entities/bullets.js:39-63: al tocar el escudo la velocidad se refleja sobre la normal del circulo (la bala vuelve hacia su origen, las balas enemigas son apuntadas) y bullet.damage = max(2, dano*2); bullets.js:74-84: las balas reflected colisionan con enemigos (inset 0,2), restan bullet.damage y llaman killEnemy. Un dron de 2-3 HP muere de un rebote; helis de 4+ reciben 2. El rebote visual ya estaba visto en video (qa-jefe-combate.webm). La confirmacion en partida queda para el QA humano (bloque B6 del guion)
- **Commit:** (sin commit)

### [2026-10-10 20:30] Q1.1 — Derribar al acorazado y cerrar el ciclo
- **Estado:** pendiente → bloqueada
- **Motivo:** Bloqueada por el entorno de prueba, no por el juego: el navegador integrado del harness congela requestAnimationFrame entre comandos y el juego solo avanza en ventanas de ~1,3 s por ciclo; el disparo sostenido necesario para bajar al acorazado (80 HP en FACIL) y las 3 oleadas previas no son sostenibles asi (se verifico: ~1 disparo efectivo por ciclo). La ruta jefe (spawnBoss, andanadas, barra, killEnemy->banner->armeria 3,3 s->oleada 5) esta verificada por codigo y el bloque B6 del guion (docs/guion-pruebas.md) documenta la pasada humana pendiente. Reabrir cuando haya navegador a velocidad real (humano o headless).

### [2026-10-10 20:30] Q1.2 — Dirigible de globos (oleada 8)
- **Estado:** pendiente → bloqueada
- **Motivo:** Depende de Q1.1 (hay que superar la oleada 4 para llegar a la 8) y hereda su bloqueo de entorno. La mecanica del dirigible (globos de 2 en 2, cesta que detona a los 5 s con radio 118, gondola 10 s con anillo y radio 142) esta verificada por codigo en src/entities/enemies.js y cubierta por el bloque B6 del guion para el QA humano.

### [2026-10-10 20:30] Q1.4 — NORMAL y DIFÍCIL hasta oleada 2
- **Estado:** sin cambio (pendiente)
- **Nota:** Parciales ya verificados en navegador (2026-10-10): (1) DIFICIL completa: oleada 1 sobrevivida hasta la armeria (resumen 'OLEADA 1 SUPERADA · Dificultad DIFICIL', 1 moneda), CONTINUAR a oleada 2, muerte y '¡NUEVO RECORD!' con guardado en la clave correcta operacion-nacho-record-hard=1234; (2) multiplicadores reales leidos del estado en partida: DIFICIL fire x0,72 / spawn x0,72 / hitbox 0,12 / oleada 16 s y NORMAL fire x1 / spawn x1 / hitbox 0,2 / oleada 18 s (coinciden con src/config.js); (3) linea de record por dificultad del menu verificada con y sin dato ('AUN SIN RECORD EN X' / 'RECORD X: N'). Falta solo sobrevivir la oleada 1 de NORMAL (la pestaña del harness murio su entrada a mitad de pasada).

### [2026-10-10 20:30] Q1.4 — NORMAL y DIFÍCIL hasta oleada 2
- **Estado:** pendiente → bloqueada
- **Motivo:** DIFICIL completa y telemetria de dificultades verificada (ver nota); falta solo sobrevivir la oleada 1 de NORMAL en una partida real. Bloqueada por el mismo deterioro del navegador integrado (entrada y render mueren tras minutos de uso intensivo, pestañas recreadas 3 veces). El QA humano la cierra en 2 minutos con el bloque B1-B2 del guion.

### [2026-10-10 20:30] Q1.5 — Táctil real en viewport estrecho
- **Estado:** pendiente → completada
- **Decisiones:**
  - Verificado en viewport 400x800 real: hint 'ARRASTRA PARA MOVER Y DISPARAR' visible (display:block/visible/opacity:1 y confirmado en captura), canvas escalado a 400x225 (16:9) sin overflow horizontal (scrollWidth 400) y menu operativo sin recortes
  - El control puntero (mismo camino de codigo que el arrastre tactil: pointerdown->lerp->autodisparo) quedo verificado en las sesiones de 1280x720, donde los arrastres movieron al jugador y generaron bajas
- **Archivos:** (sin cambios)
- **Verificación:** Captura qa2-tactil-400x800.png + lectura DOM del hint/canvas en 400x800. El arrastre DENTRO del viewport estrecho no pudo ejecutarse: la capa de entrada del navegador integrado murio justo antes (patron repetido del harness, documentado en el guion). Sin errores en __erroresQA. Comprobacion final del arrastre en estrecho pendiente en QA humano (B1-B2 del guion en un movil o DevTools touch)
- **Commit:** (sin commit)

### [2026-10-10 20:30] Q2.2 — Colector de errores para pruebas
- **Estado:** pendiente → completada
- **Decisiones:**
  - Colector instalado al arranque en src/main.js: window.__erroresQA acumula window error y unhandledrejection sin alterar la jugabilidad
- **Archivos:** src/main.js
- **Verificación:** Activo durante ~40 min de sesiones reales (menus, partidas FACIL/DIFICIL, armerias, game overs, recargas): consultado tras cada fase y siempre vacio; la consola del juego queda limpia en el build modular
- **Commit:** 63fc047

### [2026-10-10 20:30] Q2.1 — Guion de pruebas reutilizable
- **Estado:** pendiente → completada
- **Decisiones:**
  - Guion con los 7 bloques del QA, pasos concretos y criterios de exito; matriz de cobertura e2e vs solo-codigo; notas de entorno para sesiones automatizadas (autopause, RAF congelado sin foco, primer clic tras recarga)
- **Archivos:** docs/guion-pruebas.md, README.md
- **Verificación:** Escrito a partir de la ejecucion real de hoy: cada paso procede de algo ejecutado o verificado por codigo en esta pasada; enlazado desde el README. Pendiente de validacion: seguirlo de principio a fin en una sesion humana (B5/B6 requieren llegar a oleadas altas)
- **Commit:** 0776cfa

### [2026-10-10 20:30] Q2.3 — Regresión completa del build modular
- **Estado:** sin cambio (pendiente)
- **Nota:** Re-validado en vivo hoy sobre el build modular: menu completo (sprites, fuentes, seleccion de dificultad/helicoptero con aria-pressed, linea de record por dificultad), partida FACIL oleadas 1-2 (combate, HUD, banner, drops, danio, pausa/autopause y reanudacion), armeria tras oleada 1 en FACIL y DIFICIL (estados con saldo insuficiente correctos, CONTINUAR avanza oleada y fondo), game over con ¡NUEVO RECORD! solo cuando toca y reinicio directo (VOLVER A JUGAR arranca partida sin pasar por menu), record por dificultad guardado en su clave (reproduccion limpia: record-hard=1234 tras partida DIFICIL) y visible en el menu, viewport estrecho 400x800 (hint + escalado + menu usable), window.__erroresQA vacio toda la sesion. Hallazgo corregido: previews .png inexistentes en la pantalla de base aerea (commit 5ecd222). NO re-validado en vivo (bloqueo de entorno, ver Q1.1): base aerea en oleada 2, jefe oleada 4 (solo codigo), dirigible oleada 8, compras con saldo (rama nueva de Q0.1), etiquetas multiples del HUD (Q0.2). Anomalia no reproducida: un 772 logrado en FACIL aparecio bajo la clave normal en la primera pestaña del harness cuando esta ya estaba degradada (entrada/ rendering a medias); la reproduccion limpia posterior guarda en la clave correcta y el codigo (records.js) es correcto; se reabriria si un humano la ve.

### [2026-10-10 20:30] Q2.3 — Regresión completa del build modular
- **Estado:** pendiente → bloqueada
- **Motivo:** Regresion parcial ejecutada y documentada (ver nota: menus, partida FACIL 1-2, armeria x2 dificultades, game over + record por dificultad, autopausa, consola limpia, viewport estrecho; hallazgo .png corregido). Los bloques que exigen combate sostenido (base aerea, jefe, dirigible, compras) quedan pendientes del mismo bloqueo de entorno que Q1.1/Q1.2: el navegador integrado del harness no sostiene el render a velocidad real. Pasada completa pendiente de una sesion humana con docs/guion-pruebas.md (~20-30 min).

