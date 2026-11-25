// Reglas de registro e inicio de sesión.
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../../config/env');
const crypto = require('crypto');
const repo = require('./auth.repository');
const { verificarTokenGoogle } = require('./google');
const { enviarCorreo, plantillaCodigo, exigirCorreoConfigurado } = require('../../utils/correo');
const { revisarDominio } = require('../../utils/dominioCorreo');
const { HttpError, badRequest, conflict, unauthorized } = require('../../utils/httpError');

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

// Registro con correo y contraseña. Antes de crear la cuenta se revisa que el dominio del correo
// exista y reciba correos; después se envía un código para confirmar que el correo es de la persona.
async function registrar({ nombre_usuario, correo, password, rol = 'usuario' }) {
  if (await repo.existeCorreo(correo)) {
    throw conflict('El correo electrónico ya se encuentra registrado.');
  }
  const dominio = await revisarDominio(correo);
  if (!dominio.valido) throw badRequest(dominio.motivo);

  const password_hash = await prepararPassword(password);
  const usuario = await repo.crear({ nombre_usuario, correo, password_hash, rol });

  // Si el correo no sale, la cuenta igual queda creada: la app permite pedir el código de nuevo
  try {
    await enviarCodigo(usuario, TIPO_VERIFICACION);
  } catch (err) {
    console.warn(`[auth] No se envió el código de verificación a ${usuario.correo}: ${err.message}`);
  }
  return usuario;
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
        correoVerificado: true,
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
    throw badRequest('La contraseña actual no es correcta.');
  }
  await repo.actualizarPassword(usuarioId, await prepararPassword(nueva), { debeCambiar: false });
}

// =====================================================================
// Códigos por correo: verificar el correo y restablecer la contraseña
// =====================================================================
const TIPO_VERIFICACION = 'verificacion';
const TIPO_RESTABLECER = 'restablecer';
const MINUTOS_CODIGO = 15;
const MAX_INTENTOS = 5;          // intentos por código; después hay que pedir otro
const ESPERA_REENVIO_SEG = 60;   // tiempo mínimo entre un correo y otro
const MAX_CODIGOS_HORA = 5;      // correos por hora y por tipo para cada cuenta
const CODIGO_INVALIDO = 'El código no es correcto o ya venció. Revisa tu correo o pide uno nuevo.';

const nuevoCodigo = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0');

// Solo se guarda la huella del código (HMAC con el secreto del servidor), nunca el código
const huellaCodigo = (usuarioId, tipo, codigo) =>
  crypto.createHmac('sha256', config.jwtSecret).update(`${usuarioId}:${tipo}:${codigo}`).digest('hex');

const mismaHuella = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

const primerNombre = (nombre) => String(nombre || '').trim().split(/\s+/)[0] || '';

const TEXTOS = {
  [TIPO_VERIFICACION]: {
    asunto: 'Tu código para verificar tu correo · Tanextli',
    titulo: 'Verifica tu correo',
    mensaje: 'Escribe este código en Tanextli para confirmar que este correo es tuyo. Así podrás recuperar tu cuenta si olvidas tu contraseña.',
    nota: 'Si tú no creaste una cuenta en Tanextli, ignora este mensaje.',
  },
  [TIPO_RESTABLECER]: {
    asunto: 'Tu código para restablecer tu contraseña · Tanextli',
    titulo: 'Restablece tu contraseña',
    mensaje: 'Recibimos una solicitud para cambiar la contraseña de tu cuenta. Escribe este código en Tanextli para elegir una nueva.',
    nota: 'Si tú no lo pediste, ignora este mensaje: tu contraseña no cambiará.',
  },
};

// Crea un código, lo guarda y lo envía. Respeta las esperas para no llenar el correo de nadie.
async function enviarCodigo(usuario, tipo) {
  exigirCorreoConfigurado();
  const segundos = await repo.segundosDesdeUltimoCodigo(usuario.id, tipo);
  if (segundos !== null && segundos < ESPERA_REENVIO_SEG) {
    throw new HttpError(429, `Espera ${ESPERA_REENVIO_SEG - segundos} segundos antes de pedir otro código.`);
  }
  if ((await repo.contarCodigosRecientes(usuario.id, tipo, 60)) >= MAX_CODIGOS_HORA) {
    throw new HttpError(429, 'Pediste demasiados códigos. Intenta de nuevo en una hora.');
  }
  const codigo = nuevoCodigo();
  await repo.guardarCodigo({ usuarioId: usuario.id, tipo, codigoHash: huellaCodigo(usuario.id, tipo, codigo), minutos: MINUTOS_CODIGO });
  const { texto, html } = plantillaCodigo({ nombre: primerNombre(usuario.nombre_usuario), codigo, minutos: MINUTOS_CODIGO, ...TEXTOS[tipo] });
  await enviarCorreo({ para: usuario.correo, asunto: TEXTOS[tipo].asunto, texto, html });
}

// Revisa el código; cuenta los intentos fallidos y lo anula al llegar al máximo
async function comprobarCodigo(usuarioId, tipo, codigo) {
  const guardado = await repo.codigoVigente(usuarioId, tipo);
  if (!guardado || guardado.intentos >= MAX_INTENTOS) throw badRequest(CODIGO_INVALIDO);
  if (!mismaHuella(guardado.codigo_hash.trim(), huellaCodigo(usuarioId, tipo, codigo))) {
    const intentos = await repo.sumarIntentoCodigo(guardado.id);
    if (intentos >= MAX_INTENTOS) {
      await repo.usarCodigo(guardado.id);
      throw badRequest('Demasiados intentos con este código. Pide uno nuevo.');
    }
    throw badRequest(CODIGO_INVALIDO);
  }
  await repo.usarCodigo(guardado.id);
}

// POST /auth/verificacion/enviar (con sesión)
async function enviarVerificacion(usuarioId) {
  const usuario = await repo.buscarPorId(usuarioId);
  if (!usuario) throw unauthorized(SESION_INVALIDA);
  if (usuario.correo_verificado === true) return { yaVerificado: true, correo: usuario.correo };
  await enviarCodigo(usuario, TIPO_VERIFICACION);
  return { yaVerificado: false, correo: usuario.correo };
}

// POST /auth/verificacion/confirmar { codigo } (con sesión)
async function confirmarVerificacion(usuarioId, codigo) {
  const usuario = await repo.buscarPorId(usuarioId);
  if (!usuario) throw unauthorized(SESION_INVALIDA);
  if (usuario.correo_verificado === true) return usuario;
  await comprobarCodigo(usuarioId, TIPO_VERIFICACION, codigo);
  return repo.marcarCorreoVerificado(usuarioId);
}

// POST /auth/password/olvide { correo }: siempre responde igual para no revelar qué correos
// tienen cuenta. Si la cuenta existe, envía el código.
async function solicitarRestablecimiento(correo) {
  exigirCorreoConfigurado();
  const usuario = await repo.buscarPorCorreo(correo);
  if (!usuario) return;
  try {
    await enviarCodigo(usuario, TIPO_RESTABLECER);
  } catch (err) {
    // Las esperas entre correos no se informan: la respuesta debe ser igual exista o no la cuenta
    if (err.status === 429) return;
    console.warn(`[auth] No se envió el código de restablecimiento a ${usuario.correo}: ${err.message}`);
    if (err.status === 502 || err.status === 503) throw err;
  }
}

// POST /auth/password/restablecer { correo, codigo, password_nueva }: cambia la contraseña,
// confirma el correo (recibió el código) e inicia sesión
async function restablecerConCodigo({ correo, codigo, nueva }) {
  const usuario = await repo.buscarPorCorreo(correo);
  if (!usuario) throw badRequest(CODIGO_INVALIDO);
  await comprobarCodigo(usuario.id, TIPO_RESTABLECER, codigo);
  await repo.actualizarPassword(usuario.id, await prepararPassword(nueva), { debeCambiar: false });
  const actualizado = await repo.marcarCorreoVerificado(usuario.id);
  await marcarAcceso(usuario.id);
  return actualizado;
}

module.exports = {
  registrar, iniciarSesion, iniciarConGoogle, cambiarPassword, prepararPassword, passwordTemporal,
  crearToken, usuarioDelToken, datosDelToken, tokenDeLaPeticion, seguirConectado,
  enviarVerificacion, confirmarVerificacion, solicitarRestablecimiento, restablecerConCodigo,
};
