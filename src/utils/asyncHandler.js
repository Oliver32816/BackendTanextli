// Express 4 no captura errores de funciones async: este envoltorio
// los manda al manejador central en lugar de dejar la petición colgada.
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
