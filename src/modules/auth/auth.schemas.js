// Validación de registro y login. Los límites de longitud coinciden con las columnas
// actuales de la tabla usuarios (VARCHAR(50)); se amplían con la migración de la fase 2.
const { z } = require('zod');

const registro = z.object({
  nombre_usuario: z.string().trim().min(1).max(50),
  correo: z.string().trim().min(3).max(50),
  password: z.string().min(1).max(50),
});

const login = z.object({
  correo: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(200),
});

module.exports = { registro, login };
