// Reglas de registro e inicio de sesión.
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../../config/env');
const crypto = require('crypto');
const repo = require('./auth.repository');
const { verificarTokenGoogle } = require('./google');
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
  seguirConectado(usuario.id);
  return usuario;
}

// Cada petición con sesión cuenta como actividad (para "En línea ahora"). No espera ni falla.
function seguirConectado(id) {
  repo.tocarAcceso(id).catch((err) => console.warn(`[auth] No se pudo actualizar el acceso de ${id}: ${err.message}`));
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
  const { password_hash, google_id, ...publico } = usuario; // eslint-disable-line no-unused-vars
  return publico;
}

// Contraseña aleatoria legible (sin 0/O, 1/l/I) para restablecimientos
function passwordTemporal(longitud = 12) {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return Array.from(crypto.randomBytes(longitud), (b) => alfabeto[b % alfabeto.length]).join('');
}

// Último acceso para el panel; si falla, el inicio de sesión sigue
async function marcarAcceso(id) {
  try {
    await repo.registrarAcceso(id);
  } catch (err) {
    console.warn(`[auth] No se pudo registrar el acceso del usuario ${id}: ${err.message}`);
  }
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
  await marcarAcceso(usuario.id);
  return sinPassword(usuario);
}

// "Continuar con Google": entra si la cuenta existe (por Google o por correo) o la crea al momento
async function iniciarConGoogle(credential) {
  const google = await verificarTokenGoogle(credential);
  let usuario = await repo.buscarPorGoogleId(google.googleId);
  let nuevo = false;
  if (!usuario) {
    const porCorreo = await repo.buscarPorCorreo(google.correo);
    if (porCorreo) {
      if (porCorreo.google_id && porCorreo.google_id !== google.googleId) {
        throw conflict('Ese correo ya está vinculado a otra cuenta de Google.');
      }
      usuario = await repo.vincularGoogle(porCorreo.id, google.googleId, google.foto);
    } else {
      // Contraseña aleatoria que nadie conoce: la cuenta entra con Google (puede pedir un
      // restablecimiento al admin si algún día quiere entrar con correo y contraseña)
      usuario = await repo.crear({
        nombre_usuario: google.nombre,
        correo: google.correo,
        password_hash: await prepararPassword(crypto.randomBytes(32).toString('hex')),
        proveedor: 'google',
        google_id: google.googleId,
        foto_url: google.foto,
      });
      nuevo = true;
    }
  }
  await marcarAcceso(usuario.id);
  return { usuario: sinPassword(usuario), nuevo };
}

// El propio usuario cambia su contraseña (por ejemplo, después de un restablecimiento)
async function cambiarPassword({ usuarioId, actual, nueva }) {
  const guardado = await repo.passwordDe(usuarioId);
  if (!guardado || !(await passwordCoincide(actual, guardado))) {
    throw unauthorized('La contraseña actual no es correcta.');
  }
  await repo.actualizarPassword(usuarioId, await prepararPassword(nueva), { debeCambiar: false });
}

module.exports = {
  registrar, iniciarSesion, iniciarConGoogle, cambiarPassword, prepararPassword, passwordTemporal,
  crearToken, usuarioDelToken, datosDelToken, tokenDeLaPeticion, seguirConectado,
};
