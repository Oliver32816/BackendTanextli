// GET /health: estado del proceso y de la base de datos (para monitoreo y alertas).
const { Router } = require('express');
const db = require('../../config/db');

const router = Router();

router.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ estado: 'OK', uptime_s: Math.round(process.uptime()) });
  } catch {
    res.status(503).json({ estado: 'ERROR', mensaje: 'Base de datos no disponible' });
  }
});

module.exports = router;
