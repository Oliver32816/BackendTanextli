// GET /categorias, GET /palabras?categoria_id=, GET /mascota/frases  (montadas en /api y /api/v1)
// categoria_id acepta una subcategoría (lección) o una categoría padre (todas sus lecciones).
const { Router } = require('express');
const validate = require('../../middlewares/validate');
const asyncHandler = require('../../utils/asyncHandler');
const schemas = require('./catalogo.schemas');
const controller = require('./catalogo.controller');

const router = Router();

router.get('/categorias', asyncHandler(controller.categorias));
router.get('/palabras', validate(schemas.filtroPalabras, 'query', 'categoria_id inválido.'), asyncHandler(controller.palabras));

router.get('/mascota/frases', asyncHandler(controller.frasesMascota));

module.exports = router;
