const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const adminViewController = require('../controllers/adminViewController');
const { verificarAdminPassword } = require('../middleware/adminAuth');

// Rutas públicas de autenticación
router.post('/registro', authController.registro);
router.post('/login', authController.login);

// Ruta JSON exclusiva (para Postman / Flutter)
router.get('/admin/usuarios', verificarAdminPassword, authController.obtenerUsuarios);

// Ruta HTML en Tabla exclusiva (para el navegador web)
router.get('/admin/usuarios/tabla', verificarAdminPassword, adminViewController.verTablaUsuarios);

module.exports = router;
