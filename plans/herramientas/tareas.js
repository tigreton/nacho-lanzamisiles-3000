#!/usr/bin/env node
/**
 * Sistema de ejecución del plan de mejora de Operación Nacho.
 *
 * Fuente de verdad: plans/estado-tareas.json
 * Diario cronológico:  plans/registro-ejecucion.md
 *
 * Uso:
 *   node plans/herramientas/tareas.js lista [fase]
 *   node plans/herramientas/tareas.js proxima
 *   node plans/herramientas/tareas.js iniciar <id> [--forzar]
 *   node plans/herramientas/tareas.js completar <id> [opciones]
 *   node plans/herramientas/tareas.js bloquear <id> --motivo "..."
 *   node plans/herramientas/tareas.js descartar <id> --motivo "..."
 *   node plans/herramientas/tareas.js reabrir <id> --motivo "..."
 *   node plans/herramientas/tareas.js nota <id> --texto "..." [--decision]
 *   node plans/herramientas/tareas.js estadisticas
 *
 * Opciones de "completar":
 *   --decisiones "a;;b"   decisiones tomadas (separadas por ;;)
 *   --archivos "a,b"      archivos creados o modificados
 *   --verificacion "..."  cómo se verificó la tarea
 *   --commit "abc1234"    hash del commit
 *   --forzar              ignora dependencias sin satisfacer
 *
 * Los listas aceptan \n para varias líneas. Todo queda registrado en el diario.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const PLAN_DIR = path.join(__dirname, "..");
const ESTADO_DEFECTO = path.join(PLAN_DIR, "estado-tareas.json");
const REGISTRO_DEFECTO = path.join(PLAN_DIR, "registro-ejecucion.md");

const ESTADOS_TERMINALES = new Set(["completada", "descartada"]);
const ORDEN_PRIORIDAD = { P1: 1, P2: 2, P3: 3 };
const ICONOS = {
  pendiente: "○",
  en_curso: "►",
  completada: "✔",
  bloqueada: "⊘",
  descartada: "✗",
};

// ---------- argumentos ----------

function analizarArgs(argv) {
  const [comando, ...resto] = argv;
  const opts = { _: [] };
  for (let i = 0; i < resto.length; i += 1) {
    const parte = resto[i];
    if (parte.startsWith("--")) {
      const clave = parte.slice(2);
      const valor = resto[i + 1];
      if (valor === undefined || valor.startsWith("--")) {
        opts[clave] = true;
      } else {
        opts[clave] = valor;
        i += 1;
      }
    } else {
      opts._.push(parte);
    }
  }
  return { comando, opts };
}

// ---------- persistencia ----------

function cargar(ruta) {
  try {
    return JSON.parse(fs.readFileSync(ruta, "utf8"));
  } catch (error) {
    console.error(`No se pudo leer ${ruta}: ${error.message}`);
    process.exit(1);
  }
}

function calcularEstadisticas(tareas) {
  const resumen = { pendiente: 0, en_curso: 0, completada: 0, bloqueada: 0, descartada: 0 };
  for (const tarea of tareas) resumen[tarea.estado] += 1;
  return resumen;
}

function guardar(ruta, estado) {
  estado.meta.ultimaActualizacion = marcaTemporal();
  estado.tareas.sort((a, b) => a.fase - b.fase || ORDEN_PRIORIDAD[a.prioridad] - ORDEN_PRIORIDAD[b.prioridad] || a.id.localeCompare(b.id, "es", { numeric: true }));
  fs.writeFileSync(ruta, JSON.stringify(estado, null, 2) + "\n", "utf8");
}

function añadirAlRegistro(ruta, bloque) {
  fs.appendFileSync(ruta, bloque.trimStart() + "\n", "utf8");
}

function marcaTemporal() {
  const ahora = new Date();
  const dia = ahora.toISOString().slice(0, 10);
  const hora = `${String(ahora.getHours()).padStart(2, "0")}:${String(ahora.getMinutes()).padStart(2, "0")}`;
  return `${dia} ${hora}`;
}

// ---------- lógica de dependencias ----------

function buscarTarea(estado, id) {
  const tarea = estado.tareas.find((t) => t.id === id);
  if (!tarea) {
    console.error(`No existe la tarea ${id}. Usa "lista" para ver los ids.`);
    process.exit(1);
  }
  return tarea;
}

function razonesBloqueo(estado, tarea) {
  const razones = [];
  for (const idDep of tarea.dependencias || []) {
    const dep = estado.tareas.find((t) => t.id === idDep);
    if (!dep) razones.push(`Dependencia desconocida: ${idDep}`);
    else if (!ESTADOS_TERMINALES.has(dep.estado)) razones.push(`Depende de ${idDep} (${dep.estado}): ${dep.titulo}`);
  }
  if (tarea.regla === "fases-0-a-4") {
    const pendientes = estado.tareas.filter((t) => t.fase <= 4 && !ESTADOS_TERMINALES.has(t.estado));
    if (pendientes.length > 0) {
      razones.push(`Regla fases-0-a-4: aún hay ${pendientes.length} tareas sin cerrar en fases 0-4 (p. ej. ${pendientes[0].id})`);
    }
  }
  return razones;
}

// ---------- entrada de diario ----------

function lista(valor) {
  if (!valor) return "";
  return valor
    .split(";;")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => `\n  - ${item.replace(/\\n/g, "\n    ")}`)
    .join("");
}

function escribirEntrada(rutaRegistro, tarea, estadoAnterior, cambios) {
  const lineas = [`### [${marcaTemporal()}] ${tarea.id} — ${tarea.titulo}`];
  const cambioEstado = estadoAnterior === tarea.estado ? `sin cambio (${tarea.estado})` : `${estadoAnterior} → ${tarea.estado}`;
  lineas.push(`- **Estado:** ${cambioEstado}`);
  if (cambios.decisiones) {
    const texto = Array.isArray(cambios.decisiones) ? cambios.decisiones.join(";;") : cambios.decisiones;
    lineas.push(`- **Decisiones:**${lista(texto)}`);
  }
  if (cambios.archivos) lineas.push(`- **Archivos:** ${Array.isArray(cambios.archivos) ? cambios.archivos.join(", ") : cambios.archivos}`);
  if (cambios.verificacion) lineas.push(`- **Verificación:** ${cambios.verificacion}`);
  if (cambios.commit) lineas.push(`- **Commit:** ${cambios.commit}`);
  if (cambios.motivo) lineas.push(`- **Motivo:** ${cambios.motivo}`);
  if (cambios.nota) lineas.push(`- **Nota:** ${cambios.nota}`);
  añadirAlRegistro(rutaRegistro, lineas.join("\n") + "\n");
}

// ---------- comandos ----------

function cmdLista(estado, opts) {
  const fase = opts._[0] !== undefined ? Number(opts._[0]) : undefined;
  const tareas = fase === undefined ? estado.tareas : estado.tareas.filter((t) => t.fase === fase);
  if (tareas.length === 0) {
    console.log(`No hay tareas en la fase ${fase}.`);
    return;
  }
  console.log("ID   FASE  PRI  ESTADO      TAREA");
  console.log("---- ----- ---- ----------- ---------------------------------------------");
  for (const t of tareas) {
    const id = t.id.padEnd(5);
    const faseTxt = String(t.fase).padEnd(5);
    const pri = t.prioridad.padEnd(4);
    const est = `${ICONOS[t.estado] || "?"} ${t.estado}`.padEnd(12);
    console.log(`${id}${faseTxt}${pri}${est}${t.titulo}`);
  }
  const resumen = calcularEstadisticas(tareas);
  console.log(`\n${tareas.length} tareas · ${resumen.completada} completadas · ${resumen.en_curso} en curso · ${resumen.bloqueada} bloqueadas · ${resumen.descartada} descartadas · ${resumen.pendiente} pendientes`);
}

function cmdProxima(estado) {
  const candidatas = estado.tareas
    .filter((t) => t.estado === "pendiente")
    .sort((a, b) => a.fase - b.fase || ORDEN_PRIORIDAD[a.prioridad] - ORDEN_PRIORIDAD[b.prioridad] || a.id.localeCompare(b.id, "es", { numeric: true }));
  if (candidatas.length === 0) {
    console.log("No quedan tareas pendientes. 🎉");
    return;
  }
  const desbloqueadas = candidatas.filter((t) => razonesBloqueo(estado, t).length === 0);
  if (desbloqueadas.length === 0) {
    console.log("Todas las tareas pendientes están bloqueadas:");
    for (const t of candidatas.slice(0, 5)) {
      console.log(`  ${t.id} ${t.titulo}`);
      for (const razon of razonesBloqueo(estado, t)) console.log(`      ↳ ${razon}`);
    }
    return;
  }
  console.log(`Siguiente tarea recomendada:\n  ${desbloqueadas[0].id} [${desbloqueadas[0].prioridad}] ${desbloqueadas[0].titulo}\n  ${desbloqueadas[0].detalle}`);
  if (desbloqueadas.length > 1) {
    console.log("\nTambién desbloqueadas:");
    for (const t of desbloqueadas.slice(1, 6)) console.log(`  ${t.id} [${t.prioridad}] ${t.titulo}`);
  }
}

function cmdCambiarEstado(estado, opts, nuevoEstado, rutaRegistro, camposExtra = {}) {
  const id = opts._[0];
  if (!id) {
    console.error("Falta el id de la tarea.");
    process.exit(1);
  }
  const tarea = buscarTarea(estado, id);
  const estadoAnterior = tarea.estado;

  if (nuevoEstado === "en_curso" && estadoAnterior !== "pendiente" && estadoAnterior !== "bloqueada") {
    console.error(`La tarea ${id} está en estado ${estadoAnterior}; solo puede iniciarse desde pendiente o bloqueada.`);
    process.exit(1);
  }
  if (nuevoEstado !== "en_curso" && estadoAnterior === nuevoEstado) {
    console.error(`La tarea ${id} ya está en estado ${nuevoEstado}.`);
    process.exit(1);
  }

  if (nuevoEstado === "en_curso" && !opts.forzar) {
    const razones = razonesBloqueo(estado, tarea);
    if (razones.length > 0) {
      console.error(`La tarea ${id} está bloqueada:`);
      for (const razon of razones) console.error(`  ↳ ${razon}`);
      console.error("Resuelve las dependencias o usa --forzar si sabes lo que haces.");
      process.exit(1);
    }
  }
  if ((nuevoEstado === "bloqueada" || nuevoEstado === "descartada") && !opts.motivo) {
    console.error(`Para ${nuevoEstado === "bloqueada" ? "bloquear" : "descartar"} hace falta --motivo "..."`);
    process.exit(1);
  }

  tarea.estado = nuevoEstado;
  tarea.actualizada = marcaTemporal();
  if (camposExtra.decisiones) tarea.decisiones = [...(tarea.decisiones || []), ...camposExtra.decisiones];
  if (camposExtra.notas) tarea.notas = [...(tarea.notas || []), ...camposExtra.notas];
  if (camposExtra.archivos) tarea.archivos = [...(tarea.archivos || []), ...camposExtra.archivos];
  if (camposExtra.verificacion) tarea.verificacion = camposExtra.verificacion;
  if (camposExtra.commit) tarea.commit = camposExtra.commit;

  escribirEntrada(rutaRegistro, tarea, estadoAnterior, {
    ...camposExtra,
    motivo: opts.motivo,
  });
  return { tarea, estadoAnterior };
}

// ---------- principal ----------

function main() {
  const { comando, opts } = analizarArgs(process.argv.slice(2));
  const rutaEstado = opts.estado || ESTADO_DEFECTO;
  const rutaRegistro = opts.registro || REGISTRO_DEFECTO;
  const estado = cargar(rutaEstado);

  switch (comando) {
    case "lista":
      cmdLista(estado, opts);
      break;
    case "proxima":
      cmdProxima(estado);
      break;
    case "iniciar": {
      const { tarea } = cmdCambiarEstado(estado, opts, "en_curso", rutaRegistro);
      guardar(rutaEstado, estado);
      console.log(`► ${tarea.id} ${tarea.titulo} — en curso.`);
      break;
    }
    case "completar": {
      if (!opts.verificacion) {
        console.error('Para completar hace falta --verificacion "..." (cómo comprobaste que funciona).');
        process.exit(1);
      }
      const campos = {
        decisiones: (opts.decisiones || "").split(";;").map((s) => s.trim()).filter(Boolean),
        archivos: (opts.archivos || "").split(",").map((s) => s.trim()).filter(Boolean),
        verificacion: opts.verificacion,
        commit: opts.commit,
      };
      const { tarea } = cmdCambiarEstado(estado, opts, "completada", rutaRegistro, campos);
      guardar(rutaEstado, estado);
      const resumen = calcularEstadisticas(estado.tareas);
      console.log(`✔ ${tarea.id} ${tarea.titulo} — completada. (${resumen.completada}/${estado.tareas.length})`);
      break;
    }
    case "bloquear":
    case "descartar": {
      const { tarea } = cmdCambiarEstado(estado, opts, comando === "bloquear" ? "bloqueada" : "descartada", rutaRegistro);
      guardar(rutaEstado, estado);
      console.log(`${ICONOS[tarea.estado]} ${tarea.id} ${tarea.titulo} — ${tarea.estado}.`);
      break;
    }
    case "reabrir": {
      const { tarea } = cmdCambiarEstado(estado, opts, "pendiente", rutaRegistro);
      guardar(rutaEstado, estado);
      console.log(`↺ ${tarea.id} ${tarea.titulo} — pendiente.`);
      break;
    }
    case "nota": {
      const id = opts._[0];
      if (!id || !opts.texto) {
        console.error('Uso: nota <id> --texto "..." [--decision]');
        process.exit(1);
      }
      const tarea = buscarTarea(estado, id);
      const clave = opts.decision ? "decisiones" : "notas";
      tarea[clave] = [...(tarea[clave] || []), opts.texto];
      tarea.actualizada = marcaTemporal();
      escribirEntrada(rutaRegistro, tarea, tarea.estado, {
        [opts.decision ? "decisiones" : "nota"]: opts.texto,
      });
      guardar(rutaEstado, estado);
      console.log(`✎ Nota guardada en ${id} (${opts.decision ? "decisión" : "nota"}).`);
      break;
    }
    case "estadisticas": {
      const resumen = calcularEstadisticas(estado.tareas);
      const porFase = {};
      for (const t of estado.tareas) {
        porFase[t.fase] = porFase[t.fase] || { total: 0, completadas: 0 };
        porFase[t.fase].total += 1;
        if (t.estado === "completada") porFase[t.fase].completadas += 1;
      }
      console.log(`Progreso: ${resumen.completada}/${estado.tareas.length} completadas · ${resumen.en_curso} en curso · ${resumen.bloqueada} bloqueadas · ${resumen.descartada} descartadas · ${resumen.pendiente} pendientes\n`);
      for (const fase of Object.keys(porFase).sort((a, b) => a - b)) {
        const { total, completadas } = porFase[fase];
        const barra = "█".repeat(Math.round((completadas / total) * 10)).padEnd(10, "░");
        console.log(`  Fase ${fase} ${barra} ${completadas}/${total}`);
      }
      break;
    }
    default:
      console.log(fs.readFileSync(__filename, "utf8").match(/\/\*\*[\s\S]*?\*\//)[0].replace(/^\/\*\*|\*\/$/g, "").replace(/^ \* ?/gm, ""));
      process.exit(comando ? 1 : 0);
  }
}

main();
