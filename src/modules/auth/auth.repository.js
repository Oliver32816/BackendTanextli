// Acceso a datos de autenticación. Todo el SQL de este módulo vive aquí.
const db = require('../../config/db');

// Nunca incluye password_hash ni google_id
const COLUMNAS_PUBLICAS = 'id, nombre_usuario, correo, rol, creado_en, proveedor, foto_url, debe_cambiar_password, correo_verificado';

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

// correoVerificado: TRUE para cuentas de Google (Google ya verificó el correo)
async function crear({ nombre_usuario, correo, password_hash, rol = 'usuario', proveedor = 'local', google_id = null, foto_url = null, correoVerificado = false }) {
  const { rows } = await db.query(
    `INSERT INTO usuarios (nombre_usuario, correo, password_hash, rol, creado_en, proveedor, google_id, foto_url,
                           correo_verificado, correo_verificado_en)
     VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, CASE WHEN $8 THEN NOW() END)
     RETURNING ${COLUMNAS_PUBLICAS}`,
    [nombre_usuario, correo, password_hash, rol, proveedor, google_id, foto_url, correoVerificado]
  );
  return rows[0];
}

// Una cuenta local que entra con Google por primera vez queda vinculada a esa cuenta de Google
async function vincularGoogle(id, googleId, foto) {
  const { rows } = await db.query(
    `UPDATE usuarios SET google_id = $2, foto_url = COALESCE(foto_url, $3),
            correo_verificado = TRUE, correo_verificado_en = COALESCE(correo_verificado_en, NOW())
     WHERE id = $1
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

// "Sigue conectado": actualiza el último acceso como máximo una vez por minuto
async function tocarAcceso(id) {
  await db.query(
    `UPDATE usuarios SET ultimo_acceso = NOW()
     WHERE id = $1 AND (ultimo_acceso IS NULL OR ultimo_acceso < NOW() - INTERVAL '1 minute')`,
    [id]
  );
}

async function marcarCorreoVerificado(id) {
  const { rows } = await db.query(
    `UPDATE usuarios SET correo_verificado = TRUE, correo_verificado_en = COALESCE(correo_verificado_en, NOW())
     WHERE id = $1 RETURNING ${COLUMNAS_PUBLICAS}`,
    [id]
  );
  return rows[0] || null;
}

// ---- Códigos por correo (tabla codigos_correo, migración 005) ----

// Guarda un código nuevo y anula los anteriores sin usar del mismo tipo
async function guardarCodigo({ usuarioId, tipo, codigoHash, minutos }) {
  const cliente = await db.pool.connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query(
      'UPDATE codigos_correo SET usado_en = NOW() WHERE usuario_id = $1 AND tipo = $2 AND usado_en IS NULL',
      [usuarioId, tipo]
    );
    await cliente.query(
      `INSERT INTO codigos_correo (usuario_id, tipo, codigo_hash, expira_en)
       VALUES ($1, $2, $3, NOW() + make_interval(mins => $4))`,
      [usuarioId, tipo, codigoHash, minutos]
    );
    await cliente.query('COMMIT');
  } catch (err) {
    await cliente.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    cliente.release();
  }
}

// Último código vigente (sin usar y sin vencer) de ese tipo
async function codigoVigente(usuarioId, tipo) {
  const { rows } = await db.query(
    `SELECT id, codigo_hash, intentos FROM codigos_correo
     WHERE usuario_id = $1 AND tipo = $2 AND usado_en IS NULL AND expira_en > NOW()
     ORDER BY creado_en DESC LIMIT 1`,
    [usuarioId, tipo]
  );
  return rows[0] || null;
}

// Segundos desde el último código pedido (para no enviar correos seguidos)
async function segundosDesdeUltimoCodigo(usuarioId, tipo) {
  const { rows } = await db.query(
    `SELECT EXTRACT(EPOCH FROM (NOW() - MAX(creado_en)))::int AS segundos
     FROM codigos_correo WHERE usuario_id = $1 AND tipo = $2`,
    [usuarioId, tipo]
  );
  return rows[0]?.segundos ?? null;
}

async function contarCodigosRecientes(usuarioId, tipo, minutos) {
  const { rows } = await db.query(
    `SELECT COUNT(*)::int AS total FROM codigos_correo
     WHERE usuario_id = $1 AND tipo = $2 AND creado_en > NOW() - make_interval(mins => $3)`,
    [usuarioId, tipo, minutos]
  );
  return rows[0]?.total ?? 0;
}

async function sumarIntentoCodigo(id) {
  const { rows } = await db.query('UPDATE codigos_correo SET intentos = intentos + 1 WHERE id = $1 RETURNING intentos', [id]);
  return rows[0]?.intentos ?? 0;
}

async function usarCodigo(id) {
  await db.query('UPDATE codigos_correo SET usado_en = NOW() WHERE id = $1', [id]);
}

module.exports = {
  buscarPorCorreo, buscarPorGoogleId, buscarPorId, passwordDe, existeCorreo, crear, vincularGoogle,
  actualizarPassword, registrarAcceso, tocarAcceso, marcarCorreoVerificado,
  guardarCodigo, codigoVigente, segundosDesdeUltimoCodigo, contarCodigosRecientes, sumarIntentoCodigo, usarCodigo,
};
