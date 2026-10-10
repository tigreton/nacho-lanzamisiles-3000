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
