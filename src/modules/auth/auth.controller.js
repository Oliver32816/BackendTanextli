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

// POST /auth/latido con token: la app avisa cada minuto que sigue abierta (para "En línea ahora")
async function latido(req, res) {
  const token = service.tokenDeLaPeticion(req);
  if (!token) throw unauthorized('Falta el token de sesión.');
  await service.latido(token); // valida la sesión y marca "en línea"
  res.status(204).end();
}

// POST /auth/salida con token: cerró sesión, cerró la pestaña o dejó la app en segundo plano
async function salida(req, res) {
  const token = service.tokenDeLaPeticion(req);
  if (token) await service.salida(token);
  res.status(204).end();
}

// POST /auth/google { credential }: "Continuar con Google" (registra la cuenta si no existe)
async function google(req, res) {
  const { usuario, nuevo } = await service.iniciarConGoogle(req.validated.body.credential);
  res.status(nuevo ? 201 : 200).json({
    estado: 'EXITO',
    mensaje: nuevo ? 'Cuenta creada con Google.' : 'Inicio de sesión exitoso.',
    nuevo,
    usuario,
    token: service.crearToken(usuario),
  });
}

// PUT /perfil/password { password_actual, password_nueva } con token
async function cambiarPassword(req, res) {
  const token = service.tokenDeLaPeticion(req);
  if (!token) throw unauthorized('Falta el token de sesión.');
  const { id } = service.datosDelToken(token);
  await service.cambiarPassword({ usuarioId: id, ...req.validated.body });
  res.json({ estado: 'EXITO', mensaje: 'Contraseña actualizada correctamente.' });
}

// POST /auth/verificacion/enviar (con token): envía un código al correo de la cuenta
async function enviarVerificacion(req, res) {
  const token = service.tokenDeLaPeticion(req);
  if (!token) throw unauthorized('Falta el token de sesión.');
  const { id } = service.datosDelToken(token);
  const { yaVerificado, correo } = await service.enviarVerificacion(id);
  res.json({
    estado: 'EXITO',
    mensaje: yaVerificado ? 'Tu correo ya está verificado.' : `Te enviamos un código a ${correo}.`,
    ya_verificado: yaVerificado,
  });
}

// POST /auth/verificacion/confirmar { codigo } (con token)
async function confirmarVerificacion(req, res) {
  const token = service.tokenDeLaPeticion(req);
  if (!token) throw unauthorized('Falta el token de sesión.');
  const { id } = service.datosDelToken(token);
  const usuario = await service.confirmarVerificacion(id, req.validated.body.codigo);
  res.json({ estado: 'EXITO', mensaje: '¡Correo verificado!', usuario });
}

// POST /auth/password/olvide { correo }: la respuesta es la misma aunque el correo no exista
async function olvidePassword(req, res) {
  await service.solicitarRestablecimiento(req.validated.body.correo);
  res.json({
    estado: 'EXITO',
    mensaje: 'Si el correo tiene una cuenta en Tanextli, te enviamos un código para restablecer tu contraseña.',
  });
}

// POST /auth/password/restablecer { correo, codigo, password_nueva }: cambia la contraseña e inicia sesión
async function restablecerPassword(req, res) {
  const usuario = await service.restablecerConCodigo(req.validated.body);
  res.json({ estado: 'EXITO', mensaje: 'Contraseña actualizada correctamente.', usuario, token: service.crearToken(usuario) });
}

module.exports = {
  registro, login, perfil, latido, salida, google, cambiarPassword,
  enviarVerificacion, confirmarVerificacion, olvidePassword, restablecerPassword,
};
