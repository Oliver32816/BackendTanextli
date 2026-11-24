// SQL del progreso de aprendizaje: por palabra (progreso_usuarios) y por lección (progreso_lecciones).
const db = require('../../config/db');

// ---------- Por palabra ----------
const CONSULTA = `
     SELECT p.id,
            p.usuario_id,
            p.categoria_id,
            c.nombre AS categoria,
            p.palabra_id,
            pal.nahuatl AS palabra_nahuatl,
            pal.espanol AS palabra_espanol,
            p.completado,
            p.veces_practicada,
            p.ultima_practica,
            p.ultimo_puntaje,
            p.mejor_puntaje
     FROM progreso_usuarios p
     LEFT JOIN categorias c ON p.categoria_id = c.id
     LEFT JOIN palabras pal ON p.palabra_id = pal.id`;

async function listarPorUsuario(usuarioId) {
  const { rows } = await db.query(`${CONSULTA} WHERE p.usuario_id = $1 ORDER BY p.ultima_practica DESC`, [usuarioId]);
  return rows;
}

// Todo el progreso (vista del equipo). Limitado para no devolver respuestas enormes.
async function listarTodo() {
  const { rows } = await db.query(`${CONSULTA} ORDER BY p.ultima_practica DESC LIMIT 1000`);
  return rows;
}

const ACTUALIZAR_PALABRA = `
     ON CONFLICT (usuario_id, palabra_id)
     DO UPDATE SET completado       = EXCLUDED.completado,
                   categoria_id     = EXCLUDED.categoria_id,
                   veces_practicada = progreso_usuarios.veces_practicada + 1,
                   ultima_practica  = NOW(),
                   ultimo_puntaje   = COALESCE(EXCLUDED.ultimo_puntaje, progreso_usuarios.ultimo_puntaje),
                   mejor_puntaje    = GREATEST(progreso_usuarios.mejor_puntaje, EXCLUDED.ultimo_puntaje)
     RETURNING *`;

// Inserta o actualiza (una fila por usuario y palabra), cuenta las prácticas y guarda el mejor puntaje.
async function registrar({ usuario_id, palabra_id, categoria_id, completado, puntaje }) {
  const { rows } = await db.query(
    `INSERT INTO progreso_usuarios
       (usuario_id, palabra_id, categoria_id, completado, veces_practicada, ultima_practica, ultimo_puntaje, mejor_puntaje)
     VALUES ($1, $2, $3, COALESCE($4, true), 1, NOW(), $5, $5)
     ${ACTUALIZAR_PALABRA}`,
    [usuario_id, palabra_id, categoria_id, completado ?? null, puntaje ?? null]
  );
  return rows[0];
}

// ---------- Por lección ----------
async function existeUsuario(usuarioId) {
  const { rowCount } = await db.query('SELECT 1 FROM usuarios WHERE id = $1', [usuarioId]);
  return rowCount > 0;
}

// Categoría principal por id (9) o por slug ("familia")
async function buscarCategoriaPrincipal(categoria) {
  const porId = typeof categoria === 'number';
  const { rows } = await db.query(
    `SELECT id, slug, nombre FROM categorias
     WHERE categoria_padre_id IS NULL AND ${porId ? 'id = $1' : 'slug = $1'}`,
    [categoria]
  );
  return rows[0] || null;
}

const GUARDAR_LECCION = `
     INSERT INTO progreso_lecciones (usuario_id, categoria_id, leccion, ultimo_puntaje, mejor_puntaje)
     VALUES ($1, $2, $3, $4, $4)
     ON CONFLICT (usuario_id, categoria_id, leccion)
     DO UPDATE SET intentos       = progreso_lecciones.intentos + 1,
                   ultimo_puntaje = COALESCE(EXCLUDED.ultimo_puntaje, progreso_lecciones.ultimo_puntaje),
                   mejor_puntaje  = GREATEST(progreso_lecciones.mejor_puntaje, EXCLUDED.ultimo_puntaje),
                   actualizada_en = NOW()
     RETURNING id, usuario_id, categoria_id, leccion, intentos, ultimo_puntaje, mejor_puntaje, completada_en, actualizada_en`;

// Guarda una lección terminada con sus actividades y las palabras practicadas, todo o nada.
// La categoría de cada palabra se toma de la base de datos (no del cliente).
async function guardarLeccionCompleta({ usuarioId, categoriaId, leccion, puntaje, actividades = [], palabras = [] }) {
  const cliente = await db.pool.connect();
  try {
    await cliente.query('BEGIN');
    const { rows } = await cliente.query(GUARDAR_LECCION, [usuarioId, categoriaId, leccion, puntaje ?? null]);
    for (const a of actividades) {
      await cliente.query(
        `INSERT INTO resultados_actividades (usuario_id, categoria_id, leccion, actividad, aciertos, total)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [usuarioId, categoriaId, leccion, a.tipo, a.aciertos, a.total]
      );
    }
    let palabrasGuardadas = 0;
    for (const p of palabras) {
      const { rowCount } = await cliente.query(
        `INSERT INTO progreso_usuarios
           (usuario_id, palabra_id, categoria_id, completado, veces_practicada, ultima_practica, ultimo_puntaje, mejor_puntaje)
         SELECT $1, pal.id, pal.categoria_id, COALESCE($3, true), 1, NOW(), $4, $4
         FROM palabras pal WHERE pal.id = $2
         ${ACTUALIZAR_PALABRA}`,
        [usuarioId, p.palabra_id, p.completado ?? null, p.puntaje ?? null]
      );
      palabrasGuardadas += rowCount;
    }
    await cliente.query('COMMIT');
    return { leccion: rows[0], actividades: actividades.length, palabras: palabrasGuardadas };
  } catch (err) {
    await cliente.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    cliente.release();
  }
}

// Lecciones de una categoría principal: sus subcategorías en orden (el repaso lo agrega el servicio)
async function subcategoriasDe(categoriaId) {
  const { rows } = await db.query(
    `SELECT s.id AS subcategoria_id, s.nombre AS titulo, s.slug, count(p.id)::int AS palabras
     FROM categorias s
     LEFT JOIN palabras p ON p.categoria_id = s.id AND p.nahuatl IS NOT NULL
     WHERE s.categoria_padre_id = $1
     GROUP BY s.id
     ORDER BY s.orden, s.id`,
    [categoriaId]
  );
  return rows;
}

async function categoriasPrincipales() {
  const { rows } = await db.query(
    `SELECT c.id, c.slug, c.nombre, c.nombre_nahuatl, c.orden, c.disponible,
            (SELECT count(*) FROM categorias s WHERE s.categoria_padre_id = c.id)::int AS subcategorias,
            (SELECT count(*) FROM palabras p JOIN categorias s ON s.id = p.categoria_id
              WHERE s.categoria_padre_id = c.id AND p.nahuatl IS NOT NULL)::int AS palabras
     FROM categorias c
     WHERE c.categoria_padre_id IS NULL
     ORDER BY c.orden, c.id`
  );
  return rows;
}

// Último intento de cada actividad por lección ("Desempeño por actividad 18/20")
async function ultimosResultados(usuarioId, categoriaId) {
  const { rows } = await db.query(
    `SELECT DISTINCT ON (leccion, actividad) leccion, actividad, aciertos, total, creado_en
     FROM resultados_actividades
     WHERE usuario_id = $1 AND categoria_id = $2
     ORDER BY leccion, actividad, creado_en DESC, id DESC`,
    [usuarioId, categoriaId]
  );
  return rows;
}

async function listarLecciones(usuarioId) {
  const { rows } = await db.query(
    `SELECT pl.categoria_id, c.slug AS categoria, c.nombre AS categoria_nombre, pl.leccion,
            pl.intentos, pl.ultimo_puntaje, pl.mejor_puntaje, pl.completada_en, pl.actualizada_en
     FROM progreso_lecciones pl
     JOIN categorias c ON c.id = pl.categoria_id
     WHERE pl.usuario_id = $1
     ORDER BY c.orden, pl.leccion`,
    [usuarioId]
  );
  return rows;
}

// Avance por categoría principal: lecciones terminadas y palabras practicadas
async function resumenPorCategoria(usuarioId) {
  const { rows } = await db.query(
    `SELECT c.id AS categoria_id, c.slug AS categoria, c.nombre,
            (SELECT count(*) FROM progreso_lecciones pl
              WHERE pl.usuario_id = $1 AND pl.categoria_id = c.id)::int        AS lecciones_completadas,
            count(p.id)::int                                                   AS palabras_totales,
            count(pu.id)::int                                                  AS palabras_practicadas,
            (count(pu.id) FILTER (WHERE pu.completado))::int                   AS palabras_completadas,
            round(avg(pu.mejor_puntaje))::int                                  AS puntaje_promedio,
            GREATEST(max(pu.ultima_practica),
                     (SELECT max(pl.actualizada_en) FROM progreso_lecciones pl
                       WHERE pl.usuario_id = $1 AND pl.categoria_id = c.id))   AS ultima_actividad
     FROM categorias c
     LEFT JOIN categorias s        ON s.categoria_padre_id = c.id
     LEFT JOIN palabras p          ON p.categoria_id = s.id AND p.nahuatl IS NOT NULL
     LEFT JOIN progreso_usuarios pu ON pu.palabra_id = p.id AND pu.usuario_id = $1
     WHERE c.categoria_padre_id IS NULL AND c.disponible
     GROUP BY c.id
     ORDER BY c.orden`,
    [usuarioId]
  );
  return rows;
}

// Borra todo el avance de un usuario (botón "Reiniciar progreso" de Configuración)
async function reiniciar(usuarioId) {
  const cliente = await db.pool.connect();
  try {
    await cliente.query('BEGIN');
    const actividades = await cliente.query('DELETE FROM resultados_actividades WHERE usuario_id = $1', [usuarioId]);
    const lecciones = await cliente.query('DELETE FROM progreso_lecciones WHERE usuario_id = $1', [usuarioId]);
    const palabras = await cliente.query('DELETE FROM progreso_usuarios WHERE usuario_id = $1', [usuarioId]);
    await cliente.query('COMMIT');
    return { lecciones: lecciones.rowCount, palabras: palabras.rowCount, actividades: actividades.rowCount };
  } catch (err) {
    await cliente.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    cliente.release();
  }
}

module.exports = {
  listarPorUsuario, listarTodo, registrar,
  existeUsuario, buscarCategoriaPrincipal, guardarLeccionCompleta, listarLecciones, resumenPorCategoria, reiniciar,
  subcategoriasDe, categoriasPrincipales, ultimosResultados,
};
