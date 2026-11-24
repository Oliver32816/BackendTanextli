// Traduce HTTP ⇄ servicio. Conserva el formato de respuesta original y solo agrega campos nuevos.
const service = require('./auth.service');
const { unauthorized } = require('../../utils/httpError');

async function registro(req, res) {
  const usuario = await service.registrar(req.validated.body);
  res.status(201).json({ estado: 'EXITO', mensaje: 'Usuario registrado correctamente.', usuario });
}

// Mismo formato de siempre + "token" (nuevo) para mantener la sesión en la app
async function login(req, res) {
  const usuario = await service.iniciarSesion(req.validated.body);
  res.status(200).json({ estado: 'EXITO', mensaje: 'Inicio de sesión exitoso.', usuario, token: service.crearToken(usuario) });
}

// GET /perfil con "Authorization: Bearer <token>": la app web lo usa al recargar la página
async function perfil(req, res) {
  const token = service.tokenDeLaPeticion(req);
  if (!token) throw unauthorized('Falta el token de sesión.');
  const usuario = await service.usuarioDelToken(token);
  res.json({ estado: 'EXITO', usuario });
}

module.exports = { registro, login, perfil };
