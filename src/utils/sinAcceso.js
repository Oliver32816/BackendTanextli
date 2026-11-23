// Respuesta única para "no tienes acceso": página amable en el navegador, JSON en la API.
const path = require('path');

const PAGINA = path.join(__dirname, '..', '..', 'web', 'errores', 'sin-acceso.html');
const MENSAJE = 'No tienes acceso a esta función.';

function responderSinAcceso(req, res) {
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(403).json({ estado: 'ERROR', mensaje: MENSAJE, error: MENSAJE });
  }
  return res.status(403).sendFile(PAGINA);
}

module.exports = { responderSinAcceso };
