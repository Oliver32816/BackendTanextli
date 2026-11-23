// API pública. Se monta dos veces en app.js: /api/v1 (contrato nuevo) y /api (compatibilidad).
const { Router } = require('express');
const authRoutes = require('../modules/auth/auth.routes');
const catalogoRoutes = require('../modules/catalogo/catalogo.routes');
const progresoRoutes = require('../modules/progreso/progreso.routes');
const media = require('../modules/media/media.routes');
const imagenes = require('../modules/imagenes/imagenes.routes');
const usuarios = require('../modules/usuarios/usuarios.controller');
const asyncHandler = require('../utils/asyncHandler');
const { soloEquipo } = require('../middlewares/security');

const router = Router();

router.use(authRoutes);         // POST /registro, POST /login, GET /perfil
router.use(catalogoRoutes);     // GET /categorias, GET /palabras
router.use(progresoRoutes);     // GET /progreso, GET /progreso/:usuario_id, POST /progreso
router.use(media.apiRouter);    // GET /media-list
router.use(imagenes.apiRouter); // GET /imagenes

// Lista de usuarios: mismo formato de siempre, pero solo para dispositivos de la tailnet
router.get('/usuarios', soloEquipo, asyncHandler(usuarios.listarCompat));

module.exports = router;
