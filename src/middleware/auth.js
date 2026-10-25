const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'tanextli_clave_secreta_super_segura_2026';

const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Formato: Bearer <TOKEN>

  if (!token) {
    return res.status(401).json({ estado: 'ERROR', mensaje: 'Acceso denegado: Token no proporcionado' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ estado: 'ERROR', mensaje: 'Token inválido o expirado' });
  }
};

module.exports = { verificarToken };