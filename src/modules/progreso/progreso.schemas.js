const { z } = require('zod');

const id = z.coerce.number().int().positive();

const porUsuario = z.object({ usuario_id: id });

const registrar = z.object({
  usuario_id: id,
  palabra_id: id,
  categoria_id: id,
  // Acepta true/false y también "true"/"false" como lo aceptaba la versión anterior
  completado: z.union([z.boolean(), z.enum(['true', 'false']).transform((v) => v === 'true')]).optional(),
});

module.exports = { porUsuario, registrar };
