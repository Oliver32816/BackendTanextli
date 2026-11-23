// Reglas de registro e inicio de sesión.
const repo = require('./auth.repository');
const { conflict, unauthorized } = require('../../utils/httpError');

const CREDENCIALES_INVALIDAS = 'Correo electrónico o contraseña incorrectos.';

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

module.exports = { registrar, iniciarSesion, prepararPassword };
