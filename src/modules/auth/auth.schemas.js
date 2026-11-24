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

// Correo con formato real (usuario@dominio.ext); se guarda en minúsculas
const correoValido = z.string().trim().toLowerCase().max(254)
  .regex(/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i, 'Escribe un correo electrónico válido (por ejemplo, nombre@gmail.com).');

const registro = conAlias(z.object({
  nombre_usuario: z.string().trim().min(1).max(80),
  correo: correoValido,
  password: z.string().min(1).max(72),
}));

const login = conAlias(z.object({
  correo: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(200),
}));

const google = z.preprocess((cuerpo) => {
  if (!cuerpo || typeof cuerpo !== 'object') return cuerpo;
  return { credential: cuerpo.credential ?? cuerpo.id_token ?? cuerpo.idToken };
}, z.object({ credential: z.string().min(20).max(4096) }));

const cambiarPassword = z.preprocess((cuerpo) => {
  if (!cuerpo || typeof cuerpo !== 'object') return cuerpo;
  return {
    actual: cuerpo.password_actual ?? cuerpo.actual,
    nueva: cuerpo.password_nueva ?? cuerpo.nueva,
  };
}, z.object({
  actual: z.string().min(1).max(200),
  nueva: z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres.').max(72),
}).refine((d) => d.actual !== d.nueva, { message: 'La nueva contraseña debe ser distinta de la actual.', path: ['nueva'] }));

const codigo = z.preprocess(
  (v) => (typeof v === 'string' ? v.replace(/\s+/g, '') : v),
  z.string().regex(/^\d{6}$/, 'El código tiene 6 números.')
);

const confirmarCorreo = z.object({ codigo });

const olvidePassword = conAlias(z.object({ correo: z.string().trim().min(3).max(254) }));

const restablecerPassword = z.preprocess((cuerpo) => {
  if (!cuerpo || typeof cuerpo !== 'object') return cuerpo;
  return {
    correo: cuerpo.correo ?? cuerpo.email,
    codigo: cuerpo.codigo,
    nueva: cuerpo.password_nueva ?? cuerpo.nueva ?? cuerpo.password,
  };
}, z.object({
  correo: z.string().trim().min(3).max(254),
  codigo,
  nueva: z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres.').max(72),
}));

module.exports = { registro, login, google, cambiarPassword, confirmarCorreo, olvidePassword, restablecerPassword };
