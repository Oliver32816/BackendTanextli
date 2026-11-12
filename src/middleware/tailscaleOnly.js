// src/middleware/tailscaleOnly.js
module.exports = function tailscaleOnly(req, res, next) {
  // Obtener la IP del cliente (considerando proxies inversos si los hay)
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  
  // Las IPs de Tailscale siempre pertenecen al rango CGNAT (100.64.0.0/10, por lo que inician con '100.')
  // También permitimos localhost ('127.0.0.1' o '::1') para pruebas locales en el servidor
  const isTailscale = clientIp.includes('100.') || clientIp.includes('127.0.0.1') || clientIp.includes('::1');

  if (!isTailscale) {
    console.warn(`[SEGURIDAD] Intento de acceso bloqueado a ruta privada desde IP externa: ${clientIp}`);
    return res.status(403).json({
      estado: 'ERROR',
      mensaje: 'Acceso denegado. Esta sección solo está disponible desde la red privada y segura de Tailscale.'
    });
  }

  next();
};