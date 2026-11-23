// PM2: `pm2 start ecosystem.config.js && pm2 save`
// Un solo proceso sirve portal, API, audios, imágenes y panel admin.
// Los secretos viven en .env (fuera de git).
module.exports = {
  apps: [
    {
      name: 'tanextli-server',
      script: 'src/server.js',
      cwd: __dirname,
      exec_mode: 'fork',
      instances: 1,
      max_memory_restart: '400M',
      kill_timeout: 10000,
      env: { NODE_ENV: 'production' },
    },
  ],
};
