// Traduce HTTP ⇄ servicio. Las respuestas originales conservan su formato.
const repo = require('./progreso.repository');
const service = require('./progreso.service');

// ---------- Por palabra (rutas originales) ----------
async function obtener(req, res) {
  const usuarioId = service.resolverUsuario(req, req.validated.params.usuario_id);
  const progreso = await repo.listarPorUsuario(usuarioId);
  res.json({ estado: 'EXITO', total_registros: progreso.length, progreso });
}

async function consultar(req, res) {
  const { usuario_id: solicitado } = req.validated.query;
  const progreso = solicitado
    ? await repo.listarPorUsuario(service.resolverUsuario(req, solicitado))
    : await repo.listarTodo(); // sin usuario: solo equipo (lo valida la ruta)
  res.json({ estado: 'EXITO', total_registros: progreso.length, progreso });
}

async function registrar(req, res) {
  const usuarioId = service.resolverUsuario(req, req.validated.body.usuario_id);
  const data = await repo.registrar({ ...req.validated.body, usuario_id: usuarioId });
  res.json({ estado: 'EXITO', mensaje: 'Progreso registrado correctamente', data });
}

// ---------- Por lección ----------
async function lecciones(req, res) {
  const usuarioId = service.resolverUsuario(req, req.validated.params.usuario);
  res.json({ estado: 'EXITO', ...(await service.leccionesDe(usuarioId)) });
}

async function categorias(req, res) {
  const usuarioId = service.resolverUsuario(req, req.validated.params.usuario);
  res.json({ estado: 'EXITO', ...(await service.categoriasDe(usuarioId)) });
}

async function categoria(req, res) {
  const usuarioId = service.resolverUsuario(req, req.validated.params.usuario);
  res.json({ estado: 'EXITO', ...(await service.categoriaDe(usuarioId, req.validated.params.categoria)) });
}

async function completarLeccion(req, res) {
  const { usuario_id: solicitado, ...datos } = req.validated.body;
  const usuarioId = service.resolverUsuario(req, solicitado);
  const resultado = await service.completarLeccion({ usuarioId, ...datos });
  res.json({ estado: 'EXITO', mensaje: 'Lección registrada correctamente', ...resultado });
}

async function resumen(req, res) {
  const usuarioId = service.resolverUsuario(req, req.validated.params.usuario);
  res.json({ estado: 'EXITO', ...(await service.resumen(usuarioId)) });
}

// Borra todo el avance. Exige el token del mismo usuario.
async function reiniciar(req, res) {
  const usuarioId = service.resolverUsuario(req, req.validated.params.usuario, { exigirToken: true });
  const borrados = await service.reiniciar(usuarioId);
  res.json({ estado: 'EXITO', mensaje: 'Progreso reiniciado.', borrados });
}

module.exports = { obtener, consultar, registrar, lecciones, categorias, categoria, completarLeccion, resumen, reiniciar };
