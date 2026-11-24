const service = require('./usuarios.service');

// GET /api/admin/usuarios
async function listar(req, res) {
  const usuarios = await service.listar();
  res.json({ estado: 'EXITO', total: usuarios.length, usuarios });
}

// GET /api/usuarios (formato histórico: estado 'OK' y sin superusuarios)
async function listarCompat(req, res) {
  const usuarios = await service.listar({ incluirSuperusuarios: false });
  res.json({ estado: 'OK', total: usuarios.length, usuarios });
}

// POST /api/admin/registrar-usuario
async function crear(req, res) {
  const usuario = await service.crear(req.validated.body);
  res.status(201).json({
    estado: 'EXITO',
    mensaje: `Usuario con rol '${usuario.rol}' registrado correctamente.`,
    usuario,
  });
}

// PUT /api/admin/usuarios/:id
async function actualizar(req, res) {
  const usuario = await service.actualizar(req.validated.params.id, req.validated.body);
  res.json({ estado: 'EXITO', mensaje: 'Usuario actualizado correctamente', usuario });
}

// PUT /api/admin/usuarios/:id/rol { rol }
async function cambiarRol(req, res) {
  const { usuario, cambio, anterior } = await service.cambiarRol(req.validated.params.id, req.validated.body.rol);
  res.json({
    estado: 'EXITO',
    mensaje: cambio ? `Rol cambiado de '${anterior}' a '${usuario.rol}'.` : `El usuario ya tenía el rol '${usuario.rol}'.`,
    usuario,
  });
}

// POST /api/admin/usuarios/:id/restablecer-password → contraseña temporal (se muestra una sola vez)
async function restablecerPassword(req, res) {
  const { usuario, temporal } = await service.restablecerPassword(req.validated.params.id);
  res.set('Cache-Control', 'no-store');
  res.json({
    estado: 'EXITO',
    mensaje: 'Contraseña restablecida. Compártela con la persona: deberá cambiarla al iniciar sesión.',
    usuario,
    password_temporal: temporal,
  });
}

// DELETE /api/admin/usuarios/:id
async function eliminar(req, res) {
  const idEliminado = await service.eliminar(req.validated.params.id);
  res.json({ estado: 'EXITO', mensaje: 'Usuario eliminado correctamente de la base de datos', idEliminado });
}

module.exports = { listar, listarCompat, crear, actualizar, cambiarRol, restablecerPassword, eliminar };
