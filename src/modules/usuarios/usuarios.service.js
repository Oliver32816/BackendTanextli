// Reglas de administración de usuarios.
const repo = require('./usuarios.repository');
const authService = require('../auth/auth.service');
const { notFound, conflict } = require('../../utils/httpError');

async function crear(datos) {
  return authService.registrar(datos);
}

async function actualizar(id, cambios) {
  try {
    const usuario = await repo.actualizar(id, cambios);
    if (!usuario) throw notFound('Usuario no encontrado.');
    return usuario;
  } catch (err) {
    if (err.code === '23505') throw conflict('El correo electrónico ya se encuentra registrado.');
    throw err;
  }
}

async function eliminar(id) {
  const eliminado = await repo.eliminar(id);
  if (!eliminado) throw notFound('Usuario no encontrado.');
  return eliminado.id;
}

module.exports = { listar: repo.listar, crear, actualizar, eliminar };
