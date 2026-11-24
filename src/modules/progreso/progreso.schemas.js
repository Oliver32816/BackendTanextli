const { z } = require('zod');

const id = z.coerce.number().int().positive();
const puntaje = z.coerce.number().int().min(0).max(100);
// Acepta true/false y también "true"/"false" como lo aceptaba la versión anterior
const booleano = z.union([z.boolean(), z.enum(['true', 'false']).transform((v) => v === 'true')]);

// :usuario en la URL: un id o "yo" (el usuario del token)
const usuario = z.object({ usuario: z.union([z.literal('yo'), id]) });

// Rutas originales (se conservan): /progreso/:usuario_id y ?usuario_id=
const porUsuario = z.object({ usuario_id: z.union([z.literal('yo'), id]) });
const consulta = z.object({ usuario_id: id.optional() });

// POST /progreso: una palabra practicada
const registrar = z.object({
  usuario_id: id.optional(), // si no viene, se toma del token
  palabra_id: id,
  categoria_id: id,
  completado: booleano.optional(),
  puntaje: puntaje.optional(), // calificación de pronunciación 0-100
});

const actividad = z.object({
  tipo: z.enum(['opcion_multiple', 'escritura', 'pronunciacion']),
  aciertos: z.coerce.number().int().min(0).max(500),
  total: z.coerce.number().int().min(1).max(500),
}).refine((a) => a.aciertos <= a.total, { message: 'aciertos no puede ser mayor que total' });

const palabraPracticada = z.object({
  palabra_id: id,
  completado: booleano.optional(),
  puntaje: puntaje.optional(),
});

// :categoria en la URL: id (9) o clave ("familia", "frases")
const categoriaParam = z.object({
  usuario: z.union([z.literal('yo'), id]),
  categoria: z.union([id, z.string().trim().min(1).max(80)]),
});

// POST /progreso/lecciones: una lección terminada (con sus actividades y palabras, opcional)
const completarLeccion = z.preprocess((cuerpo) => {
  if (!cuerpo || typeof cuerpo !== 'object') return cuerpo;
  return { ...cuerpo, categoria: cuerpo.categoria ?? cuerpo.categoria_id };
}, z.object({
  usuario_id: id.optional(), // si no viene, se toma del token
  categoria: z.union([id, z.string().trim().min(1).max(80)]), // 9 o "familia"
  leccion: z.coerce.number().int().min(1).max(99),
  puntaje: puntaje.optional(),
  actividades: z.array(actividad).max(10).optional(),
  palabras: z.array(palabraPracticada).max(200).optional(),
}));

module.exports = { usuario, porUsuario, consulta, registrar, completarLeccion, categoriaParam };
