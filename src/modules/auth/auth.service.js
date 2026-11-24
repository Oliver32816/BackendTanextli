// Reglas de registro e inicio de sesión.
const bcrypt = require('bcrypt');
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

// Valida el token sin consultar la base de datos: devuelve { id, rol }
function datosDelToken(token) {
  try {
    const { id, rol } = jwt.verify(token, config.jwtSecret);
    return { id: Number(id), rol: rol || 'usuario' };
  } catch {
    throw unauthorized(SESION_INVALIDA);
  }
}

// Lee "Authorization: Bearer <token>". Sin cabecera devuelve null.
function tokenDeLaPeticion(req) {
  const [tipo, token] = (req.get('Authorization') || '').split(' ');
  return tipo === 'Bearer' && token ? token : null;
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

// Punto único de manejo de contraseñas: se guardan con bcrypt (requiere la migración 003,
// que amplía password_hash). Las cuentas antiguas en texto plano siguen entrando y su
// contraseña se convierte a bcrypt automáticamente en su siguiente inicio de sesión.
const COSTO_BCRYPT = 12;
const esHash = (guardado) => /^\$2[aby]\$\d{2}\$/.test(guardado || '');

async function prepararPassword(password) {
  return bcrypt.hash(password, COSTO_BCRYPT);
}

async function passwordCoincide(password, guardado) {
  if (typeof guardado !== 'string' || !guardado) return false;
  return esHash(guardado) ? bcrypt.compare(password, guardado) : guardado === password;
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
  if (!esHash(usuario.password_hash)) {
    // Cuenta antigua en texto plano: se guarda ya con bcrypt (si falla, el login sigue)
    try {
      await repo.actualizarPassword(usuario.id, await prepararPassword(password));
    } catch (err) {
      console.warn(`[auth] No se pudo convertir la contraseña del usuario ${usuario.id}: ${err.message}`);
    }
  }
  return sinPassword(usuario);
}

module.exports = { registrar, iniciarSesion, prepararPassword, crearToken, usuarioDelToken, datosDelToken, tokenDeLaPeticion };
