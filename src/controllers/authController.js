const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// Clave secreta para firmar tokens
const JWT_SECRET = process.env.JWT_SECRET || 'tanextli_clave_secreta_super_segura_2026';

// 1. LOGIN
const login = async (req, res) => {
  const { correo, contraseña } = req.body;

  try {
    const result = await pool.query(
      'SELECT id, nombre_usuario, correo, contraseña, rol FROM usuarios WHERE correo = $1',
      [correo]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ estado: 'ERROR', mensaje: 'Credenciales inválidas' });
    }

    const usuario = result.rows[0];

    // Validación de contraseña
    if (usuario.contraseña !== contraseña) {
      return res.status(401).json({ estado: 'ERROR', mensaje: 'Credenciales inválidas' });
    }

    // Generar Token JWT con caducidad de 1 hora
    const token = jwt.sign(
      { 
        id: usuario.id, 
        nombre_usuario: usuario.nombre_usuario, 
        correo: usuario.correo,
        rol: usuario.rol || 'usuario'
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      estado: 'OK',
      mensaje: 'Inicio de sesión exitoso',
      token,
      usuario: {
        id: usuario.id,
        nombre_usuario: usuario.nombre_usuario,
        correo: usuario.correo,
        rol: usuario.rol || 'usuario'
      }
    });
  } catch (error) {
    res.status(500).json({ estado: 'ERROR', mensaje: error.message });
  }
};

// 2. RENOVACIÓN DE TOKEN
const renovarToken = async (req, res) => {
  const { id, nombre_usuario, correo, rol } = req.usuario;

  const nuevoToken = jwt.sign(
    { id, nombre_usuario, correo, rol },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  res.json({
    estado: 'OK',
    mensaje: 'Token renovado exitosamente',
    token: nuevoToken
  });
};

module.exports = {
  login,
  renovarToken
};