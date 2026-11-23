// Arma la aplicación del panel admin.
// Capa 1: escucha en 127.0.0.1 y solo se publica con `tailscale serve` (tailnet, nunca Funnel).
// Capa 2: exige la identidad de Tailscale y que el usuario esté en ADMIN_TAILNET_USERS.
// Capa 3 (fase 3): inicio de sesión con JWT y rol admin.
const path = require('path');
const express = require('express');
const { adminSecurityHeaders, soloTailnetAutorizada } = require('./middlewares/security');
const { notFound, errorHandler } = require('./middlewares/errors');
const healthRoutes = require('./modules/health/health.routes');
const adminRoutes = require('./routes/admin.routes');

function createAdminApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback');
  app.use(adminSecurityHeaders);
  app.use(healthRoutes);         // /health no muestra datos; útil para revisar el proceso desde el servidor
  // Estilos e imágenes públicos: los necesita también la página "No tienes acceso"
  app.use('/portal/assets', express.static(path.join(__dirname, '..', 'web', 'shared'), { dotfiles: 'ignore' }));
  app.use(soloTailnetAutorizada);
  app.use(express.json({ limit: '100kb' }));

  app.use(adminRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createAdminApp };
