// Validación de registro y login. Los límites coinciden con la tabla usuarios después de la
// migración 003 (nombre 80, correo 254). bcrypt usa como máximo 72 bytes de la contraseña.
const { z } = require('zod');

// Las apps mandan los mismos datos con distintos nombres: la web envía también "email" y
// "contrasena". Se aceptan todos para no romper ningún cliente.
const conAlias = (esquema) => z.preprocess((cuerpo) => {
  if (!cuerpo || typeof cuerpo !== 'object') return cuerpo;
  return {
    ...cuerpo,
    correo: cuerpo.correo ?? cuerpo.email,
    password: cuerpo.password ?? cuerpo.contrasena ?? cuerpo['contraseña'],
  };
}, esquema);

const registro = conAlias(z.object({
  nombre_usuario: z.string().trim().min(1).max(80),
  correo: z.string().trim().min(3).max(254),
  password: z.string().min(1).max(72),
}));

const login = conAlias(z.object({
  correo: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(200),
}));

module.exports = { registro, login };
