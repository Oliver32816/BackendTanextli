// Lee la estructura de carpetas y archivos de audio (sin bloquear el proceso).
const fs = require('fs/promises');
const path = require('path');

async function escanear(dir) {
  let entradas;
  try {
    entradas = await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }

  const visibles = entradas
    .filter((e) => !e.name.startsWith('.'))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));

  return Promise.all(visibles.map(async (e) => (e.isDirectory()
    ? { tipo: 'carpeta', nombre: e.name, contenido: await escanear(path.join(dir, e.name)) }
    : { tipo: 'archivo', nombre: e.name })));
}

module.exports = { escanear };
