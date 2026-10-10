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

