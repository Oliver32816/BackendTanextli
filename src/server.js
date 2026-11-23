// Punto de entrada único (PM2: tanextli-server). Un solo proceso, dos puertos internos:
//   - Portal y API pública → 127.0.0.1:PORT       (Tailscale Funnel :443, público)
//   - Panel admin          → 127.0.0.1:ADMIN_PORT (tailscale serve :9443, solo tailnet)
// Compartir proceso ahorra memoria y conexiones; separar puertos mantiene el panel fuera de internet.
const config = require('./config/env');
const { createApp } = require('./app');
const { createAdminApp } = require('./admin-app');
const { iniciar } = require('./utils/lifecycle');

iniciar([
  { app: createApp(), nombre: 'portal', host: config.host, port: config.port },
  { app: createAdminApp(), nombre: 'admin', host: config.host, port: config.adminPort },
]);
