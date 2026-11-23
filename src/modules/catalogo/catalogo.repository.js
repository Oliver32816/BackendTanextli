// SQL del catálogo (categorías, palabras y frases de Lobita).
const db = require('../../config/db');

async function listarCategorias() {
  const { rows } = await db.query(
    `SELECT id, nombre, categoria_padre_id, imagen_url, slug, orden, nombre_nahuatl, disponible
     FROM categorias
     ORDER BY id ASC`
  );
  return rows;
}

// Solo palabras con náhuatl. Las que no lo tienen esperan traducción del hablante.
async function listarPalabras({ categoriaId } = {}) {
  const params = [];
  let sql = `
    SELECT p.id AS palabra_id,
           p.espanol,
           p.nahuatl,
           p.categoria_id,
           c.nombre AS subcategoria_nombre,
           p.imagen_url,
           p.slug,
           p.orden
    FROM palabras p
    LEFT JOIN categorias c ON p.categoria_id = c.id
    WHERE p.nahuatl IS NOT NULL`;

  if (categoriaId !== undefined) {
    params.push(categoriaId);
    sql += ' AND (p.categoria_id = $1 OR c.categoria_padre_id = $1)';
  }
  sql += ' ORDER BY c.categoria_padre_id NULLS FIRST, c.orden, p.orden, p.id';

  const { rows } = await db.query(sql, params);
  return rows;
}

// Frases de la mascota: las palabras de la categoría "Voz lobita" (id 38)
async function listarFrasesMascota() {
  const { rows } = await db.query(
    `SELECT id, slug AS clave, espanol AS texto
     FROM palabras
     WHERE categoria_id = 38
     ORDER BY id`
  );
  return rows;
}

module.exports = { listarCategorias, listarPalabras, listarFrasesMascota };
