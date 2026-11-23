// Reglas de registro e inicio de sesión.
const jwt = require('jsonwebtoken');
const config = require('../../config/env');
const repo = require('./auth.repository');
const { conflict, unauthorized } = require('../../utils/httpError');

const CREDENCIALES_INVALIDAS = 'Correo electrónico o contraseña incorrectos.';
const SESION_INVALIDA = 'Sesión inválida o expirada. Inicia sesión de nuevo.';
const DURACION_TOKEN = '7d';

// Token para que la app recuerde la sesión (GET /api/perfil). Solo lleva el id y el rol.
function crearToken(usuario) {
  return jwt.sign({ id: usuario.id, rol: usuario.rol || 'usuario' }, config.jwtSecret, { expiresIn: DURACION_TOKEN });
}

async function usuarioDelToken(token) {
  let datos;
  try {
    datos = jwt.verify(token, config.jwtSecret);
  } catch {
    throw unauthorized(SESION_INVALIDA);
  }
  const usuario = await repo.buscarPorId(datos.id);
  if (!usuario) throw unauthorized(SESION_INVALIDA);
  return usuario;
}

// Punto único de manejo de contraseñas.
// Hoy la base guarda texto plano (así funciona el login actual). En la fase 2, tras ampliar
// la columna password_hash, aquí se cambia a bcrypt y las contraseñas viejas se convierten
// a hash automáticamente la siguiente vez que cada usuario inicie sesión.
async function prepararPassword(password) {
  return password;
}

async function passwordCoincide(password, guardado) {
  return typeof guardado === 'string' && guardado === password;
}

function sinPassword(usuario) {
  const { password_hash, ...publico } = usuario; // eslint-disable-line no-unused-vars
  return publico;
}

async function registrar({ nombre_usuario, correo, password, rol = 'usuario' }) {
  if (await repo.existeCorreo(correo)) {
    throw conflict('El correo electrónico ya se encuentra registrado.');
  }
  const password_hash = await prepararPassword(password);
  return repo.crear({ nombre_usuario, correo, password_hash, rol });
}

async function iniciarSesion({ correo, password }) {
  const usuario = await repo.buscarPorCorreo(correo);
  if (!usuario || !(await passwordCoincide(password, usuario.password_hash))) {
    throw unauthorized(CREDENCIALES_INVALIDAS);
  }
  return sinPassword(usuario);
}

module.exports = { registrar, iniciarSesion, prepararPassword, crearToken, usuarioDelToken };
