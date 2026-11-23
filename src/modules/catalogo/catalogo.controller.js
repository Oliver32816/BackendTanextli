const repo = require('./catalogo.repository');

async function categorias(req, res) {
  const lista = await repo.listarCategorias();
  res.json({ estado: 'EXITO', total: lista.length, categorias: lista });
}

async function palabras(req, res) {
  const { categoria_id } = req.validated.query;
  const lista = await repo.listarPalabras({ categoriaId: categoria_id });
  res.json({ estado: 'EXITO', total: lista.length, palabras: lista });
}

async function frasesMascota(req, res) {
  const frases = await repo.listarFrasesMascota();
  res.json({ estado: 'EXITO', total: frases.length, frases });
}

module.exports = { categorias, palabras, frasesMascota };
