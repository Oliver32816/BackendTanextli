// Galería de imágenes: lee la carpeta de imágenes y arma el listado para la web y la app.
// El resultado se guarda en memoria 60 s para no recorrer el disco en cada petición.
const fs = require('fs/promises');
const path = require('path');
const config = require('../../config/env');

const EXTENSIONES = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
const CACHE_MS = 60 * 1000;
const PREFIJO_PUBLICO = '/galeria-imagenes/imagenes';

let cache = { hasta: 0, datos: null };

async function recorrer(dir, relativo = []) {
  let entradas;
  try {
    entradas = await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }

  const resultado = [];
  for (const e of entradas) {
    if (e.name.startsWith('.')) continue;
    if (e.isDirectory()) {
      resultado.push(...(await recorrer(path.join(dir, e.name), [...relativo, e.name])));
    } else if (EXTENSIONES.has(path.extname(e.name).toLowerCase())) {
      resultado.push([...relativo, e.name]);
    }
  }
  return resultado;
}

// Mismo formato que el servidor anterior (imagesServer.js):
// { nombre, archivo, categoria, subcarpeta, rutaRelativa, url }
function aImagen(segmentos) {
  const archivo = segmentos[segmentos.length - 1];
  const carpetas = segmentos.slice(0, -1);
  const rutaRelativa = segmentos.join('/');
  return {
    nombre: path.parse(archivo).name,
    archivo,
    categoria: carpetas[0] || 'general',
    subcarpeta: carpetas.length > 1 ? carpetas.slice(1).join('/') : null,
    rutaRelativa,
    url: `${config.publicBaseUrl}${PREFIJO_PUBLICO}/${segmentos.map(encodeURIComponent).join('/')}`,
  };
}

async function listarTodas() {
  if (cache.datos && Date.now() < cache.hasta) return cache.datos;
  const rutas = await recorrer(config.imagenesPath);
  const datos = rutas
    .map(aImagen)
    .sort((a, b) => a.categoria.localeCompare(b.categoria, 'es') || a.nombre.localeCompare(b.nombre, 'es'));
  cache = { hasta: Date.now() + CACHE_MS, datos };
  return datos;
}

async function listar({ categoria } = {}) {
  const todas = await listarTodas();
  return categoria ? todas.filter((img) => img.categoria === categoria) : todas;
}

module.exports = { listar, PREFIJO_PUBLICO };
