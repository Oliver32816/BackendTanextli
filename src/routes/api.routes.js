// API pública. Se monta dos veces en app.js: /api/v1 (contrato nuevo) y /api (compatibilidad).
const { Router } = require('express');
const authRoutes = require('../modules/auth/auth.routes');
const catalogoRoutes = require('../modules/catalogo/catalogo.routes');
const progresoRoutes = require('../modules/progreso/progreso.routes');
const media = require('../modules/media/media.routes');
const imagenes = require('../modules/imagenes/imagenes.routes');

const router = Router();

router.use(authRoutes);         // POST /registro, POST /login
router.use(catalogoRoutes);     // GET /categorias, GET /palabras
router.use(progresoRoutes);     // GET /progreso/:usuario_id, POST /progreso
router.use(media.apiRouter);    // GET /media-list
router.use(imagenes.apiRouter); // GET /imagenes

module.exports = router;
