// SQL de administración de usuarios. Nunca devuelve password_hash.
const db = require('../../config/db');

const COLUMNAS = `id, nombre_usuario, correo, COALESCE(rol, 'usuario') AS rol, creado_en,
                  proveedor, (google_id IS NOT NULL) AS con_google, debe_cambiar_password, ultimo_acceso`;

async function listar({ incluirSuperusuarios = true } = {}) {
  const filtro = incluirSuperusuarios ? '' : "WHERE COALESCE(rol, 'usuario') <> 'superuser'";
  const { rows } = await db.query(`SELECT ${COLUMNAS} FROM usuarios ${filtro} ORDER BY id ASC`);
  return rows;
}

async function buscar(id) {
  const { rows } = await db.query(`SELECT ${COLUMNAS} FROM usuarios WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function contarSuperusuarios() {
  const { rows } = await db.query("SELECT count(*)::int AS n FROM usuarios WHERE rol = 'superuser'");
  return rows[0].n;
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

// Contraseña temporal: el usuario debe cambiarla al entrar
async function restablecerPassword(id, passwordHash) {
  const { rows } = await db.query(
    `UPDATE usuarios SET password_hash = $2, debe_cambiar_password = TRUE WHERE id = $1 RETURNING ${COLUMNAS}`,
    [id, passwordHash]
  );
  return rows[0] || null;
}

async function eliminar(id) {
  const { rows } = await db.query('DELETE FROM usuarios WHERE id = $1 RETURNING id', [id]);
  return rows[0] || null;
}

module.exports = { listar, buscar, contarSuperusuarios, actualizar, restablecerPassword, eliminar };
