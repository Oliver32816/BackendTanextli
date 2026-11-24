const { z } = require('zod');

const ROLES = ['usuario', 'admin', 'superuser'];

const idParam = z.object({ id: z.coerce.number().int().positive() });

const crear = z.object({
  nombre_usuario: z.string().trim().min(1).max(80),
  correo: z.string().trim().min(3).max(254),
  password: z.string().min(8).max(72),
  // Igual que antes: un rol desconocido se registra como 'usuario'
  rol: z.string().optional().transform((r) => (ROLES.includes(r) ? r : 'usuario')),
});

const actualizar = z.object({
  nombre_usuario: z.string().trim().min(1).max(80).optional(),
  correo: z.string().trim().min(3).max(254).optional(),
  rol: z.enum(ROLES).optional(),
});

const rol = z.object({ rol: z.enum(ROLES) });

module.exports = { ROLES, idParam, crear, actualizar, rol };
