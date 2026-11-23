const repo = require('./progreso.repository');

async function obtener(req, res) {
  const progreso = await repo.listarPorUsuario(req.validated.params.usuario_id);
  res.json({ estado: 'EXITO', total_registros: progreso.length, progreso });
}

async function registrar(req, res) {
  const data = await repo.registrar(req.validated.body);
  res.json({ estado: 'EXITO', mensaje: 'Progreso registrado correctamente', data });
}

module.exports = { obtener, registrar };
