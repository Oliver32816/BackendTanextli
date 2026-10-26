const express = require('express');
const router = express.Router();
const { 
  obtenerUsuariosAdmin, 
  actualizarUsuarioAdmin, 
  eliminarUsuarioAdmin 
} = require('../controllers/adminViewController');

// Endpoints protegidos para la administración completa de usuarios
router.get('/usuarios', obtenerUsuariosAdmin);
router.put('/usuarios/:id', actualizarUsuarioAdmin);
router.delete('/usuarios/:id', eliminarUsuarioAdmin);

module.exports = router;