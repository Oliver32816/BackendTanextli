// GET /progreso/:usuario_id, POST /progreso  (montadas en /api y /api/v1)
// Fase 3: el usuario saldrá del token JWT y no del body/URL.
const { Router } = require('express');
const validate = require('../../middlewares/validate');
const asyncHandler = require('../../utils/asyncHandler');
const schemas = require('./progreso.schemas');
const controller = require('./progreso.controller');

const router = Router();

router.get(
  '/progreso/:usuario_id',
  validate(schemas.porUsuario, 'params', 'usuario_id inválido.'),
  asyncHandler(controller.obtener)
);

router.post(
  '/progreso',
  validate(schemas.registrar, 'body', 'Los campos usuario_id, palabra_id y categoria_id son obligatorios'),
  asyncHandler(controller.registrar)
);

module.exports = router;
