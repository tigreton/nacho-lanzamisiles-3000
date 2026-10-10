# Registro de ejecución — Operación Nacho

Diario cronológico de la ejecución del [plan de mejora](plan-de-mejora.md).
La **fuente de verdad** de los estados es `estado-tareas.json`; este archivo es
el historial legible de qué se hizo, qué se decidió y por qué.

## Ciclo de trabajo por tarea

1. `node plans/herramientas/tareas.js proxima` → siguiente tarea recomendada.
2. `node plans/herramientas/tareas.js iniciar <id>` → marca `en_curso`.
3. Ejecutar la tarea y verificar con la checklist final del plan.
4. `node plans/herramientas/tareas.js completar <id> --decisiones "..." --archivos "..." --verificacion "..." --commit "..."`
5. Commit git atómico de la tarea.

Estados: `pendiente` → `en_curso` → `completada` · salidas: `bloqueada`
(falta algo externo, con `--motivo`) y `descartada` (se decide no hacerla, con
`--motivo`). Una tarea bloqueada o descartada se puede reabrir con `reabrir`.

Notas intermedias sin cerrar la tarea: `nota <id> --texto "..."` (o `--decision`
si es una decisión tomada a mitad de camino).

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
### [2026-10-10 13:13] 0.1 — Crear .gitignore
- **Estado:** pendiente → en_curso

### [2026-10-10 13:15] 0.1 — Crear .gitignore
- **Estado:** en_curso → completada
- **Decisiones:**
  - Reglas: .DS_Store, Thumbs.db y gui-test-screenshots/ (evidencias QA ya preservadas en historial, commit 5f8edd7); verificado con git check-ignore --no-index
- **Archivos:** .gitignore
- **Verificación:** git check-ignore -v --no-index confirma que .DS_Store, Thumbs.db y gui-test-screenshots/ casan con las reglas; el juego no se toca

### [2026-10-10 13:15] 0.1 — Crear .gitignore
- **Estado:** sin cambio (completada)
- **Nota:** Commit: dde4243

### [2026-10-10 13:15] 0.2 — Quitar .DS_Store del índice de git
- **Estado:** pendiente → en_curso

### [2026-10-10 13:15] 0.2 — Quitar .DS_Store del índice de git
- **Estado:** en_curso → completada
- **Decisiones:**
  - git rm --cached: el artefacto de macOS se des-trackea pero no se borra del disco; .gitignore evita que vuelva a entrar
- **Archivos:** .DS_Store (índice)
- **Verificación:** ls .DS_Store OK en disco; git ls-files sin referencias; git status limpio tras commit
- **Commit:** 31bcd2e

### [2026-10-10 13:16] 0.3 — Resolver gui-test-screenshots/
- **Estado:** pendiente → en_curso

### [2026-10-10 13:16] 0.3 — Resolver gui-test-screenshots/
- **Estado:** en_curso → completada
- **Decisiones:**
  - Dejarla ignorada, sin borrar: git rm -r --cached conserva los 15 archivos en disco para consulta local; las evidencias siguen en el historial del commit 5f8edd7 que plan-qa.md cita expresamente; .gitignore impide que futuras capturas engorden el repo
- **Archivos:** gui-test-screenshots/ (índice)
- **Verificación:** ls confirma 15 archivos en disco; git check-ignore confirma la carpeta ignorada; git log 5f8edd7 conserva las evidencias
- **Commit:** 0e39669

### [2026-10-10 13:16] 0.4 — Adoptar commits atómicos descriptivos
- **Estado:** pendiente → en_curso

### [2026-10-10 13:16] 0.4 — Adoptar commits atómicos descriptivos
- **Estado:** en_curso → completada
- **Decisiones:**
  - Práctica adoptada desde esta fase: un commit atómico por tarea con mensaje descriptivo convencional (chore/feat/refactor/perf/docs), prohibidos los mensajes con fechas sueltas como el 76a6e05 original; la regla ya está escrita en plans/README.md y en el ciclo de trabajo de registro-ejecucion.md
- **Archivos:** plans/README.md (ya documentado)
- **Verificación:** git log --oneline muestra dde4243, 31bcd2e y 0e39669, uno por tarea 0.1-0.3, todos con mensaje descriptivo

### [2026-10-10 13:17] 0.6 — Añadir favicon
- **Estado:** pendiente → en_curso

### [2026-10-10 13:19] 0.6 — Añadir favicon
- **Estado:** en_curso → completada
- **Decisiones:**
  - Fuente: helicopter-player-v1.png (helicóptero por defecto), recorte del bounding box (99,102,1402,883) con 8% de margen; se genera assets/favicon.ico multi-tamaño (16/32/48) y assets/favicon-32.png, ambos ~7 KB combinados; verificado con análisis visual del 32px ampliado
- **Archivos:** assets/favicon.ico, assets/favicon-32.png, index.html
- **Verificación:** servidor local: index 200, favicon.ico 200 image/x-icon, favicon-32.png 200 image/png; los <link> presentes en el HTML; los 9 assets del juego siguen sirviendo y tracked

### [2026-10-10 13:19] 0.6 — Añadir favicon
- **Estado:** sin cambio (completada)
- **Nota:** Commit: 8068e47

### [2026-10-10 13:19] 0.5 — Añadir LICENSE
- **Estado:** pendiente → bloqueada
- **Motivo:** Requiere decisión del propietario: si el código se va a publicar y con qué licencia (MIT, GPL, propietaria...). Si no se publicará, descartar esta tarea.

### [2026-10-10 13:23] 1.1 — Eliminar drawAirship() (~175 líneas)
- **Estado:** pendiente → en_curso

### [2026-10-10 13:23] 1.1 — Eliminar drawAirship() (~175 líneas)
- **Estado:** en_curso → completada
- **Decisiones:**
  - Borrado por rango exacto 1603-1778 tras verificar con grep que solo existía la definición; drawAirshipSprite y drawAirshipGondola (que sí se usan) quedan intactas
- **Archivos:** game.js
- **Verificación:** node --check sin errores; grep confirma 0 referencias a drawAirship; 176 líneas menos (2373→2197); verificación en navegador pendiente de acumular al final de la fase
- **Commit:** 3b20a50

### [2026-10-10 13:23] 1.2 — Eliminar drawBalloon() (~140 líneas)
- **Estado:** pendiente → en_curso

### [2026-10-10 13:23] 1.2 — Eliminar drawBalloon() (~140 líneas)
- **Estado:** en_curso → completada
- **Decisiones:**
  - Borrado por rango 1603-1744 (función + línea en blanco); drawBalloonSprite y drawBalloonBasket, que sí se dibujan en el loop, quedan intactas
- **Archivos:** game.js
- **Verificación:** node --check OK; grep 0 referencias; 2197→2055 líneas
- **Commit:** 6d9b5f7

### [2026-10-10 13:23] 1.3 — Eliminar sprites.launcher y CROPS.launcher
- **Estado:** pendiente → en_curso

### [2026-10-10 13:24] 1.3 — Eliminar sprites.launcher y CROPS.launcher
- **Estado:** en_curso → completada
- **Decisiones:**
  - Grep previo: sprites.launcher solo se asignaba en prepareSprites, nunca se dibujaba; la única coincidencia restante de 'launcher' es un comentario del flood-fill sin relación
- **Archivos:** game.js
- **Verificación:** node --check OK; grep -i launcher deja solo el comentario ajeno
- **Commit:** 267275f

### [2026-10-10 13:24] 1.4 — Eliminar state.defeated
- **Estado:** pendiente → en_curso

### [2026-10-10 13:24] 1.4 — Eliminar state.defeated
- **Estado:** en_curso → completada
- **Decisiones:**
  - Grep previo: solo init (defeated: 0) e incremento (state.defeated += 1); ninguna lectura en HUD, récord ni tienda
- **Archivos:** game.js
- **Verificación:** node --check OK; grep 0 referencias a defeated
- **Commit:** cc1c839

### [2026-10-10 13:24] 1.5 — Eliminar previousMode
- **Estado:** pendiente → en_curso

### [2026-10-10 13:24] 1.5 — Eliminar previousMode
- **Estado:** en_curso → completada
- **Decisiones:**
  - Verificado con grep que setMode('paused') solo ocurre en togglePause tras asignar previousMode='playing', así que reanudar a 'playing' es equivalente; la declaración inicial ('menu') era inalcanzable como valor de reanudación
- **Archivos:** game.js
- **Verificación:** node --check OK; grep 0 referencias; togglePause queda con setMode literal
- **Commit:** 8413a81

### [2026-10-10 13:24] 1.6 — Reducir CROPS.missile al frame usado
- **Estado:** pendiente → en_curso

### [2026-10-10 13:25] 1.6 — Reducir CROPS.missile al frame usado
- **Estado:** en_curso → completada
- **Decisiones:**
  - De array de 6 frames a crop único [519,229,140,82] (el antiguo índice 4); sprites.missile deja de ser array y el único uso (misil explosivo) se actualiza de sprites.missile[4] a sprites.missile
- **Archivos:** game.js
- **Verificación:** node --check OK; grep muestra exactamente definición, preparación y uso, sin índices
- **Commit:** f9b2481

### [2026-10-10 13:25] 1.7 — Eliminar campo enemy.sprite
- **Estado:** pendiente → en_curso

### [2026-10-10 13:25] 1.7 — Eliminar campo enemy.sprite
- **Estado:** en_curso → completada
- **Decisiones:**
  - Grep previo: ninguna lectura de .sprite en todo game.js; el dibujado de enemigos usa sprites.enemyHeli/drone/fighter por tipo
- **Archivos:** game.js
- **Verificación:** node --check OK; grep sin coincidencias de lecturas
- **Commit:** a6383ee

### [2026-10-10 13:25] 1.8 — Eliminar powerups[3] del crop
- **Estado:** pendiente → en_curso

### [2026-10-10 13:25] 1.8 — Eliminar powerups[3] del crop
- **Estado:** en_curso → completada
- **Decisiones:**
  - El mapa de dibujado era {rapid:0, shield:1, heart:2, star:4} con fallback a 4: el índice 3 no existía; se borra el crop [292,942,82,80] y star pasa a ocupar el índice 3, con el fallback actualizado al mismo sprite estrella
- **Archivos:** game.js
- **Verificación:** node --check OK; los 4 tipos de pickup siguen mapeando al mismo sprite que antes
- **Commit:** 6700cb8

### [2026-10-10 13:54] 1.6 — Reducir CROPS.missile al frame usado
- **Estado:** sin cambio (completada)
- **Nota:** Verificación e2e acumulada de fase 1: arranque ×9 (2 orígenes, caché fría y caliente), menú, combate 10+ min en normal y fácil, oleadas 1→4 con jefe ACORAZADO, pausa/reanudación ×2, 0 errores de consola (hook window.error activo). Equivalencia del recorte demostrada por construcción: sprites.missile = cutSprite([519,229,140,82]) es exactamente el antiguo sprites.missile[4]. Pendiente de ver visualmente el misil tras compra en tienda (flujo e2e ya trackado en plan-qa). Evidencias: gui-test-screenshots/f1_*.png

### [2026-10-10 13:54] 1.8 — Eliminar powerups[3] del crop
- **Estado:** sin cambio (completada)
- **Nota:** Verificación e2e: pickups flotando y recogidos en partida real (5 monedas coleccionadas en oleada 3-4, collectPickup ejecutado sin errores). Equivalencia por construcción: los tipos rapid/shield/heart/star mapean a los mismos rects [35/120/205/377,942,...] que antes; el índice 3 eliminado no estaba referenciado por ningún tipo. Capturas en gui-test-screenshots/f1_*.png

