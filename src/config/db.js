// Única conexión (pool) a PostgreSQL para todo el proceso.
const { Pool } = require('pg');
const config = require('./env');

const pool = new Pool({
  ...config.db,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Sin este manejador, si PostgreSQL se reinicia, un cliente inactivo que pierde
// la conexión lanza un error no capturado y tumba todo el proceso.
pool.on('error', (err) => {
  console.error('[db] Error en un cliente inactivo del pool:', err.message);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
