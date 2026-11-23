const { z } = require('zod');

const filtroPalabras = z.object({
  categoria_id: z.coerce.number().int().positive().optional(),
});

module.exports = { filtroPalabras };
