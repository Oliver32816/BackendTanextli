// Traduce HTTP ⇄ servicio. Mantiene exactamente el formato de respuesta actual.
const service = require('./auth.service');

async function registro(req, res) {
  const usuario = await service.registrar(req.validated.body);
  res.status(201).json({ estado: 'EXITO', mensaje: 'Usuario registrado correctamente.', usuario });
}

async function login(req, res) {
  const usuario = await service.iniciarSesion(req.validated.body);
  res.status(200).json({ estado: 'EXITO', mensaje: 'Inicio de sesión exitoso.', usuario });
}

module.exports = { registro, login };
