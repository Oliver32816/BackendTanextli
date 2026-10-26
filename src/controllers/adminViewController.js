const db = require('../config/db');

// 1. Vista HTML pública existente (Lectura general)
exports.verTablaUsuarios = async (req, res) => {
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
    const usuarios = result.rows;

    let filasHtml = usuarios.map(u => `
      <tr>
        <td><strong>#${u.id}</strong></td>
        <td>${u.nombre_usuario}</td>
        <td>${u.correo}</td>
        <td>${new Date(u.creado_en).toLocaleString()}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Panel Admin - Tanextli</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0f2f5; margin: 0; padding: 40px 20px; color: #1a1a1a; }
          .container { max-width: 950px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #edf2f7; padding-bottom: 16px; margin-bottom: 24px; }
          h2 { margin: 0; color: #1a202c; font-size: 24px; }
          .badge { background: #319795; color: white; font-size: 13px; font-weight: 600; padding: 4px 12px; border-radius: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background-color: #2d3748; color: #f7fafc; text-align: left; padding: 14px 16px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; }
          th:first-child { border-top-left-radius: 8px; }
          th:last-child { border-top-right-radius: 8px; }
          td { padding: 14px 16px; border-bottom: 1px solid #e2e8f0; font-size: 15px; }
          tr:hover { background-color: #f7fafc; }
          .empty-msg { text-align: center; padding: 30px; color: #718096; font-style: italic; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Panel de Administración - Usuarios</h2>
            <span class="badge">Tanextli Vista HTML</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Usuario</th>
                <th>Correo Electrónico</th>
                <th>Fecha de Registro</th>
              </tr>
            </thead>
            <tbody>
              ${filasHtml.length > 0 ? filasHtml : '<tr><td colspan="4" class="empty-msg">No hay usuarios registrados en la base de datos</td></tr>'}
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (error) {
    console.error('Error al generar vista HTML:', error);
    return res.status(500).send('<h3>Error interno al generar la tabla HTML</h3>');
  }
};

// 2. API JSON: Obtener todos los usuarios para el Frontend
exports.obtenerUsuariosAdmin = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, nombre_usuario, correo, COALESCE(rol, 'usuario') AS rol, creado_en FROM usuarios ORDER BY id ASC"
    );
    return res.json({ estado: 'EXITO', total: result.rowCount, usuarios: result.rows });
  } catch (err) {
    console.error('Error al obtener usuarios admin:', err);
    return res.status(500).json({ estado: 'ERROR', error: err.message });
  }
};

// 3. API JSON: Actualizar datos o rol de un usuario por ID
exports.actualizarUsuarioAdmin = async (req, res) => {
  const { id } = req.params;
  const { nombre_usuario, correo, rol } = req.body;

  try {
    const query = `
      UPDATE usuarios 
      SET nombre_usuario = COALESCE($1, nombre_usuario),
          correo = COALESCE($2, correo),
          rol = COALESCE($3, rol)
      WHERE id = $4
      RETURNING id, nombre_usuario, correo, rol, creado_en
    `;
    const values = [nombre_usuario, correo, rol, id];
    const resultado = await db.query(query, values);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ estado: 'ERROR', mensaje: 'Usuario no encontrado.' });
    }

    return res.json({
      estado: 'EXITO',
      mensaje: 'Usuario actualizado correctamente',
      usuario: resultado.rows[0]
    });
  } catch (err) {
    console.error('Error al actualizar usuario:', err);
    return res.status(500).json({ estado: 'ERROR', error: err.message });
  }
};

// 4. API JSON: Eliminar un usuario por ID
exports.eliminarUsuarioAdmin = async (req, res) => {
  const { id } = req.params;

  try {
    const resultado = await db.query('DELETE FROM usuarios WHERE id = $1 RETURNING id, nombre_usuario', [id]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ estado: 'ERROR', mensaje: 'Usuario no encontrado.' });
    }

    return res.json({
      estado: 'EXITO',
      mensaje: 'Usuario eliminado correctamente de la base de datos',
      idEliminado: id
    });
  } catch (err) {
    console.error('Error al eliminar usuario:', err);
    return res.status(500).json({ estado: 'ERROR', error: err.message });
  }
};