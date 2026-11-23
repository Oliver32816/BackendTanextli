// Valida body, query o params con un esquema de zod.
// Si pasa, reemplaza el valor por la versión limpia (con espacios recortados, números convertidos, etc.).
const { badRequest } = require('../utils/httpError');

module.exports = (esquema, origen = 'body', mensaje = 'Datos inválidos.') => (req, res, next) => {
  const resultado = esquema.safeParse(req[origen] ?? {});
  if (!resultado.success) {
    const detalles = resultado.error.issues.map((i) => ({ campo: i.path.join('.'), problema: i.message }));
    return next(badRequest(mensaje, detalles));
  }
  // req.query es de solo lectura en algunas versiones de Express: se guarda aparte
  req.validated = { ...(req.validated || {}), [origen]: resultado.data };
  return next();
};
