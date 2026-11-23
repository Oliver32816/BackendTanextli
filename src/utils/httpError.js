// Error con código HTTP. Los servicios lo lanzan y el manejador central
// lo convierte en respuesta: { estado: 'ERROR', mensaje }.
class HttpError extends Error {
  constructor(status, mensaje, detalles) {
    super(mensaje);
    this.status = status;
    this.detalles = detalles;
  }
}

module.exports = {
  HttpError,
  badRequest: (mensaje, detalles) => new HttpError(400, mensaje, detalles),
  unauthorized: (mensaje) => new HttpError(401, mensaje),
  notFound: (mensaje) => new HttpError(404, mensaje),
  conflict: (mensaje) => new HttpError(409, mensaje),
};
