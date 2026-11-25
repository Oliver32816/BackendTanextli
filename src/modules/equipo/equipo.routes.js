// Vista de solo lectura para el equipo (rol admin o superuser) dentro de la app web.
//   GET /equipo/usuarios   cuentas con su rol, registro y último acceso (sin contraseñas)
// No hay rutas para modificar nada: los cambios se hacen en el panel admin (solo red de Tailscale).
const { Router } = require('express');
const { rateLimit } = require('express-rate-limit');
const db = require('../../config/db');
const asyncHandler = require('../../utils/asyncHandler');
const auth = require('../auth/auth.service');
const { unauthorized, forbidden } = require('../../utils/httpError');

const router = Router();

const ROLES_EQUIPO = ['admin', 'superuser'];

const limite = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { estado: 'ERROR', mensaje: 'Demasiadas consultas. Espera un momento.', error: 'Demasiadas consultas. Espera un momento.' },
});

router.get('/equipo/usuarios', limite, asyncHandler(async (req, res) => {
  const token = auth.tokenDeLaPeticion(req);
  if (!token) throw unauthorized('Inicia sesión para continuar.');
  // El rol se lee de la base (no del token) por si cambió después de iniciar sesión
  const usuario = await auth.usuarioDelToken(token);
  if (!ROLES_EQUIPO.includes(usuario.rol)) throw forbidden('Esta sección es solo para administradores.');

  const { rows } = await db.query(
    `SELECT id, nombre_usuario, correo, COALESCE(rol, 'usuario') AS rol, creado_en, ultimo_acceso, ultima_senal, foto_url
     FROM usuarios
     ORDER BY ultimo_acceso DESC NULLS LAST, id ASC`
  );
  res.set('Cache-Control', 'no-store');
  res.json({ estado: 'EXITO', total: rows.length, usuarios: rows });
}));

module.exports = router;
