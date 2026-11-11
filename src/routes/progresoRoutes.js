// src/routes/progresoRoutes.js
const express = require('express');
const router = express.Router();
const progresoController = require('../controllers/progresoController');

// Obtener progreso por ID de usuario
router.get('/:usuario_id', progresoController.obtenerProgresoUsuario);

// Registrar o actualizar progreso
router.post('/', progresoController.registrarProgreso);

module.exports = router;