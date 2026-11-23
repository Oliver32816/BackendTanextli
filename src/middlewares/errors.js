// 404 y manejador central de errores. Ninguna respuesta expone detalles internos.
// Cada error trae "mensaje" (formato original) y "error" (lo que leen la app web y Flutter).
const { HttpError } = require('../utils/httpError');

function notFound(req, res) {
  res.status(404).json({ estado: 'ERROR', mensaje: 'Ruta no encontrada', error: 'Ruta no encontrada' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    const cuerpo = { estado: 'ERROR', mensaje: err.message, error: err.message };
    if (err.detalles) cuerpo.errores = err.detalles;
    return res.status(err.status).json(cuerpo);
  }

  // JSON mal formado o demasiado grande
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ estado: 'ERROR', mensaje: 'JSON inválido.', error: 'JSON inválido.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ estado: 'ERROR', mensaje: 'La petición es demasiado grande.', error: 'La petición es demasiado grande.' });
  }

  // Errores de PostgreSQL que son culpa de los datos enviados, no del servidor
  if (err.code === '23505') {
    return res.status(409).json({ estado: 'ERROR', mensaje: 'El registro ya existe.', error: 'El registro ya existe.' });
  }
  if (err.code === '23503') {
    return res.status(400).json({ estado: 'ERROR', mensaje: 'Hace referencia a un registro que no existe.', error: 'Hace referencia a un registro que no existe.' });
  }
  if (err.code === '22P02') {
    return res.status(400).json({ estado: 'ERROR', mensaje: 'Formato de dato inválido.', error: 'Formato de dato inválido.' });
  }

  console.error(`[error] ${req.method} ${req.originalUrl}:`, err);
  return res.status(500).json({ estado: 'ERROR', mensaje: 'Error interno del servidor', error: 'Error interno del servidor' });
}

module.exports = { notFound, errorHandler };
