// Genera la migración de CONTENIDO (palabras en español y náhuatl) tomando como guía el
// contenido.json del frontend y RESPETANDO los id que ya existen en init.sql.
// Se ejecuta en desarrollo, no en el servidor:
//
//   node scripts/generar-contenido.mjs <ruta-a-contenido.json>
//
// Lee:     db/legacy/init_original.sql (id originales de categorías y palabras) y contenido.json (español y náhuatl)
// Escribe: db/migrations/002_contenido_nahuatl.sql
//          db/contenido-ids.json       id fijo de cada palabra (NO borrar: el progreso depende de ellos)
//          db/revision/palabras-sin-contenido.csv  palabras de init.sql que no están en contenido.json
//
// La tabla palabras ya no guarda URL de audio: las URL se consultan en la página de audios.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [, , rutaContenido] = process.argv;
if (!rutaContenido) {
  console.error('Uso: node scripts/generar-contenido.mjs <ruta-a-contenido.json>');
  process.exit(1);
}

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARCHIVO_IDS = path.join(RAIZ, 'db', 'contenido-ids.json');
const contenido = JSON.parse(fs.readFileSync(rutaContenido, 'utf8'));
const initSql = fs.readFileSync(path.join(RAIZ, 'db', 'legacy', 'init_original.sql'), 'utf8');

// ---------- Utilidades ----------
const BOM = String.fromCharCode(0xfeff); // para que Excel abra los CSV con acentos
const normalizar = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const slug = (t) => normalizar(t).replace(/\(.*?\)/g, '').replace(/[¿?¡!.,]/g, '').trim()
  .replace(/[\s_/]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
// Para comparar palabras: sin acentos, sin signos y sin aclaraciones entre paréntesis
const clave = (t) => normalizar(t).replace(/\(.*?\)/g, '').replace(/[¿?¡!.,]/g, '').replace(/\s+/g, ' ').trim();
const sql = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const limpio = (t) => (t === null || t === undefined || String(t).trim() === '' ? null : String(t).trim());
const csv = (filas) => `${BOM}${filas.map((f) => f.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')}\n`;

// ---------- Lo que ya existe en init.sql ----------
const categoriasInit = [...initSql.matchAll(/^\((\d+), '((?:[^']|'')*)', (NULL|\d+)\)/gm)]
  .map(([, id, nombre, padre]) => ({ id: Number(id), nombre: nombre.replace(/''/g, "'"), padre: padre === 'NULL' ? null : Number(padre) }));
const palabrasInit = [...initSql.matchAll(/^\((\d+), '((?:[^']|'')*)', '(?:[^']|'')*', (\d+), /gm)]
  .map(([, id, espanol, categoria]) => ({ id: Number(id), espanol: espanol.replace(/''/g, "'"), categoria: Number(categoria) }));
if (!categoriasInit.length || !palabrasInit.length) {
  console.error('No se pudieron leer las categorías o palabras de init.sql');
  process.exit(1);
}

// ---------- contenido.json → id de categorías existentes ----------
const CATEGORIAS = {
  familia: { id: 9, subs: { 'familia-principal': 10, 'familia-extendida': 11, 'mas-familiares': 12, personas: 13 } },
  sentimientos: { id: 32, subs: { 'sentimientos-positivos': 35, 'valores-y-emociones': 36, 'sentimientos-dificiles': 34, 'emociones-intensas': 33 } },
  colores: { id: 6, subs: { 'colores-basicos': 7, 'colores-secundarios': 8 } },
  numeros: { id: 19, subs: { 'del-1-5': 20, 'del-6-10': 21, 'del-11-15': 22, 'del-16-20': 23 } },
  'frases-comunes': { id: 14, subs: { saludos: 18, conversacion: 15, despedida: 16, expresiones: 17 } },
  animales: { id: 1, subs: { 'animales-domesticos': 3, 'animales-de-granja': 2, 'animales-silvestres': 4, 'aves-y-reptiles': 5 } },
  objetos: { id: 24, subs: { hogar: 26, 'objetos-de-casa': 27, 'objetos-diversos': 28, cocina: 25 } },
  'partes-del-cuerpo': { id: 29, subs: { 'cabeza-y-rostro': 31, 'cuerpo-y-extremidades': 30 } },
};
// Orden de las lecciones cuando el diseño (Figma) difiere del orden de contenido.json.
// El número de lección que guarda el progreso es esta posición: no cambiarla con usuarios activos.
const ORDEN_LECCIONES = {
  'frases-comunes': ['saludos', 'conversacion', 'expresiones', 'despedida'],
};
// La misma palabra escrita distinto en contenido.json y en init.sql (clave contenido → clave init.sql)
const EQUIVALENCIAS = {
  madre: 'mama', padre: 'papa', pavo: 'guajolote', camisa: 'camiza', naranja: 'anaranjado',
  'cuarto/habitacion': 'habitacion', 'canasta/bolsa': 'canasta', 'manta/cobija': 'manta',
};

const avisos = [];
const ids = fs.existsSync(ARCHIVO_IDS) ? JSON.parse(fs.readFileSync(ARCHIVO_IDS, 'utf8')) : {};
const usados = new Set(Object.values(ids));
let siguiente = Math.max(0, ...palabrasInit.map((p) => p.id), ...Object.values(ids)) + 1;

const categorias = []; // { id, padre, nombre, slug, orden, nahuatl, disponible }
const palabras = []; // { id, categoria, slug, espanol, nahuatl, orden }

contenido.categorias.forEach((cat, iCat) => {
  const cfg = CATEGORIAS[cat.id];
  if (!cfg) { avisos.push(`Categoría sin id asignado: ${cat.id}`); return; }
  categorias.push({ id: cfg.id, padre: null, nombre: cat.nombre, slug: cat.id, orden: iCat + 1, nahuatl: limpio(cat.nahuatl), disponible: cat.disponible !== false });

  const orden = ORDEN_LECCIONES[cat.id];
  const subcategorias = orden
    ? [...cat.subcategorias].sort((a, b) => orden.indexOf(a.id) - orden.indexOf(b.id))
    : cat.subcategorias;
  subcategorias.forEach((sub, iSub) => {
    const idSub = cfg.subs[sub.id];
    if (!idSub) { avisos.push(`Subcategoría sin id asignado: ${cat.id} › ${sub.id}`); return; }
    categorias.push({ id: idSub, padre: cfg.id, nombre: sub.nombre, slug: sub.id, orden: iSub + 1, nahuatl: null, disponible: cat.disponible !== false });

    sub.palabras.forEach((p, i) => {
      const s = slug(p.id);
      const llaveIds = `${idSub}:${s}`;
      let id = ids[llaveIds];
      if (!id) {
        // 1) misma subcategoría, 2) cualquier categoría (por si la palabra cambió de lugar)
        const buscada = EQUIVALENCIAS[clave(p.espanol)] || clave(p.espanol);
        const candidatos = palabrasInit.filter((x) => clave(x.espanol) === buscada && !usados.has(x.id));
        const existente = candidatos.find((x) => x.categoria === idSub) || candidatos[0];
        id = existente ? existente.id : siguiente++;
        if (existente && existente.categoria !== idSub) avisos.push(`"${p.espanol}" cambia de categoría ${existente.categoria} → ${idSub} (id ${id})`);
        ids[llaveIds] = id;
      }
      if (palabras.some((x) => x.id === id)) { avisos.push(`id ${id} repetido (${p.espanol}), se omite`); return; }
      usados.add(id);
      palabras.push({ id, categoria: idSub, slug: s, espanol: limpio(p.espanol), nahuatl: limpio(p.nahuatl), orden: i + 1 });
    });
  });
});

// Palabras de init.sql que no están en contenido.json: se conservan (id y progreso) pero sin náhuatl,
// así la API no las muestra. Incluye las frases de "Voz lobita".
const sinContenido = palabrasInit.filter((p) => !palabras.some((x) => x.id === p.id));
const slugsOcupados = new Set(palabras.map((p) => `${p.categoria}:${p.slug}`));
const extras = sinContenido.map((p, i) => {
  let s = slug(p.espanol) || `palabra-${p.id}`;
  if (slugsOcupados.has(`${p.categoria}:${s}`)) s = `${s}-${p.id}`;
  slugsOcupados.add(`${p.categoria}:${s}`);
  return { ...p, slug: s, orden: 100 + i };
});

// ---------- SQL ----------
const ahora = new Date().toISOString().slice(0, 10);
const nombreCategoria = (id) => categorias.find((c) => c.id === id)?.nombre || categoriasInit.find((c) => c.id === id)?.nombre || id;
const lineas = [];
const L = (s = '') => lineas.push(s);

L('-- =========================================================================');
L('-- 002 · Contenido: palabras en español y náhuatl');
L(`-- Generado el ${ahora} con scripts/generar-contenido.mjs desde contenido.json del frontend.`);
L('-- NO editar a mano: corregir contenido.json y volver a generar.');
L('--');
L('-- Respeta los id de init.sql: actualiza las palabras existentes, agrega las nuevas con id');
L('-- consecutivos y NO borra palabras ni progreso. Se puede ejecutar varias veces.');
L('-- La tabla palabras deja de guardar URL de audio (columna audio_url eliminada).');
L('-- Respaldar antes de ejecutar.');
L('-- =========================================================================');
L('BEGIN;');
L();
L('-- 1. Columnas');
L('ALTER TABLE categorias');
L('    ADD COLUMN IF NOT EXISTS slug           VARCHAR(80),');
L('    ADD COLUMN IF NOT EXISTS orden          SMALLINT NOT NULL DEFAULT 0,');
L('    ADD COLUMN IF NOT EXISTS nombre_nahuatl VARCHAR(100),');
L('    ADD COLUMN IF NOT EXISTS disponible     BOOLEAN NOT NULL DEFAULT TRUE;');
L();
L('ALTER TABLE palabras');
L('    ADD COLUMN IF NOT EXISTS slug  VARCHAR(80),');
L('    ADD COLUMN IF NOT EXISTS orden SMALLINT NOT NULL DEFAULT 0;');
L('ALTER TABLE palabras ALTER COLUMN nahuatl DROP NOT NULL;');
L('ALTER TABLE palabras DROP COLUMN IF EXISTS audio_url;');
L();
L('-- 2. Categorías (mismos id; nombres y orden de contenido.json)');
L('INSERT INTO categorias (id, nombre, categoria_padre_id, slug, orden, nombre_nahuatl, disponible) VALUES');
L(categorias.map((c) => `    (${c.id}, ${sql(c.nombre)}, ${c.padre ?? 'NULL'}, ${sql(c.slug)}, ${c.orden}, ${sql(c.nahuatl)}, ${c.disponible})`).join(',\n'));
L('ON CONFLICT (id) DO UPDATE SET');
L('    nombre = EXCLUDED.nombre, categoria_padre_id = EXCLUDED.categoria_padre_id, slug = EXCLUDED.slug,');
L('    orden = EXCLUDED.orden, nombre_nahuatl = EXCLUDED.nombre_nahuatl, disponible = EXCLUDED.disponible;');
L("UPDATE categorias SET slug = CASE WHEN categoria_padre_id IS NULL THEN 'voz-lobita' ELSE 'frases' END, orden = 99, disponible = FALSE");
L('WHERE id IN (37, 38);');
L();
L('-- 3. Palabras de contenido.json (las existentes conservan su id)');
L('INSERT INTO palabras (id, espanol, nahuatl, categoria_id, slug, orden) VALUES');
let anterior = null;
L(palabras.map((p) => {
  const comentario = p.categoria !== anterior ? `    -- ${nombreCategoria(categorias.find((c) => c.id === p.categoria).padre)} › ${nombreCategoria(p.categoria)}\n` : '';
  anterior = p.categoria;
  return `${comentario}    (${p.id}, ${sql(p.espanol)}, ${sql(p.nahuatl)}, ${p.categoria}, ${sql(p.slug)}, ${p.orden})`;
}).join(',\n'));
L('ON CONFLICT (id) DO UPDATE SET');
L('    espanol = EXCLUDED.espanol, nahuatl = EXCLUDED.nahuatl, categoria_id = EXCLUDED.categoria_id,');
L('    slug = EXCLUDED.slug, orden = EXCLUDED.orden;');
L();
L('-- 4. Palabras de init.sql que no están en contenido.json: se conservan con su id y progreso,');
L('--    pero sin náhuatl (en init.sql traían el español repetido), así la API no las muestra.');
L('--    Lista en db/revision/palabras-sin-contenido.csv');
extras.forEach((p) => L(`UPDATE palabras SET nahuatl = NULL, slug = ${sql(p.slug)}, orden = ${p.orden} WHERE id = ${p.id}; -- ${p.espanol}`));
L();
L('-- 5. Índices');
L('CREATE UNIQUE INDEX IF NOT EXISTS uq_categorias_slug ON categorias (categoria_padre_id, slug);');
L('CREATE UNIQUE INDEX IF NOT EXISTS uq_palabras_slug   ON palabras (categoria_id, slug);');
L('CREATE INDEX        IF NOT EXISTS idx_palabras_cat   ON palabras (categoria_id, orden);');
L();
L('-- 6. Las inserciones con id explícito no avanzan las secuencias SERIAL');
L("SELECT setval(pg_get_serial_sequence('categorias', 'id'), (SELECT MAX(id) FROM categorias));");
L("SELECT setval(pg_get_serial_sequence('palabras', 'id'), (SELECT MAX(id) FROM palabras));");
L();
L('-- 7. Permisos del usuario de la aplicación (si ya existe)');
L('DO $$');
L('BEGIN');
L("    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tanextli_app') THEN");
L('        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO tanextli_app;');
L('        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO tanextli_app;');
L('    END IF;');
L('END $$;');
L();
L('COMMIT;');

fs.mkdirSync(path.join(RAIZ, 'db', 'migrations'), { recursive: true });
fs.mkdirSync(path.join(RAIZ, 'db', 'revision'), { recursive: true });
fs.writeFileSync(path.join(RAIZ, 'db', 'migrations', '002_contenido_nahuatl.sql'), `${lineas.join('\n')}\n`);
fs.writeFileSync(ARCHIVO_IDS, `${JSON.stringify(ids, null, 2)}\n`);
fs.writeFileSync(path.join(RAIZ, 'db', 'revision', 'palabras-sin-contenido.csv'), csv([
  ['id', 'categoria', 'espanol'],
  ...extras.map((p) => [p.id, nombreCategoria(p.categoria), p.espanol]),
]));

const nuevas = palabras.filter((p) => !palabrasInit.some((x) => x.id === p.id));
console.log(`Categorías: ${categorias.length} · Palabras de contenido.json: ${palabras.length} (con náhuatl: ${palabras.filter((p) => p.nahuatl).length})`);
console.log(`Conservan su id de init.sql: ${palabras.length - nuevas.length} · Nuevas: ${nuevas.length} (${nuevas.map((p) => `${p.id} ${p.espanol}`).join(', ')})`);
console.log(`De init.sql sin contenido (quedan sin náhuatl): ${extras.length}`);
avisos.forEach((a) => console.warn(`AVISO: ${a}`));
