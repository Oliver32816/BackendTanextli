// Acceso a datos de autenticación. Todo el SQL de este módulo vive aquí.
const db = require('../../config/db');

// Nunca incluye password_hash ni google_id
const COLUMNAS_PUBLICAS = 'id, nombre_usuario, correo, rol, creado_en, proveedor, foto_url, debe_cambiar_password';

async function buscarPorCorreo(correo) {
  const { rows } = await db.query(
    // Sin distinguir mayúsculas; si hubiera duplicados viejos, primero la coincidencia exacta
    `SELECT ${COLUMNAS_PUBLICAS}, password_hash, google_id FROM usuarios
     WHERE lower(correo) = lower($1)
     ORDER BY (correo = $1) DESC, id
     LIMIT 1`,
    [correo]
  );
  return rows[0] || null;
}

async function buscarPorGoogleId(googleId) {
  const { rows } = await db.query(`SELECT ${COLUMNAS_PUBLICAS} FROM usuarios WHERE google_id = $1`, [googleId]);
  return rows[0] || null;
}

async function buscarPorId(id) {
  const { rows } = await db.query(`SELECT ${COLUMNAS_PUBLICAS} FROM usuarios WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function passwordDe(id) {
  const { rows } = await db.query('SELECT password_hash FROM usuarios WHERE id = $1', [id]);
  return rows[0]?.password_hash ?? null;
}

async function existeCorreo(correo) {
  const { rowCount } = await db.query('SELECT 1 FROM usuarios WHERE lower(correo) = lower($1)', [correo]);
  return rowCount > 0;
}

async function crear({ nombre_usuario, correo, password_hash, rol = 'usuario', proveedor = 'local', google_id = null, foto_url = null }) {
  const { rows } = await db.query(
    `INSERT INTO usuarios (nombre_usuario, correo, password_hash, rol, creado_en, proveedor, google_id, foto_url)
     VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7)
     RETURNING ${COLUMNAS_PUBLICAS}`,
    [nombre_usuario, correo, password_hash, rol, proveedor, google_id, foto_url]
  );
  return rows[0];
}

// Una cuenta local que entra con Google por primera vez queda vinculada a esa cuenta de Google
async function vincularGoogle(id, googleId, foto) {
  const { rows } = await db.query(
    `UPDATE usuarios SET google_id = $2, foto_url = COALESCE(foto_url, $3) WHERE id = $1
     RETURNING ${COLUMNAS_PUBLICAS}`,
    [id, googleId, foto]
  );
  return rows[0];
}

async function actualizarPassword(id, passwordHash, { debeCambiar = false } = {}) {
  await db.query('UPDATE usuarios SET password_hash = $2, debe_cambiar_password = $3 WHERE id = $1', [id, passwordHash, debeCambiar]);
}

async function registrarAcceso(id) {
  await db.query('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = $1', [id]);
}

module.exports = {
  buscarPorCorreo, buscarPorGoogleId, buscarPorId, passwordDe, existeCorreo, crear, vincularGoogle,
  actualizarPassword, registrarAcceso,
};
