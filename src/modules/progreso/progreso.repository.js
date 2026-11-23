// SQL del progreso de aprendizaje.
const db = require('../../config/db');

async function listarPorUsuario(usuarioId) {
  const { rows } = await db.query(
    `SELECT p.id,
            p.usuario_id,
            p.categoria_id,
            c.nombre AS categoria,
            p.palabra_id,
            pal.nahuatl AS palabra_nahuatl,
            pal.espanol AS palabra_espanol,
            p.completado,
            p.veces_practicada,
            p.ultima_practica
     FROM progreso_usuarios p
     LEFT JOIN categorias c ON p.categoria_id = c.id
     LEFT JOIN palabras pal ON p.palabra_id = pal.id
     WHERE p.usuario_id = $1
     ORDER BY p.ultima_practica DESC`,
    [usuarioId]
  );
  return rows;
}

// Inserta o actualiza (una fila por usuario y palabra) y cuenta cuántas veces se practicó.
async function registrar({ usuario_id, palabra_id, categoria_id, completado }) {
  const { rows } = await db.query(
    `INSERT INTO progreso_usuarios (usuario_id, palabra_id, categoria_id, completado, veces_practicada, ultima_practica)
     VALUES ($1, $2, $3, COALESCE($4, true), 1, NOW())
     ON CONFLICT (usuario_id, palabra_id)
     DO UPDATE SET completado       = EXCLUDED.completado,
                   veces_practicada = progreso_usuarios.veces_practicada + 1,
                   ultima_practica  = NOW()
     RETURNING *`,
    [usuario_id, palabra_id, categoria_id, completado ?? null]
  );
  return rows[0];
}

module.exports = { listarPorUsuario, registrar };
