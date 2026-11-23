// SQL de administración de usuarios. Nunca devuelve password_hash.
const db = require('../../config/db');

const COLUMNAS = "id, nombre_usuario, correo, COALESCE(rol, 'usuario') AS rol, creado_en";

async function listar({ incluirSuperusuarios = true } = {}) {
  const filtro = incluirSuperusuarios ? '' : "WHERE COALESCE(rol, 'usuario') <> 'superuser'";
  const { rows } = await db.query(`SELECT ${COLUMNAS} FROM usuarios ${filtro} ORDER BY id ASC`);
  return rows;
}

async function actualizar(id, { nombre_usuario, correo, rol }) {
  const { rows } = await db.query(
    `UPDATE usuarios
     SET nombre_usuario = COALESCE($1, nombre_usuario),
         correo         = COALESCE($2, correo),
         rol            = COALESCE($3, rol)
     WHERE id = $4
     RETURNING ${COLUMNAS}`,
    [nombre_usuario ?? null, correo ?? null, rol ?? null, id]
  );
  return rows[0] || null;
}

async function eliminar(id) {
  const { rows } = await db.query('DELETE FROM usuarios WHERE id = $1 RETURNING id', [id]);
  return rows[0] || null;
}

module.exports = { listar, actualizar, eliminar };
