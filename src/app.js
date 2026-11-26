// Arma la aplicación pública (la que se publica con Tailscale Funnel).
// Aquí solo se conectan piezas: nada de SQL ni de lógica de negocio.
const express = require('express');
const { securityHeaders, corsPublico } = require('./middlewares/security');
const { notFound, errorHandler } = require('./middlewares/errors');
const compresion = require('./middlewares/compresion');
const healthRoutes = require('./modules/health/health.routes');
const webRoutes = require('./routes/web.routes');
const apiRoutes = require('./routes/api.routes');

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback'); // Funnel entrega las peticiones desde el proxy local de Tailscale
  app.use(securityHeaders);
  app.use(compresion);
  app.use(corsPublico);
  app.use(express.json({ limit: '100kb' }));

  app.use(healthRoutes);         // GET /health
  app.use(webRoutes);            // audios, páginas públicas y redirecciones
  app.use('/api/v1', apiRoutes); // contrato nuevo
  app.use('/api', apiRoutes);    // compatibilidad con la web y Flutter actuales

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
