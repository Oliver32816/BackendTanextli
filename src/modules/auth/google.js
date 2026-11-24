// Verificación del "ID token" que entrega el botón "Continuar con Google" (web) o
// google_sign_in (Flutter). Se valida la firma con las llaves públicas de Google y los datos
// del token, sin dependencias externas (módulo crypto de Node).
// https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
const crypto = require('crypto');
const config = require('../../config/env');
const { HttpError, unauthorized } = require('../../utils/httpError');

const URL_LLAVES = 'https://www.googleapis.com/oauth2/v3/certs';
const EMISORES = ['accounts.google.com', 'https://accounts.google.com'];
const TOLERANCIA_SEG = 60; // diferencia de reloj permitida
const TOKEN_INVALIDO = 'El inicio de sesión con Google no es válido. Intenta de nuevo.';

let cache = { llaves: new Map(), expira: 0, descargada: 0 };

async function descargarLlaves() {
  let respuesta;
  try {
    respuesta = await fetch(URL_LLAVES, { signal: AbortSignal.timeout(5000) });
  } catch {
    throw new HttpError(502, 'No se pudo contactar a Google. Intenta de nuevo.');
  }
  if (!respuesta.ok) throw new HttpError(502, 'No se pudo contactar a Google. Intenta de nuevo.');
  const { keys = [] } = await respuesta.json();
  const segundos = Number((respuesta.headers.get('cache-control') || '').match(/max-age=(\d+)/)?.[1]) || 3600;
  cache = {
    llaves: new Map(keys.map((k) => [k.kid, crypto.createPublicKey({ key: k, format: 'jwk' })])),
    expira: Date.now() + segundos * 1000,
    descargada: Date.now(),
  };
}

// Llave desconocida: se vuelve a descargar (Google las rota), pero como máximo una vez por minuto
async function llave(kid) {
  const vencida = Date.now() >= cache.expira;
  const desconocida = !cache.llaves.has(kid) && Date.now() - cache.descargada > 60 * 1000;
  if (vencida || desconocida) await descargarLlaves();
  return cache.llaves.get(kid);
}

const decodificar = (parte) => JSON.parse(Buffer.from(parte, 'base64url').toString('utf8'));

// Devuelve { googleId, correo, nombre, foto } o lanza 401
async function verificarTokenGoogle(idToken) {
  if (!config.googleClientIds.length) {
    throw new HttpError(503, 'El inicio de sesión con Google todavía no está configurado en el servidor.');
  }
  const partes = String(idToken || '').split('.');
  if (partes.length !== 3) throw unauthorized(TOKEN_INVALIDO);

  let cabecera;
  let datos;
  try {
    cabecera = decodificar(partes[0]);
    datos = decodificar(partes[1]);
  } catch {
    throw unauthorized(TOKEN_INVALIDO);
  }
  if (cabecera.alg !== 'RS256' || !cabecera.kid) throw unauthorized(TOKEN_INVALIDO);

  const publica = await llave(cabecera.kid);
  const firmaValida = publica && crypto.verify(
    'RSA-SHA256',
    Buffer.from(`${partes[0]}.${partes[1]}`),
    publica,
    Buffer.from(partes[2], 'base64url')
  );
  if (!firmaValida) throw unauthorized(TOKEN_INVALIDO);

  const ahora = Math.floor(Date.now() / 1000);
  const audiencias = [].concat(datos.aud);
  if (!EMISORES.includes(datos.iss)
    || !audiencias.some((a) => config.googleClientIds.includes(a))
    || !datos.exp || datos.exp + TOLERANCIA_SEG < ahora
    || (datos.iat && datos.iat - TOLERANCIA_SEG > ahora)) {
    throw unauthorized(TOKEN_INVALIDO);
  }
  if (!datos.sub || !datos.email || datos.email_verified !== true) {
    throw unauthorized('Tu cuenta de Google no tiene un correo verificado.');
  }
  return {
    googleId: String(datos.sub),
    correo: String(datos.email).toLowerCase(),
    nombre: (datos.name || datos.given_name || datos.email.split('@')[0]).slice(0, 80),
    foto: datos.picture ? String(datos.picture).slice(0, 500) : null,
  };
}

module.exports = { verificarTokenGoogle, _cache: () => cache };
