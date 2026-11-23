// Arranque y apagado limpio de uno o varios servidores HTTP en el mismo proceso.
// Al reiniciar con PM2 se terminan las peticiones en curso y se cierra el pool de la BD.
const db = require('../config/db');

function iniciar(servicios) {
  const servidores = servicios.map(({ app, nombre, host, port }) => app.listen(port, host, () => {
    console.log(`[${nombre}] escuchando en http://${host}:${port}`);
  }));

  let cerrando = false;
  const apagar = (senal) => {
    if (cerrando) return;
    cerrando = true;
    console.log(`[tanextli] ${senal} recibido, cerrando...`);
    setTimeout(() => process.exit(1), 10000).unref(); // por si algo se queda colgado

    Promise.all(servidores.map((s) => new Promise((resolve) => s.close(resolve))))
      .then(() => db.pool.end())
      .catch(() => {})
      .finally(() => process.exit(0));
  };

  process.on('SIGINT', () => apagar('SIGINT'));
  process.on('SIGTERM', () => apagar('SIGTERM'));
  process.on('unhandledRejection', (err) => console.error('[tanextli] Promesa rechazada sin manejar:', err));

  return servidores;
}

module.exports = { iniciar };
