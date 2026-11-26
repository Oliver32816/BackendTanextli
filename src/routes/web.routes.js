// Portal web público y archivos estáticos.
// Todo lo web del backend vive bajo /portal para no chocar con el frontend de la app
// (que usará "/" y su propia carpeta /assets cuando se publique en este mismo puerto).
const path = require('path');
const express = require('express');
const media = require('../modules/media/media.routes');
const imagenes = require('../modules/imagenes/imagenes.routes');
const config = require('../config/env');
const { responderSinAcceso } = require('../utils/sinAcceso');
const { esEquipoEnPuertoPublico } = require('../utils/tailnet');

const WEB = path.join(__dirname, '..', '..', 'web');

const estatico = (carpeta, maxAge = '10m') => express.static(path.join(WEB, carpeta), {
  index: 'index.html',
  dotfiles: 'ignore',
  maxAge,
  redirect: true,
});

const router = express.Router();

// Archivos de audio e imagen (URLs que ya usan la app, Flutter y la base de datos)
router.use(media.archivosRouter);                     // /audios/*, /multimedia/AudiosTanextli/*, /media/*
router.use('/galeria-imagenes', imagenes.galeriaRouter); // /galeria-imagenes/imagenes/*, /galeria-imagenes/api/imagenes

// Portal: plantilla compartida y páginas
// Las capas de Lobita casi nunca cambian: el navegador las guarda una semana (y luego solo revisa si cambiaron)
router.use('/portal/assets/lobita/img', estatico(path.join('shared', 'lobita', 'img'), '7d'));
router.use('/portal/assets', estatico('shared', '1h'));
router.use('/portal', estatico('public'));

// Botón "Usuarios" del portal: los dispositivos de la tailnet pasan al panel (puerto 9443);
// desde internet se ve "No tienes acceso a esta función".
router.get(['/admin', '/admin/*'], (req, res, next) => {
  if (esEquipoEnPuertoPublico(req)) return res.redirect(302, `${config.adminPublicUrl}${req.originalUrl}`);
  return next();
});

// El panel y la API de administración no existen en el puerto público
router.all(['/admin', '/admin/*', '/api/admin', '/api/admin/*', '/api/v1/admin', '/api/v1/admin/*'], responderSinAcceso);

// URLs anteriores → páginas nuevas (redirección permanente)
router.get(['/api/media', '/explorador/audios'], (req, res) => res.redirect(301, '/portal/audios/'));
router.get('/galeria-imagenes', (req, res) => res.redirect(301, '/portal/imagenes/'));
router.get('/privacidad', (req, res) => res.redirect(301, '/portal/privacidad/'));

// Mientras el frontend no se publique en este puerto, la raíz lleva al portal
router.get('/', (req, res) => res.redirect(302, '/portal/'));

module.exports = router;
