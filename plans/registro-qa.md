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
