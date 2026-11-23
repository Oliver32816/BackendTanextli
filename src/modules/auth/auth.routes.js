// POST /registro, POST /login  (montadas en /api y /api/v1)
const { Router } = require('express');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const validate = require('../../middlewares/validate');
const asyncHandler = require('../../utils/asyncHandler');
const schemas = require('./auth.schemas');
const controller = require('./auth.controller');

const router = Router();

const respuestaLimite = { estado: 'ERROR', mensaje: 'Demasiados intentos. Intenta de nuevo en unos minutos.' };

// Contra fuerza bruta: por IP + correo, para no bloquear a todos si el proxy
// llegara a reportar la misma IP para varios clientes.
const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}|${String(req.body?.correo || '').trim().toLowerCase()}`,
  message: respuestaLimite,
});

const limiteRegistro = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: respuestaLimite,
});

router.post(
  '/registro',
  limiteRegistro,
  validate(schemas.registro, 'body', 'Faltan campos obligatorios o tienen un formato inválido.'),
  asyncHandler(controller.registro)
);

router.post(
  '/login',
  limiteLogin,
  validate(schemas.login, 'body', 'Faltan campos obligatorios.'),
  asyncHandler(controller.login)
);

module.exports = router;
