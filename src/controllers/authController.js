const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

exports.registro = async (req, res) => {
  const { nombre_usuario, correo, password } = req.body;

  if (!nombre_usuario || !correo || !password) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  try {
    const usuarioExiste = await db.query('SELECT id FROM usuarios WHERE correo = $1', [correo]);
    if (usuarioExiste.rows.length > 0) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const nuevoUsuario = await db.query(
      'INSERT INTO usuarios (nombre_usuario, correo, password_hash) VALUES ($1, $2, $3) RETURNING id, nombre_usuario, correo',
      [nombre_usuario, correo, passwordHash]
    );

    const usuario = nuevoUsuario.rows[0];
    const token = jwt.sign({ id: usuario.id, correo: usuario.correo }, JWT_SECRET, { expiresIn: '7d' });

    return res.status(201).json({ token, usuario });
  } catch (error) {
    console.error('Error en registro:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.login = async (req, res) => {
  const { correo, password } = req.body;

  if (!correo || !password) {
    return res.status(400).json({ error: 'Correo y contraseña requeridos' });
  }

  try {
    const result = await db.query('SELECT * FROM usuarios WHERE correo = $1', [correo]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const usuario = result.rows[0];
    const passwordValido = await bcrypt.compare(password, usuario.password_hash);

    if (!passwordValido) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const token = jwt.sign({ id: usuario.id, correo: usuario.correo }, JWT_SECRET, { expiresIn: '7d' });

    return res.status(200).json({
      token,
      usuario: {
        id: usuario.id,
        nombre_usuario: usuario.nombre_usuario,
        correo: usuario.correo,
      },
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Endpoint exclusivo para JSON (Postman / Flutter)
exports.obtenerUsuarios = async (req, res) => {
  const { correo, nombre } = req.query;

  try {
    let sql = 'SELECT id, nombre_usuario, correo, creado_en FROM usuarios';
    const params = [];
    const condiciones = [];

    if (correo) {
      params.push(`%${correo}%`);
      condiciones.push(`correo ILIKE $${params.length}`);
    }

    if (nombre) {
      params.push(`%${nombre}%`);
      condiciones.push(`nombre_usuario ILIKE $${params.length}`);
    }

    if (condiciones.length > 0) {
      sql += ' WHERE ' + condiciones.join(' AND ');
    }

    sql += ' ORDER BY id ASC';

    const result = await db.query(sql, params);
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return res.status(500).json({ error: 'Error interno al consultar la base de datos' });
  }
};
