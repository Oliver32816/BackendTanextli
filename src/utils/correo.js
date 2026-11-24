// Envío de correos con SMTP (Gmail u otro proveedor) usando nodemailer.
// La configuración viene de config.correo (variables SMTP_* del .env).
const config = require('../config/env');
const { HttpError } = require('./httpError');

let transporte = null;

function correoConfigurado() {
  return Boolean(config.correo.usuario && config.correo.password);
}

function obtenerTransporte() {
  if (!transporte) {
    // Se carga aquí para que el servidor arranque aunque falte instalar nodemailer
    const nodemailer = require('nodemailer');
    transporte = nodemailer.createTransport({
      host: config.correo.host,
      port: config.correo.port,
      secure: config.correo.port === 465,
      auth: { user: config.correo.usuario, pass: config.correo.password },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }
  return transporte;
}

// Lanza 503 si el servidor no puede enviar correos (sin SMTP en producción)
function exigirCorreoConfigurado() {
  if (!correoConfigurado() && config.env === 'production') {
    throw new HttpError(503, 'El envío de correos todavía no está configurado en el servidor.');
  }
}

async function enviarCorreo({ para, asunto, texto, html }) {
  if (!correoConfigurado()) {
    exigirCorreoConfigurado();
    // Desarrollo sin SMTP: el correo se muestra en la consola para poder probar
    console.info(`[correo] (sin SMTP) Para: ${para} · ${asunto}\n${texto}`);
    return;
  }
  try {
    await obtenerTransporte().sendMail({
      from: `"Tanextli" <${config.correo.remitente}>`,
      to: para,
      subject: asunto,
      text: texto,
      html,
    });
  } catch (err) {
    console.error(`[correo] No se pudo enviar a ${para}: ${err.message}`);
    throw new HttpError(502, 'No se pudo enviar el correo. Intenta de nuevo en unos minutos.');
  }
}

const escapar = (texto) => String(texto).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

// Correo con un código de 6 dígitos, con los colores de Tanextli
function plantillaCodigo({ nombre, titulo, mensaje, codigo, minutos, nota }) {
  const saludo = nombre ? `¡Hola, ${nombre}!` : '¡Hola!';
  const texto = [
    saludo,
    '',
    mensaje,
    '',
    `Tu código: ${codigo}`,
    `Vence en ${minutos} minutos.`,
    '',
    nota,
    '',
    `Tanextli · ${config.appUrl}`,
  ].join('\n');

  const html = `<!doctype html>
<html lang="es"><body style="margin:0;background:#eef6f1;font-family:Segoe UI,Arial,sans-serif;color:#16302a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:28px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(22,48,42,.12)">
        <tr><td style="background:linear-gradient(135deg,#3f9c6b,#1f5c41);padding:26px 28px;color:#ffffff">
          <div style="font-size:22px;font-weight:800">Tanextli</div>
          <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:.85">Aprende náhuatl</div>
        </td></tr>
        <tr><td style="padding:28px">
          <h1 style="margin:0 0 10px;font-size:20px;color:#1f5c41">${escapar(titulo)}</h1>
          <p style="margin:0 0 8px;font-size:15px">${escapar(saludo)}</p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.5">${escapar(mensaje)}</p>
          <div style="text-align:center;margin:0 0 18px">
            <span style="display:inline-block;padding:14px 22px;border-radius:14px;background:#e6f4ea;border:2px dashed #5cc489;font-size:32px;font-weight:800;letter-spacing:10px;color:#1f5c41;font-family:Consolas,Menlo,monospace">${escapar(codigo)}</span>
          </div>
          <p style="margin:0 0 6px;font-size:13px;color:#4f6b62;text-align:center">Vence en ${minutos} minutos.</p>
          <p style="margin:18px 0 0;font-size:13px;color:#4f6b62;line-height:1.5">${escapar(nota)}</p>
        </td></tr>
        <tr><td style="padding:16px 28px;background:#f6faf7;font-size:12px;color:#6b8279;text-align:center">
          <a href="${escapar(config.appUrl)}" style="color:#2f7d55;font-weight:700;text-decoration:none">${escapar(config.appUrl.replace(/^https?:\/\//, ''))}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return { texto, html };
}

module.exports = { enviarCorreo, plantillaCodigo, correoConfigurado, exigirCorreoConfigurado };
