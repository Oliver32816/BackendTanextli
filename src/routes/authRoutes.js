const express = require('express');
const router = express.Router();
const { login, renovarToken } = require('../controllers/authController');
const { verificarToken } = require('../middleware/auth');

router.post('/login', login);
router.get('/renovar-token', verificarToken, renovarToken);

module.exports = router;