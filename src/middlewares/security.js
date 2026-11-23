// Cabeceras de seguridad, CORS y controles de acceso del panel admin.
const helmet = require('helmet');
const cors = require('cors');
const config = require('../config/env');
const { responderSinAcceso } = require('../utils/sinAcceso');
const { esEquipoEnPanel, esEquipoEnPuertoPublico, identidad } = require('../utils/tailnet');

// Política de contenido: las páginas solo cargan scripts, estilos, imágenes y audios propios.
// No hay scripts ni estilos en línea: todo vive en /portal/assets.
const CSP = {
  useDefaults: true,
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'"],
    imgSrc: ["'self'", 'data:'],
    mediaSrc: ["'self'"],
    fontSrc: ["'self'"],
    connectSrc: ["'self'"],
    objectSrc: ["'none'"],
    frameAncestors: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    // En desarrollo local (http://localhost) no se fuerza HTTPS
    upgradeInsecureRequests: config.env === 'production' ? [] : null,
  },
};

// Portal y API pública: audios e imágenes deben poder cargarse desde el frontend
// (otro origen), por eso Cross-Origin-Resource-Policy es "cross-origin".
const securityHeaders = helmet({
  contentSecurityPolicy: CSP,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

// Panel admin: nada se comparte con otros orígenes y nada se guarda en caché.
const adminSecurityHeaders = [
  helmet({
    contentSecurityPolicy: CSP,
    crossOriginResourcePolicy: { policy: 'same-origin' },
  }),
  (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    res.set('X-Robots-Tag', 'noindex, nofollow');
    next();
  },
];

if (config.corsOrigins.length === 0) {
  console.warn('[security] CORS_ORIGINS está vacío: ningún sitio web externo podrá llamar a la API.');
}

// Las apps móviles (Flutter) no envían Origin, así que siempre pasan.
// Los navegadores solo pasan si su origen está en CORS_ORIGINS.
const corsPublico = cors({
  origin(origin, callback) {
    if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600,
});

// Capa 2 del panel: `tailscale serve` agrega la identidad de quien entra desde la tailnet
// (Tailscale-User-Login). Si no viene, o no está en la lista permitida, se muestra
// "No tienes acceso a esta función" (403) y no se entrega ningún dato.
// APIs del puerto público reservadas al equipo (p. ej. GET /api/usuarios): solo responden
// a dispositivos de la tailnet; desde internet devuelven 403.
function soloEquipo(req, res, next) {
  if (esEquipoEnPuertoPublico(req)) return next();
  const { login, ip } = identidad(req);
  console.warn(`[api] Solo equipo, rechazado: ${req.method} ${req.originalUrl} (usuario tailnet: "${login || 'ninguno'}", ip: ${ip})`);
  return responderSinAcceso(req, res);
}

function soloTailnetAutorizada(req, res, next) {
  if (!esEquipoEnPanel(req)) {
    const { login, ip } = identidad(req);
    console.warn(`[admin] Acceso rechazado: ${req.method} ${req.originalUrl} (usuario tailnet: "${login || 'ninguno'}", ip: ${ip})`);
    return responderSinAcceso(req, res);
  }
  const { login, nombre, ip } = identidad(req);
  req.tailnetUser = { login: login || ip, nombre: nombre || ip };
  return next();
}

// Contra CSRF en la API del panel: un sitio malicioso abierto en el navegador del admin
// no puede enviar esta cabecera ni hacer peticiones "same-origin".
const METODOS_QUE_MODIFICAN = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function protegerApiAdmin(req, res, next) {
  if (!METODOS_QUE_MODIFICAN.has(req.method)) return next();

  const sitio = req.get('Sec-Fetch-Site');
  const cabeceraPropia = req.get('X-Tanextli-Admin') === '1';
  const jsonValido = req.method === 'DELETE' || req.is('application/json');
  if ((sitio && sitio !== 'same-origin') || !cabeceraPropia || !jsonValido) {
    return res.status(403).json({ estado: 'ERROR', mensaje: 'Petición no permitida.' });
  }
  return next();
}

module.exports = {
  securityHeaders,
  adminSecurityHeaders,
  corsPublico,
  soloTailnetAutorizada,
  soloEquipo,
  protegerApiAdmin,
};
