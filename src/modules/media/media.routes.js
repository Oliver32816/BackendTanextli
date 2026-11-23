// Audios en náhuatl.
//   archivosRouter: archivos estáticos /audios/*, /multimedia/AudiosTanextli/* y /media/* (misma carpeta).
//                   /audios/* usa exactamente las mismas rutas que el frontend (p. ej. /audios/familia/...).
//   apiRouter:      GET /media-list (índice JSON, montado en /api y /api/v1)
const express = require('express');
const config = require('../../config/env');
const asyncHandler = require('../../utils/asyncHandler');
const service = require('./media.service');

const opcionesEstaticas = {
  fallthrough: true,
  index: false,
  dotfiles: 'ignore',
  // 1 hora: si se reemplaza un audio con el mismo nombre, los clientes lo verán pronto.
  maxAge: '1h',
};

const archivosRouter = express.Router();
archivosRouter.use('/audios', express.static(config.multimediaPath, opcionesEstaticas));
archivosRouter.use('/multimedia/AudiosTanextli', express.static(config.multimediaPath, opcionesEstaticas));
archivosRouter.use('/media', express.static(config.multimediaPath, opcionesEstaticas));

const apiRouter = express.Router();
apiRouter.get('/media-list', asyncHandler(async (req, res) => {
  res.json({ estado: 'OK', estructura: await service.escanear(config.multimediaPath) });
}));

module.exports = { archivosRouter, apiRouter };
