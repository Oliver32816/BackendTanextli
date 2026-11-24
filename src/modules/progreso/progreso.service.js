// Reglas del progreso de aprendizaje (según el diseño de la app):
// * Cada categoría tiene sus lecciones (una por subcategoría, en orden) y al final un Repaso.
// * Las lecciones se desbloquean en orden; el Repaso se abre al terminar todas las demás.
// * "Progreso 40%" = lecciones completadas / total de lecciones (incluido el repaso).
// * Cada lección guarda sus actividades (opción múltiple, escritura, pronunciación) con aciertos/total.
const repo = require('./progreso.repository');
const auth = require('../auth/auth.service');
const { badRequest, forbidden, notFound, unauthorized } = require('../../utils/httpError');

// La app usa "frases"; en la base de datos (y en la carpeta de audios) es "frases-comunes".
// Se aceptan ambos al guardar y las respuestas usan el nombre de la app.
const ALIAS_CATEGORIAS = { frases: 'frases-comunes' };
const NOMBRE_EN_APP = Object.fromEntries(Object.entries(ALIAS_CATEGORIAS).map(([app, bd]) => [bd, app]));
const claveApp = (slug) => NOMBRE_EN_APP[slug] || slug;
const ACTIVIDADES = ['opcion_multiple', 'escritura', 'pronunciacion'];

// ¿Qué usuario se consulta o modifica?
// * Con token: "yo" o el mismo id del token (un admin puede ver a cualquiera).
// * Sin token: se acepta el id (compatibilidad con las apps actuales), salvo en operaciones
//   que lo exigen (reiniciar) o cuando se pide "yo".
function resolverUsuario(req, solicitado, { exigirToken = false } = {}) {
  const token = auth.tokenDeLaPeticion(req);
  if (!token) {
    if (exigirToken || solicitado === 'yo' || solicitado === undefined) {
      throw unauthorized('Inicia sesión para continuar (falta el token).');
    }
    return solicitado;
  }
  const { id, rol } = auth.datosDelToken(token);
  if (solicitado === 'yo' || solicitado === undefined) return id;
  if (solicitado !== id && !['admin', 'superuser'].includes(rol)) {
    throw forbidden('No puedes consultar ni modificar el progreso de otro usuario.');
  }
  return solicitado;
}

async function exigirUsuario(usuarioId) {
  if (!(await repo.existeUsuario(usuarioId))) throw notFound('Usuario no encontrado.');
}

async function exigirCategoria(categoria) {
  const buscada = typeof categoria === 'string'
    ? (ALIAS_CATEGORIAS[categoria.toLowerCase()] || categoria.toLowerCase())
    : categoria;
  const encontrada = await repo.buscarCategoriaPrincipal(buscada);
  if (!encontrada) throw badRequest(`La categoría "${categoria}" no existe.`);
  return encontrada;
}

// Lecciones de una categoría: una por subcategoría y el Repaso al final
async function estructura(categoriaId) {
  const subcategorias = await repo.subcategoriasDe(categoriaId);
  const lecciones = subcategorias.map((s, i) => ({
    numero: i + 1, tipo: 'leccion', titulo: s.titulo, subcategoria_id: s.subcategoria_id, palabras: s.palabras,
  }));
  if (lecciones.length) {
    lecciones.push({
      numero: lecciones.length + 1, tipo: 'repaso', titulo: 'Repaso', subcategoria_id: null,
      palabras: lecciones.reduce((suma, l) => suma + l.palabras, 0),
    });
  }
  return lecciones;
}

// completada / disponible / bloqueada, en orden
function conEstados(lecciones, completadas) {
  let anteriorCompleta = true;
  return lecciones.map((l) => {
    const hecha = completadas.has(l.numero);
    const estado = hecha ? 'completada' : (anteriorCompleta ? 'disponible' : 'bloqueada');
    if (l.tipo === 'leccion') anteriorCompleta = anteriorCompleta && hecha;
    return { ...l, estado };
  });
}

const porcentaje = (hechas, total) => (total ? Math.round((hechas / total) * 100) : 0);

// { familia: [1, 2], colores: [1], frases: [3] }: el mismo formato que la app guardaba en el navegador
function mapaDeLecciones(lecciones) {
  return lecciones.reduce((mapa, l) => {
    (mapa[claveApp(l.categoria)] ||= []).push(l.leccion);
    return mapa;
  }, {});
}

async function leccionesDe(usuarioId) {
  await exigirUsuario(usuarioId);
  const lecciones = await repo.listarLecciones(usuarioId);
  return { usuario_id: usuarioId, progreso: mapaDeLecciones(lecciones), lecciones };
}

// Pantalla de inicio / "Ver mi progreso": avance de cada categoría
async function categoriasDe(usuarioId) {
  await exigirUsuario(usuarioId);
  const [categorias, hechas] = await Promise.all([repo.categoriasPrincipales(), repo.listarLecciones(usuarioId)]);
  const resultado = categorias.map((c) => {
    const total = c.subcategorias ? c.subcategorias + 1 : 0; // + repaso
    const completadas = new Set(hechas.filter((h) => h.categoria_id === c.id && h.leccion <= total).map((h) => h.leccion));
    let siguiente = null;
    for (let n = 1; n <= total; n += 1) if (!completadas.has(n)) { siguiente = n; break; }
    return {
      categoria_id: c.id, categoria: claveApp(c.slug), nombre: c.nombre, nombre_nahuatl: c.nombre_nahuatl,
      disponible: c.disponible, palabras: c.palabras,
      total_lecciones: total, lecciones_completadas: completadas.size,
      porcentaje: porcentaje(completadas.size, total), siguiente_leccion: siguiente,
    };
  });
  const total = resultado.reduce((s, c) => s + c.total_lecciones, 0);
  const completas = resultado.reduce((s, c) => s + c.lecciones_completadas, 0);
  return {
    usuario_id: usuarioId,
    totales: {
      lecciones_completadas: completas, total_lecciones: total, porcentaje: porcentaje(completas, total),
      categorias_terminadas: resultado.filter((c) => c.total_lecciones && c.lecciones_completadas === c.total_lecciones).length,
      categorias_iniciadas: resultado.filter((c) => c.lecciones_completadas > 0).length,
    },
    categorias: resultado,
  };
}

// Pantalla de una categoría: lecciones con su estado, puntaje y desempeño por actividad
async function categoriaDe(usuarioId, categoria) {
  await exigirUsuario(usuarioId);
  const cat = await exigirCategoria(categoria);
  const [lecciones, hechas, resultados] = await Promise.all([
    estructura(cat.id),
    repo.listarLecciones(usuarioId),
    repo.ultimosResultados(usuarioId, cat.id),
  ]);
  const propias = new Map(hechas.filter((h) => h.categoria_id === cat.id).map((h) => [h.leccion, h]));
  const conEstado = conEstados(lecciones, new Set(propias.keys())).map((l) => {
    const p = propias.get(l.numero);
    const actividades = Object.fromEntries(resultados
      .filter((r) => r.leccion === l.numero)
      .map((r) => [r.actividad, { aciertos: r.aciertos, total: r.total, fecha: r.creado_en }]));
    return {
      ...l,
      intentos: p?.intentos ?? 0,
      ultimo_puntaje: p?.ultimo_puntaje ?? null,
      mejor_puntaje: p?.mejor_puntaje ?? null,
      completada_en: p?.completada_en ?? null,
      actividades,
    };
  });
  const completadas = conEstado.filter((l) => l.estado === 'completada').length;
  return {
    usuario_id: usuarioId,
    categoria: { id: cat.id, clave: claveApp(cat.slug), nombre: cat.nombre },
    total_lecciones: conEstado.length,
    lecciones_completadas: completadas,
    porcentaje: porcentaje(completadas, conEstado.length),
    siguiente_leccion: conEstado.find((l) => l.estado === 'disponible')?.numero ?? null,
    lecciones: conEstado,
  };
}

// Fin de una lección: se guarda la lección, sus actividades y las palabras practicadas
async function completarLeccion({ usuarioId, categoria, leccion, puntaje, actividades = [], palabras = [] }) {
  await exigirUsuario(usuarioId);
  const cat = await exigirCategoria(categoria);
  const lecciones = await estructura(cat.id);
  if (leccion > lecciones.length) {
    throw badRequest(`La lección ${leccion} no existe en ${cat.nombre} (tiene ${lecciones.length}, la última es el repaso).`);
  }
  // Sin puntaje explícito: el porcentaje de aciertos de las actividades
  const aciertos = actividades.reduce((s, a) => s + a.aciertos, 0);
  const total = actividades.reduce((s, a) => s + a.total, 0);
  const calificacion = puntaje ?? (total ? Math.round((aciertos / total) * 100) : null);

  const guardado = await repo.guardarLeccionCompleta({
    usuarioId, categoriaId: cat.id, leccion, puntaje: calificacion, actividades, palabras,
  });
  const avance = await categoriaDe(usuarioId, cat.id);
  const { progreso } = await leccionesDe(usuarioId);
  return {
    leccion: { ...guardado.leccion, categoria: claveApp(cat.slug), tipo: lecciones[leccion - 1].tipo },
    guardado: { actividades: guardado.actividades, palabras: guardado.palabras },
    categoria: {
      clave: avance.categoria.clave,
      porcentaje: avance.porcentaje,
      lecciones_completadas: avance.lecciones_completadas,
      total_lecciones: avance.total_lecciones,
      siguiente_leccion: avance.siguiente_leccion,
    },
    progreso,
  };
}

async function resumen(usuarioId) {
  await exigirUsuario(usuarioId);
  const categorias = (await repo.resumenPorCategoria(usuarioId)).map((c) => ({ ...c, categoria: claveApp(c.categoria) }));
  const suma = (campo) => categorias.reduce((total, c) => total + (c[campo] || 0), 0);
  const palabrasTotales = suma('palabras_totales');
  const practicadas = suma('palabras_practicadas');
  return {
    usuario_id: usuarioId,
    totales: {
      lecciones_completadas: suma('lecciones_completadas'),
      palabras_totales: palabrasTotales,
      palabras_practicadas: practicadas,
      palabras_completadas: suma('palabras_completadas'),
      porcentaje_palabras: porcentaje(practicadas, palabrasTotales),
      categorias_iniciadas: categorias.filter((c) => c.lecciones_completadas > 0 || c.palabras_practicadas > 0).length,
    },
    categorias,
  };
}

async function reiniciar(usuarioId) {
  await exigirUsuario(usuarioId);
  return repo.reiniciar(usuarioId);
}

module.exports = {
  ACTIVIDADES, resolverUsuario, leccionesDe, categoriasDe, categoriaDe, completarLeccion, resumen, reiniciar,
  mapaDeLecciones, conEstados,
};
