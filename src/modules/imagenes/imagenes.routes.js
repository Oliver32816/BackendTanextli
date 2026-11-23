// Galería de imágenes (antes era el proceso tanextli-images en el puerto 3005).
// Se conservan exactamente sus URLs:
//   /galeria-imagenes/imagenes/<categoria>/<archivo>   archivos
//   /galeria-imagenes/api/imagenes?categoria=           JSON
// y se agrega /api/imagenes y /api/v1/imagenes con el mismo contenido.
const express = require('express');
const { z } = require('zod');
const config = require('../../config/env');
const validate = require('../../middlewares/validate');
const asyncHandler = require('../../utils/asyncHandler');
const service = require('./imagenes.service');

const filtro = z.object({
  categoria: z.string().trim().regex(/^[\w-]{1,60}$/).optional(),
});

const listar = [
  validate(filtro, 'query', 'categoria inválida.'),
  asyncHandler(async (req, res) => {
    const imagenes = await service.listar(req.validated.query);
    res.json({ estado: 'OK', total: imagenes.length, imagenes });
  }),
];

// Archivos y JSON con el prefijo histórico /galeria-imagenes
const galeriaRouter = express.Router();
galeriaRouter.use('/imagenes', express.static(config.imagenesPath, {
  fallthrough: true,
  index: false,
  dotfiles: 'ignore',
  maxAge: '1h',
}));
galeriaRouter.get('/api/imagenes', ...listar);

// JSON dentro de la API (/api/imagenes y /api/v1/imagenes)
const apiRouter = express.Router();
apiRouter.get('/imagenes', ...listar);

module.exports = { galeriaRouter, apiRouter };
