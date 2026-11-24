// Acceso a datos de autenticación. Todo el SQL de este módulo vive aquí.
const db = require('../../config/db');

const COLUMNAS_PUBLICAS = 'id, nombre_usuario, correo, rol, creado_en';

async function buscarPorCorreo(correo) {
  const { rows } = await db.query(
    // Sin distinguir mayúsculas; si hubiera duplicados viejos, primero la coincidencia exacta
    `SELECT ${COLUMNAS_PUBLICAS}, password_hash FROM usuarios
     WHERE lower(correo) = lower($1)
     ORDER BY (correo = $1) DESC, id
     LIMIT 1`,
    [correo]
  );
  return rows[0] || null;
}

async function buscarPorId(id) {
  const { rows } = await db.query(`SELECT ${COLUMNAS_PUBLICAS} FROM usuarios WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function existeCorreo(correo) {
  const { rowCount } = await db.query('SELECT 1 FROM usuarios WHERE lower(correo) = lower($1)', [correo]);
  return rowCount > 0;
}

async function crear({ nombre_usuario, correo, password_hash, rol = 'usuario' }) {
  const { rows } = await db.query(
    `INSERT INTO usuarios (nombre_usuario, correo, password_hash, rol, creado_en)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING ${COLUMNAS_PUBLICAS}`,
    [nombre_usuario, correo, password_hash, rol]
  );
  return rows[0];
}

async function actualizarPassword(id, passwordHash) {
  await db.query('UPDATE usuarios SET password_hash = $2 WHERE id = $1', [id, passwordHash]);
}

module.exports = { buscarPorCorreo, buscarPorId, existeCorreo, crear, actualizarPassword };
