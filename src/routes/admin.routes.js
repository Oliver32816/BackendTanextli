// Panel admin: páginas y API. Solo lo monta admin-app.js (red privada de Tailscale).
const path = require('path');
const express = require('express');
const { protegerApiAdmin } = require('../middlewares/security');
const usuariosRoutes = require('../modules/usuarios/usuarios.routes');

const WEB = path.join(__dirname, '..', '..', 'web');
const estatico = (carpeta) => express.static(path.join(WEB, carpeta), { index: 'index.html', dotfiles: 'ignore' });

const router = express.Router();

// API (las peticiones que modifican datos exigen la cabecera X-Tanextli-Admin)
router.use('/api', protegerApiAdmin, usuariosRoutes); // /api/admin/usuarios, /api/admin/registrar-usuario, /api/usuarios

// Páginas del panel (la plantilla /portal/assets la sirve admin-app.js)
router.use('/admin', estatico('admin'));

// URLs anteriores
router.get('/admin/registro', (req, res) => res.redirect(301, '/admin/gestion/'));
router.get(['/', '/admin', '/admin/'], (req, res) => res.redirect(302, '/admin/usuarios/'));

module.exports = router;
