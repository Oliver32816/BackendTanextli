const { Router } = require('express');
const adminRegisterController = require('../controllers/adminRegisterController');
const adminNetworkMiddleware = require('../middleware/adminNetworkMiddleware');

const router = Router();

// Aplicar seguridad por red (solo accesible desde localhost / Tailscale)
router.use(adminNetworkMiddleware);

// POST /api/admin/registrar
router.post('/registrar', adminRegisterController.registrarUsuarioAdmin);

module.exports = router;