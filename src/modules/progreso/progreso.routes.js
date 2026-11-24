// Progreso de aprendizaje (montadas en /api y /api/v1).
//
// Por palabra (rutas originales, mismo formato):
//   GET    /progreso/:usuario_id          progreso de un usuario (:usuario_id puede ser "yo" con token)
//   GET    /progreso?usuario_id=1         igual que la anterior; sin usuario_id → todos (solo equipo)
//   POST   /progreso                      { usuario_id, palabra_id, categoria_id, completado?, puntaje? }
//
// Por lección (según el diseño: lecciones en orden + repaso, actividades con aciertos/total):
//   GET    /progreso/:usuario/categorias             avance de cada categoría (porcentaje, siguiente lección)
//   GET    /progreso/:usuario/categorias/:categoria  lecciones con estado completada/disponible/bloqueada
//   GET    /progreso/:usuario/lecciones   { progreso: { familia: [1, 2] }, lecciones: [...] }
//   POST   /progreso/lecciones            { usuario_id, categoria, leccion, puntaje?, actividades?, palabras? }
//   GET    /progreso/:usuario/resumen     avance por categoría y totales
//   DELETE /progreso/:usuario             reinicia todo el avance (exige token)
//
// Si la petición trae "Authorization: Bearer <token>", el usuario debe coincidir con el del token.
const { Router } = require('express');
const validate = require('../../middlewares/validate');
const asyncHandler = require('../../utils/asyncHandler');
const schemas = require('./progreso.schemas');
const controller = require('./progreso.controller');
const { soloEquipo } = require('../../middlewares/security');

const router = Router();
const USUARIO_INVALIDO = 'Usuario inválido: usa un id numérico o "yo".';

router.get(
  '/progreso',
  validate(schemas.consulta, 'query', 'usuario_id inválido.'),
  (req, res, next) => (req.validated.query.usuario_id ? next() : soloEquipo(req, res, next)),
  asyncHandler(controller.consultar)
);

router.post(
  '/progreso/lecciones',
  validate(schemas.completarLeccion, 'body', 'Los campos categoria y leccion son obligatorios.'),
  asyncHandler(controller.completarLeccion)
);

router.get(
  '/progreso/:usuario/categorias',
  validate(schemas.usuario, 'params', USUARIO_INVALIDO),
  asyncHandler(controller.categorias)
);

router.get(
  '/progreso/:usuario/categorias/:categoria',
  validate(schemas.categoriaParam, 'params', 'Usuario o categoría inválidos.'),
  asyncHandler(controller.categoria)
);

router.get(
  '/progreso/:usuario/lecciones',
  validate(schemas.usuario, 'params', USUARIO_INVALIDO),
  asyncHandler(controller.lecciones)
);

router.get(
  '/progreso/:usuario/resumen',
  validate(schemas.usuario, 'params', USUARIO_INVALIDO),
  asyncHandler(controller.resumen)
);

router.get(
  '/progreso/:usuario_id',
  validate(schemas.porUsuario, 'params', 'usuario_id inválido.'),
  asyncHandler(controller.obtener)
);

router.delete(
  '/progreso/:usuario',
  validate(schemas.usuario, 'params', USUARIO_INVALIDO),
  asyncHandler(controller.reiniciar)
);

router.post(
  '/progreso',
  validate(schemas.registrar, 'body', 'Los campos usuario_id, palabra_id y categoria_id son obligatorios'),
  asyncHandler(controller.registrar)
);

module.exports = router;
