const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Configuración de conexión a PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'tanextli_db',
  port: process.env.DB_PORT || 5432,
});

const multimediaPath = '/home/olo/tanextli-project/Multimedia/AudiosTanextli';

app.use('/multimedia/AudiosTanextli', express.static(multimediaPath));
app.use('/media', express.static(multimediaPath));

function scanDirectory(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results.push({ tipo: 'carpeta', nombre: file, contenido: scanDirectory(filePath) });
    } else {
      results.push({ tipo: 'archivo', nombre: file });
    }
  });
  return results;
}

app.get('/api/media-list', (req, res) => {
  try {
    res.json({ estado: 'OK', estructura: scanDirectory(multimediaPath) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint GET para listar usuarios en JSON (Excluyendo superuser por seguridad o mostrando rol)
app.get('/api/usuarios', async (req, res) => {
  try {
    const result = await pool.query("SELECT id, nombre_usuario, correo, rol, creado_en FROM usuarios WHERE rol != 'superuser' ORDER BY id ASC");
    res.json({ estado: 'OK', total: result.rowCount, usuarios: result.rows });
  } catch (err) {
    res.status(500).json({ estado: 'ERROR', error: err.message });
  }
});

// API DE REGISTRO (POST /api/registro) - Asigna rol por defecto 'usuario'
app.post('/api/registro', async (req, res) => {
  try {
    const { nombre_usuario, correo, password } = req.body;

    if (!nombre_usuario || !correo || !password) {
      return res.status(400).json({ 
        estado: 'ERROR', 
        mensaje: 'Faltan campos obligatorios: nombre_usuario, correo y password.' 
      });
    }

    const usuarioExistente = await pool.query('SELECT id FROM usuarios WHERE correo = $1', [correo]);
    if (usuarioExistente.rowCount > 0) {
      return res.status(409).json({ 
        estado: 'ERROR', 
        mensaje: 'El correo electrónico ya se encuentra registrado.' 
      });
    }

    const queryInsert = `
      INSERT INTO usuarios (nombre_usuario, correo, password_hash, rol, creado_en) 
      VALUES ($1, $2, $3, 'usuario', NOW()) 
      RETURNING id, nombre_usuario, correo, rol, creado_en
    `;
    const values = [nombre_usuario, correo, password];
    const nuevoUsuario = await pool.query(queryInsert, values);

    return res.status(201).json({
      estado: 'EXITO',
      mensaje: 'Usuario registrado correctamente.',
      usuario: nuevoUsuario.rows[0]
    });

  } catch (err) {
    console.error('Error en registro:', err);
    return res.status(500).json({ estado: 'ERROR', error: err.message });
  }
});

// API DE LOGIN (POST /api/login) - Devuelve el rol
app.post('/api/login', async (req, res) => {
  try {
    const { correo, password } = req.body;

    if (!correo || !password) {
      return res.status(400).json({ 
        estado: 'ERROR', 
        mensaje: 'Faltan campos obligatorios: correo y password.' 
      });
    }

    const resultado = await pool.query(
      'SELECT id, nombre_usuario, correo, password_hash, rol, creado_en FROM usuarios WHERE correo = $1',
      [correo]
    );

    if (resultado.rowCount === 0) {
      return res.status(401).json({ 
        estado: 'ERROR', 
        mensaje: 'Correo electrónico o contraseña incorrectos.' 
      });
    }

    const usuario = resultado.rows[0];

    if (usuario.password_hash !== password) {
      return res.status(401).json({ 
        estado: 'ERROR', 
        mensaje: 'Correo electrónico o contraseña incorrectos.' 
      });
    }

    return res.status(200).json({
      estado: 'EXITO',
      mensaje: 'Inicio de sesión exitoso.',
      usuario: {
        id: usuario.id,
        nombre_usuario: usuario.nombre_usuario,
        correo: usuario.correo,
        rol: usuario.rol,
        creado_en: usuario.creado_en
      }
    });

  } catch (err) {
    console.error('Error en login:', err);
    return res.status(500).json({ estado: 'ERROR', error: err.message });
  }
});

// ==========================================
// ENDPOINTS DE ADMINISTRACIÓN Y CONTROL ABSOLUTO
// ==========================================

// 1. Obtener todos los usuarios para administración (vía API JSON)
app.get('/api/admin/usuarios', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, nombre_usuario, correo, COALESCE(rol, 'usuario') AS rol, creado_en FROM usuarios ORDER BY id ASC"
    );
    res.json({ estado: 'EXITO', total: result.rowCount, usuarios: result.rows });
  } catch (err) {
    console.error('Error al obtener usuarios admin:', err);
    res.status(500).json({ estado: 'ERROR', error: err.message });
  }
});

// 2. Actualizar datos o rol de un usuario por ID (Control absoluto)
app.put('/api/admin/usuarios/:id', async (req, res) => {
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
    const resultado = await pool.query(query, values);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ estado: 'ERROR', mensaje: 'Usuario no encontrado.' });
    }

    res.json({
      estado: 'EXITO',
      mensaje: 'Usuario actualizado correctamente',
      usuario: resultado.rows[0]
    });
  } catch (err) {
    console.error('Error al actualizar usuario:', err);
    res.status(500).json({ estado: 'ERROR', error: err.message });
  }
});

// 3. Eliminar un usuario de la base de datos por ID
app.delete('/api/admin/usuarios/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const resultado = await pool.query('DELETE FROM usuarios WHERE id = $1 RETURNING id, nombre_usuario', [id]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ estado: 'ERROR', mensaje: 'Usuario no encontrado.' });
    }

    res.json({
      estado: 'EXITO',
      mensaje: 'Usuario eliminado correctamente de la base de datos',
      idEliminado: id
    });
  } catch (err) {
    console.error('Error al eliminar usuario:', err);
    res.status(500).json({ estado: 'ERROR', error: err.message });
  }
});

// ==========================================
// INTERFACES VISUALES HTML (Admin y Multimedia)
// ==========================================

// Interfaz visual en tabla para administración (Ocultando al superuser)
app.get('/admin/usuarios', async (req, res) => {
  try {
    const result = await pool.query("SELECT id, nombre_usuario, correo, rol, creado_en FROM usuarios WHERE rol != 'superuser' ORDER BY id ASC");
    let filasHTML = '';
    
    if (result.rows.length === 0) {
      filasHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: #7f8c8d;">No hay usuarios registrados en la base de datos.</td></tr>`;
    } else {
      result.rows.forEach(u => {
        filasHTML += `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px 15px;">${u.id}</td>
            <td style="padding: 12px 15px; font-weight: 500; color: #2c3e50;">${u.nombre_usuario || 'N/A'}</td>
            <td style="padding: 12px 15px; color: #7f8c8d;">${u.correo || 'N/A'}</td>
            <td style="padding: 12px 15px;"><span style="background: ${u.rol === 'admin' ? '#e67e22' : '#2980b9'}; color: white; padding: 3px 8px; border-radius: 4px; font-size: 0.85rem;">${u.rol}</span></td>
            <td style="padding: 12px 15px; color: #95a5a6; font-size: 0.9rem;">${u.creado_en ? new Date(u.creado_en).toLocaleString() : 'N/A'}</td>
          </tr>
        `;
      });
    }

    res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Tanextli - Gestión de Usuarios</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; background: #f4f7f6; color: #333; }
          .container { max-width: 1000px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
          h1 { color: #1a5276; margin-top: 0; font-size: 1.8rem; display: flex; align-items: center; gap: 10px; }
          .btn { display: inline-block; background: #2980b9; color: white; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-bottom: 25px; margin-right: 10px; }
          .btn-success { background: #27ae60; }
          .btn:hover { opacity: 0.9; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
          th { background: #1a5276; color: white; text-align: left; padding: 12px 15px; font-size: 0.95rem; }
          tr:hover { background: #f8fafc; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>👥 Tanextli - Usuarios Registrados</h1>
          <div>
            <a href="/api/usuarios" class="btn" target="_blank">Ver JSON de Usuarios</a>
            <a href="/api/media" class="btn btn-success">Ir a Multimedia</a>
          </div>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre de Usuario</th>
                <th>Correo Electrónico</th>
                <th>Rol</th>
                <th>Fecha de Creación</th>
              </tr>
            </thead>
            <tbody>
              ${filasHTML}
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send(`Error al consultar usuarios: ${err.message}`);
  }
});

// Interfaz visual multimedia en /api/media
app.get('/api/media', (req, res) => {
  try {
    const estructura = scanDirectory(multimediaPath);
    function generarHTML(items, rutaRelativa = '') {
      let html = '';
      items.forEach(item => {
        if (item.tipo === 'carpeta') {
          html += `<div style="margin-left: 20px; margin-top: 20px;"><h3 style="color: #2c3e50; font-size: 1.25rem; font-weight: bold; margin-bottom: 10px;">📁 ${item.nombre}</h3>${generarHTML(item.contenido, path.join(rutaRelativa, item.nombre))}</div>`;
        } else {
          const subRuta = path.join(rutaRelativa, item.nombre).replace(/\\/g, '/');
          const urlAudio = `/multimedia/AudiosTanextli/${subRuta}`;
          const nombreSinExt = item.nombre.replace(/\.[^/.]+$/, "");
          html += `<div style="margin-left: 25px; margin-bottom: 10px; display: flex; align-items: center; gap: 15px; background: #f8f9fa; padding: 10px 15px; border-radius: 8px; max-width: 700px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);"><span style="font-weight: 600; min-width: 150px; color: #2c3e50; display: flex; align-items: center; gap: 8px;">🎵 ${nombreSinExt}</span><audio controls src="${urlAudio}" style="height: 36px; width: 100%;"></audio></div>`;
        }
      });
      return html;
    }
    const contenidoHtml = generarHTML(estructura);
    res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Tanextli - Audios Disponibles</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; background: #f4f7f6; color: #333; }
          .container { max-width: 1000px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
          h1 { color: #1a5276; margin-top: 0; font-size: 1.8rem; display: flex; align-items: center; gap: 10px; }
          .btn { display: inline-block; background: #27ae60; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-bottom: 25px; margin-right: 10px; }
          .btn-users { background: #2980b9; }
          .btn:hover { opacity: 0.9; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🎧 Tanextli - Audios Disponibles</h1>
          <div>
            <a href="/api/media-list" class="btn" target="_blank">Ver respuesta JSON</a>
            <a href="/admin/usuarios" class="btn btn-users">Ver Tabla de Usuarios</a>
          </div>
          <hr style="border:0; border-top:1px solid #eaeaea; margin:20px 0;">
          <div>${contenidoHtml}</div>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send(`Error al renderizar: ${err.message}`);
  }
});

app.get('/', (req, res) => {
  res.redirect('/api/media');
});

app.listen(PORT, () => {
  console.log(`Servidor Tanextli ejecutándose en el puerto ${PORT}`);
});