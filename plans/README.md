# Runbook — Plan de mejora de Operación Nacho

Guía rápida para retomar el trabajo en cualquier momento. Lectura: 2 minutos.

## Mapa de archivos

| Archivo | Qué es |
|---|---|
| [plan-de-mejora.md](plan-de-mejora.md) | El plan: 7 fases, tareas priorizadas (P1/P2/P3) y checklist de verificación |
| [estado-tareas.json](estado-tareas.json) | **Fuente de verdad**: estado de las 39 tareas, dependencias y decisiones |
| [registro-ejecucion.md](registro-ejecucion.md) | Diario cronológico: qué se hizo, qué se decidió y por qué |
| [plan-qa.md](plan-qa.md) | Plan de verificación derivado del QA del 2026-10-10: correcciones de hallazgos, flujos pendientes de verificar e2e e infraestructura de regresión (fases Q0-Q2, 11 tareas) |
| [estado-qa.json](estado-qa.json) | Estado de las 11 tareas del plan QA |
| [registro-qa.md](registro-qa.md) | Diario cronológico del plan QA |
| [herramientas/tareas.js](herramientas/tareas.js) | CLI que gestiona todo (Node, sin dependencias) |
| `../src/` | El juego en módulos ES: `main.js` (orquestación), `config.js`, `state.js` (bolsa `G`), `utils.js`, `records.js`, `audio.js`, `sprites.js`, `render.js`, `input.js`, `entities/`, `systems/` |
| `../index.html`, `../style.css`, `../assets/` | Página, estilos y WebP/fuentes locales |
| `../package.json`, `../eslint.config.mjs` | Linter: `npm run lint` |

Hay **dos planes independientes**. Sin flags, el CLI trabaja sobre el plan de
mejora; para el plan QA hay que pasarle sus rutas:

```bash
node plans/herramientas/tareas.js proxima --estado plans/estado-qa.json --registro plans/registro-qa.md
```

## Cómo seguir trabajando (5 pasos)

```bash
node plans/herramientas/tareas.js proxima     # 1. ¿qué toca?
node plans/herramientas/tareas.js iniciar 0.1 # 2. marcar en curso
#                                              3. ejecutar la tarea
#                                              4. verificar con la checklist de abajo
node plans/herramientas/tareas.js completar 0.1 \
  --decisiones "por qué se hizo así" \
  --archivos "game.js" \
  --verificacion "qué se probó" \
  --commit abc1234                            # 5. cerrar + commit atómico
```

## Comandos del CLI

| Comando | Uso |
|---|---|
| `lista [fase]` | Ver tareas y estados de una fase (o de todas) |
| `proxima` | Siguiente tarea recomendada (respeta dependencias y prioridad) |
| `iniciar <id>` | Marcar en curso (bloquea si faltan dependencias, salvo `--forzar`) |
| `completar <id>` | Cerrar. **Obligatorio** `--verificacion`; opcional `--decisiones "a;;b"`, `--archivos "a,b"`, `--commit` |
| `bloquear <id> --motivo "..."` | No se puede avanzar por algo externo |
| `descartar <id> --motivo "..."` | Se decide no hacerla |
| `reabrir <id>` | Volver a `pendiente` |
| `nota <id> --texto "..."` | Apuntar algo a mitad de tarea (`--decision` si es una decisión) |
| `estadisticas` | Progreso total y barras por fase |

Los cambios de estado **escriben solos** una entrada con fecha en `registro-ejecucion.md`.

## Reglas del sistema

- Estados: `pendiente` → `en_curso` → `completada` (o `bloqueada` / `descartada` / `reabrir`).
- Las dependencias se imponen al iniciar; la **fase 5 no arranca** hasta cerrar las fases 0-4.
- Nada se completa sin `--verificacion`. Un commit atómico por tarea, mensaje descriptivo (no fechas).
- Las líneas de código citadas (p. ej. `game.js:404`) se refieren al estado pre-plan; si el archivo cambió, buscar por nombre de función.

## Checklist de verificación tras cada tarea

1. Partida completa sin errores en consola (mínimo hasta oleada 5).
2. Jefe acorazado (oleada 4) y dirigible con globos (oleada 8).
3. Tienda: comprar los 4 objetos; vida llena deshabilita la compra.
4. Base aérea: aterrizar, cambiar helicóptero, despegar.
5. Pausa/reanudar, sonido, récord guardado.

## Probar el juego

```bash
python -m http.server 8080     # o python3 en macOS/Linux — desde la raíz del repo
# abrir http://127.0.0.1:8080  (en macOS: doble clic en JUGAR.command)
```

Controles: WASD/flechas mover · Espacio (o J) disparar · P/Escape pausa · arrastrar en táctil.
