const db = require('../config/db');
const bcrypt = require('bcrypt');

exports.registrarUsuarioAdmin = async (req, res) => {
    try {
        const { nombre_usuario, correo, password, rol } = req.body;

        // Validar campos obligatorios
        if (!nombre_usuario || !correo || !password) {
            return res.status(400).json({ error: 'Faltan campos obligatorios: nombre_usuario, correo, password' });
        }

        // Validar rol permitido
        const rolAsignado = ['usuario', 'admin', 'superuser'].includes(rol) ? rol : 'usuario';

        // Encriptar contraseña de forma segura con bcrypt (evita problemas de inicio de sesión)
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // Insertar en la base de datos
        const query = `
            INSERT INTO usuarios (nombre_usuario, correo, password_hash, rol)
            VALUES ($1, $2, $3, $4)
            RETURNING id, nombre_usuario, correo, rol, creado_en;
        `;

        const result = await db.query(query, [nombre_usuario, correo, password_hash, rolAsignado]);

        res.status(201).json({
            mensaje: 'Usuario administrativo registrado exitosamente con coordenadas seguras',
            usuario: result.rows[0]
        });

    } catch (error) {
        console.error('Error al registrar usuario admin:', error);
        if (error.code === '23505') {
            return res.status(400).json({ error: 'El correo electrónico ya está registrado.' });
        }
        res.status(500).json({ error: 'Error interno del servidor al procesar el registro.' });
    }
};