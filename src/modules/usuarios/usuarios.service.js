// Reglas de administración de usuarios.
const repo = require('./usuarios.repository');
const authService = require('../auth/auth.service');
const { notFound, conflict } = require('../../utils/httpError');

async function existente(id) {
  const usuario = await repo.buscar(id);
  if (!usuario) throw notFound('Usuario no encontrado.');
  return usuario;
}

// Nunca dejar el sistema sin superusuario
async function protegerUltimoSuperusuario(usuario, { nuevoRol, eliminando = false } = {}) {
  const pierde = usuario.rol === 'superuser' && (eliminando || (nuevoRol && nuevoRol !== 'superuser'));
  if (pierde && (await repo.contarSuperusuarios()) <= 1) {
    throw conflict('Es el único superusuario: asigna ese rol a otra cuenta antes de quitárselo o eliminarla.');
  }
}

async function crear(datos) {
  return authService.registrar(datos);
}

async function actualizar(id, cambios) {
  const usuario = await existente(id);
  await protegerUltimoSuperusuario(usuario, { nuevoRol: cambios.rol });
  try {
    return await repo.actualizar(id, cambios);
  } catch (err) {
    if (err.code === '23505') throw conflict('El correo electrónico ya se encuentra registrado.');
    throw err;
  }
}

async function cambiarRol(id, rol) {
  const usuario = await existente(id);
  if (usuario.rol === rol) return { usuario, cambio: false };
  await protegerUltimoSuperusuario(usuario, { nuevoRol: rol });
  return { usuario: await repo.actualizar(id, { rol }), cambio: true, anterior: usuario.rol };
}

// Genera una contraseña temporal (se muestra una sola vez al admin) y obliga a cambiarla
async function restablecerPassword(id) {
  await existente(id);
  const temporal = authService.passwordTemporal();
  const usuario = await repo.restablecerPassword(id, await authService.prepararPassword(temporal));
  return { usuario, temporal };
}

async function eliminar(id) {
  const usuario = await existente(id);
  await protegerUltimoSuperusuario(usuario, { eliminando: true });
  const eliminado = await repo.eliminar(id);
  return eliminado.id;
}

module.exports = { listar: repo.listar, crear, actualizar, cambiarRol, restablecerPassword, eliminar };
