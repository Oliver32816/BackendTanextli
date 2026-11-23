// Portal web público y archivos estáticos.
// Todo lo web del backend vive bajo /portal para no chocar con el frontend de la app
// (que usará "/" y su propia carpeta /assets cuando se publique en este mismo puerto).
const path = require('path');
const express = require('express');
const media = require('../modules/media/media.routes');
const imagenes = require('../modules/imagenes/imagenes.routes');
const { responderSinAcceso } = require('../utils/sinAcceso');

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
router.use('/portal/assets', estatico('shared', '1h'));
router.use('/portal', estatico('public'));

// El panel y la API de administración no existen en el puerto público:
// quien los busque desde internet ve "No tienes acceso a esta función".
router.all(
  ['/admin', '/admin/*', '/api/admin', '/api/admin/*', '/api/usuarios', '/api/v1/admin', '/api/v1/admin/*', '/api/v1/usuarios'],
  responderSinAcceso
);

// URLs anteriores → páginas nuevas (redirección permanente)
router.get(['/api/media', '/explorador/audios'], (req, res) => res.redirect(301, '/portal/audios/'));
router.get('/galeria-imagenes', (req, res) => res.redirect(301, '/portal/imagenes/'));
router.get('/privacidad', (req, res) => res.redirect(301, '/portal/privacidad/'));

// Mientras el frontend no se publique en este puerto, la raíz lleva al portal
router.get('/', (req, res) => res.redirect(302, '/portal/'));

module.exports = router;
