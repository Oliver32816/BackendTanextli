// Carga y valida la configuración al arrancar.
// Si falta una variable obligatoria, el proceso termina: es mejor fallar al iniciar
// que correr en producción con valores por defecto inseguros.
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const REQUERIDAS = [
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET',
  'MULTIMEDIA_PATH',
  'IMAGENES_PATH',
];

const faltantes = REQUERIDAS.filter((clave) => !process.env[clave]);
if (faltantes.length > 0) {
  console.error(`[config] Faltan variables de entorno: ${faltantes.join(', ')}`);
  process.exit(1);
}

const lista = (valor) => (valor || '').split(',').map((v) => v.trim()).filter(Boolean);

module.exports = Object.freeze({
  env: process.env.NODE_ENV || 'development',
  host: process.env.HOST || '127.0.0.1',
  port: Number(process.env.PORT) || 3001,
  adminPort: Number(process.env.ADMIN_PORT) || 3010,

  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },

  jwtSecret: process.env.JWT_SECRET,

  // "Continuar con Google": ID(s) de cliente OAuth de Google Cloud (web y, si aplica, Android/iOS).
  // Vacío = el inicio con Google queda desactivado.
  googleClientIds: lista(process.env.GOOGLE_CLIENT_IDS),

  // Envío de correos (códigos para verificar el correo y restablecer la contraseña).
  // Con Gmail: SMTP_USER = la cuenta y SMTP_PASS = una "contraseña de aplicación" de 16 letras.
  // Sin SMTP_USER/SMTP_PASS: en desarrollo los códigos se muestran en la consola; en producción
  // esas funciones responden "no configurado" (el resto de la API sigue igual).
  correo: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 465,
    usuario: process.env.SMTP_USER || '',
    password: (process.env.SMTP_PASS || '').replace(/\s+/g, ''),
    remitente: process.env.CORREO_REMITENTE || process.env.SMTP_USER || '',
  },

  // Dirección de la app web (aparece en los correos)
  appUrl: (process.env.APP_URL || 'https://olo.tail0de9ec.ts.net:8443').replace(/\/+$/, ''),

  // URL pública (Funnel). Se usa para armar URLs absolutas de imágenes sin confiar
  // en la cabecera Host que manda el cliente.
  publicBaseUrl: (process.env.PUBLIC_BASE_URL || 'https://olo.tail0de9ec.ts.net').replace(/\/+$/, ''),

  // URL del panel admin (Tailscale Serve, solo dentro de la tailnet)
  adminPublicUrl: (process.env.ADMIN_PUBLIC_URL || `${(process.env.PUBLIC_BASE_URL || 'https://olo.tail0de9ec.ts.net').replace(/\/+$/, '')}:9443`).replace(/\/+$/, ''),

  // Carpetas de archivos que sirve el servidor
  multimediaPath: process.env.MULTIMEDIA_PATH,
  imagenesPath: process.env.IMAGENES_PATH,

  // Orígenes del navegador que pueden llamar a la API (apps móviles no envían Origin)
  corsOrigins: lista(process.env.CORS_ORIGINS),

  // Panel admin: solo personas de la tailnet en esta lista (correo de Tailscale)
  adminTailnetUsers: lista(process.env.ADMIN_TAILNET_USERS).map((u) => u.toLowerCase()),
  adminRequireTailscaleIdentity: process.env.ADMIN_REQUIRE_TAILSCALE_IDENTITY !== 'false',
});
