// API de administración de usuarios. Solo la monta el panel admin (src/admin-app.js),
// bajo /api: /api/admin/usuarios, /api/admin/registrar-usuario, /api/usuarios.
const { Router } = require('express');
const validate = require('../../middlewares/validate');
const asyncHandler = require('../../utils/asyncHandler');
const schemas = require('./usuarios.schemas');
const controller = require('./usuarios.controller');

const router = Router();

router.get('/usuarios', asyncHandler(controller.listarCompat));
router.get('/admin/usuarios', asyncHandler(controller.listar));

router.post(
  '/admin/registrar-usuario',
  validate(schemas.crear, 'body', 'Faltan campos obligatorios o tienen un formato inválido.'),
  asyncHandler(controller.crear)
);

router.put(
  '/admin/usuarios/:id',
  validate(schemas.idParam, 'params', 'ID inválido.'),
  validate(schemas.actualizar, 'body', 'Datos inválidos.'),
  asyncHandler(controller.actualizar)
);

router.delete(
  '/admin/usuarios/:id',
  validate(schemas.idParam, 'params', 'ID inválido.'),
  asyncHandler(controller.eliminar)
);

module.exports = router;
