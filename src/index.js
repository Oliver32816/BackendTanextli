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
  host: process.env.DB_HOST || 'localhost',
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

// Endpoint GET para listar usuarios en JSON
app.get('/api/usuarios', async (req, res) => {
  try {
    const result = await pool.query("SELECT id, nombre_usuario, correo, rol, creado_en FROM usuarios WHERE rol != 'superuser' ORDER BY id ASC");
    res.json({ estado: 'OK', total: result.rowCount, usuarios: result.rows });
  } catch (err) {
    res.status(500).json({ estado: 'ERROR', error: err.message });
  }
});

// API DE REGISTRO ESTÁNDAR
app.post('/api/registro', async (req, res) => {
  try {
    const { nombre_usuario, correo, password } = req.body;

    if (!nombre_usuario || !correo || !password) {
      return res.status(400).json({ estado: 'ERROR', mensaje: 'Faltan campos obligatorios.' });
    }

    const usuarioExistente = await pool.query('SELECT id FROM usuarios WHERE correo = $1', [correo]);
    if (usuarioExistente.rowCount > 0) {
      return res.status(409).json({ estado: 'ERROR', mensaje: 'El correo electrónico ya se encuentra registrado.' });
    }

    const queryInsert = `
      INSERT INTO usuarios (nombre_usuario, correo, password_hash, rol, creado_en)
      VALUES ($1, $2, $3, 'usuario', NOW())
      RETURNING id, nombre_usuario, correo, rol, creado_en
    `;
    const nuevoUsuario = await pool.query(queryInsert, [nombre_usuario, correo, password]);

    return res.status(201).json({ estado: 'EXITO', mensaje: 'Usuario registrado correctamente.', usuario: nuevoUsuario.rows[0] });
  } catch (err) {
    console.error('Error en registro:', err);
    return res.status(500).json({ estado: 'ERROR', error: err.message });
  }
});

// API DE LOGIN
app.post('/api/login', async (req, res) => {
  try {
    const { correo, password } = req.body;
    if (!correo || !password) {
      return res.status(400).json({ estado: 'ERROR', mensaje: 'Faltan campos obligatorios.' });
    }

    const resultado = await pool.query('SELECT id, nombre_usuario, correo, password_hash, rol, creado_en FROM usuarios WHERE correo = $1', [correo]);
    if (resultado.rowCount === 0 || resultado.rows[0].password_hash !== password) {
      return res.status(401).json({ estado: 'ERROR', mensaje: 'Correo electrónico o contraseña incorrectos.' });
    }

    const usuario = resultado.rows[0];
    return res.status(200).json({
      estado: 'EXITO',
      mensaje: 'Inicio de sesión exitoso.',
      usuario: { id: usuario.id, nombre_usuario: usuario.nombre_usuario, correo: usuario.correo, rol: usuario.rol, creado_en: usuario.creado_en }
    });
  } catch (err) {
    console.error('Error en login:', err);
    return res.status(500).json({ estado: 'ERROR', error: err.message });
  }
});

// ==========================================
// API Y GESTIÓN DE ADMINISTRADORES Y ROLES
// ==========================================

// Endpoint POST para registrar administradores o superusuarios de forma segura
app.post('/api/admin/registrar-usuario', async (req, res) => {
  try {
    const { nombre_usuario, correo, password, rol } = req.body;

    if (!nombre_usuario || !correo || !password) {
      return res.status(400).json({ estado: 'ERROR', mensaje: 'Faltan campos obligatorios.' });
    }

    const rolAsignado = ['usuario', 'admin', 'superuser'].includes(rol) ? rol : 'usuario';

    const usuarioExistente = await pool.query('SELECT id FROM usuarios WHERE correo = $1', [correo]);
    if (usuarioExistente.rowCount > 0) {
      return res.status(409).json({ estado: 'ERROR', mensaje: 'El correo electrónico ya se encuentra registrado.' });
    }

    const queryInsert = `
      INSERT INTO usuarios (nombre_usuario, correo, password_hash, rol, creado_en)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING id, nombre_usuario, correo, rol, creado_en
    `;
    const nuevoUsuario = await pool.query(queryInsert, [nombre_usuario, correo, password, rolAsignado]);

    return res.status(201).json({
      estado: 'EXITO',
      mensaje: `Usuario con rol '${rolAsignado}' registrado correctamente.`,
      usuario: nuevoUsuario.rows[0]
    });
  } catch (err) {
    console.error('Error en registro administrativo:', err);
    return res.status(500).json({ estado: 'ERROR', error: err.message });
  }
});

// 1. Obtener todos los usuarios (JSON)
app.get('/api/admin/usuarios', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, nombre_usuario, correo, COALESCE(rol, 'usuario') AS rol, creado_en FROM usuarios ORDER BY id ASC"
    );
    return res.json({ estado: 'EXITO', total: result.rowCount, usuarios: result.rows });
  } catch (err) {
    console.error('Error al obtener usuarios admin:', err);
    return res.status(500).json({ estado: 'ERROR', error: err.message });
  }
});

// 2. Actualizar datos o rol de un usuario por ID
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
    const resultado = await pool.query(query, [nombre_usuario, correo, rol, id]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ estado: 'ERROR', mensaje: 'Usuario no encontrado.' });
    }

    return res.json({ estado: 'EXITO', mensaje: 'Usuario actualizado correctamente', usuario: resultado.rows[0] });
  } catch (err) {
    console.error('Error al actualizar usuario:', err);
    return res.status(500).json({ estado: 'ERROR', error: err.message });
  }
});

// 3. Eliminar un usuario por ID
app.delete('/api/admin/usuarios/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const resultado = await pool.query('DELETE FROM usuarios WHERE id = $1 RETURNING id, nombre_usuario', [id]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ estado: 'ERROR', mensaje: 'Usuario no encontrado.' });
    }

    return res.json({ estado: 'EXITO', mensaje: 'Usuario eliminado correctamente de la base de datos', idEliminado: id });
  } catch (err) {
    console.error('Error al eliminar usuario:', err);
    return res.status(500).json({ estado: 'ERROR', error: err.message });
  }
});

// ==========================================
// INTERFACES VISUALES HTML (Admin y Multimedia)
// ==========================================

// Interfaz visual privada protegida por contraseña maestra para registrar administradores
app.get('/admin/registro', (req, res) => {
  const passwordMaestra = req.query.pwd;
  const PASSWORD_ADMIN = 'TanextliAdmin2026$'; // Contraseña maestra para acceder al registro

  if (passwordMaestra !== PASSWORD_ADMIN) {
    return res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Tanextli - Acceso Restringido</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; background: #f4f7f6; color: #333; display: flex; justify-content: center; align-items: center; height: 80vh; }
          .container { max-width: 400px; width: 100%; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); text-align: center; }
          h1 { color: #c0392b; font-size: 1.3rem; margin-bottom: 20px; }
          input { width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 1rem; box-sizing: border-box; margin-bottom: 15px; }
          .btn { width: 100%; background: #1a5276; color: white; padding: 10px; border: none; border-radius: 6px; font-size: 1rem; font-weight: bold; cursor: pointer; }
          .btn:hover { opacity: 0.9; }
          .error { color: #c0392b; font-weight: bold; margin-bottom: 15px; font-size: 0.95rem; }
          .back { margin-top: 20px; display: block; color: #2980b9; text-decoration: none; font-size: 0.9rem; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🔒 Acceso Restringido - Admin</h1>
          ${passwordMaestra !== undefined ? '<div class="error">Contraseña incorrecta, acceso denegado</div>' : ''}
          <form method="GET" action="/admin/registro">
            <input type="password" name="pwd" placeholder="Introduce la contraseña maestra" required>
            <button type="submit" class="btn">Acceder al Registro</button>
          </form>
          <a href="/admin/usuarios" class="back">← Volver a la tabla de usuarios</a>
        </div>
      </body>
      </html>
    `);
  }

  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Tanextli - Registro Administrativo</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; background: #f4f7f6; color: #333; }
        .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        h1 { color: #1a5276; margin-top: 0; font-size: 1.5rem; margin-bottom: 20px; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; font-weight: 600; color: #2c3e50; }
        input, select { width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 1rem; box-sizing: border-box; }
        .btn { display: block; width: 100%; background: #27ae60; color: white; padding: 12px; border: none; border-radius: 6px; font-size: 1rem; font-weight: bold; cursor: pointer; }
        .btn:hover { opacity: 0.9; }
        .links { margin-top: 20px; text-align: center; }
        .links a { color: #2980b9; text-decoration: none; font-weight: 500; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🛠️ Tanextli - Registro Privado de Admin</h1>
        <form id="adminForm">
          <div class="form-group">
            <label for="nombre_usuario">Nombre de Usuario:</label>
            <input type="text" id="nombre_usuario" name="nombre_usuario" required>
          </div>
          <div class="form-group">
            <label for="correo">Correo Electrónico:</label>
            <input type="email" id="correo" name="correo" required>
          </div>
          <div class="form-group">
            <label for="password">Contraseña:</label>
            <input type="password" id="password" name="password" required>
          </div>
          <div class="form-group">
            <label for="rol">Rol de Usuario:</label>
            <select id="rol" name="rol">
              <option value="usuario">Usuario Estándar</option>
              <option value="admin">Administrador (admin)</option>
              <option value="superuser">Superusuario (superuser)</option>
            </select>
          </div>
          <button type="submit" class="btn">Registrar Usuario con Rol</button>
        </form>
        <div id="resultado" style="margin-top: 15px; font-weight: bold; text-align: center;"></div>
        <div class="links">
          <a href="/admin/usuarios">← Ver Tabla de Usuarios</a>
        </div>
      </div>
      <script>
        document.getElementById('adminForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const data = {
            nombre_usuario: document.getElementById('nombre_usuario').value,
            correo: document.getElementById('correo').value,
            password: document.getElementById('password').value,
            rol: document.getElementById('rol').value
          };
          const res = await fetch('/api/admin/registrar-usuario', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          const result = await res.json();
          const resDiv = document.getElementById('resultado');
          if (res.ok) {
            resDiv.style.color = '#27ae60';
            resDiv.innerText = '¡Éxito! ' + result.mensaje;
            document.getElementById('adminForm').reset();
          } else {
            resDiv.style.color = '#c0392b';
            resDiv.innerText = 'Error: ' + (result.error || result.mensaje);
          }
        });
      </script>
    </body>
    </html>
  `);
});

app.get('/admin/usuarios', async (req, res) => {
  try {
    const result = await pool.query("SELECT id, nombre_usuario, correo, rol, creado_en FROM usuarios ORDER BY id ASC");
    let filasHTML = '';

    if (result.rows.length === 0) {
      filasHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: #7f8c8d;">No hay usuarios registrados en la base de datos.</td></tr>`;
    } else {
      result.rows.forEach(u => {
        // Formateo de fecha ajustado a la zona horaria de México (America/Mexico_City)
        const fechaLocal = u.creado_en 
          ? new Date(u.creado_en).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }) 
          : 'N/A';

        filasHTML += `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px 15px;">${u.id}</td>
            <td style="padding: 12px 15px; font-weight: 500; color: #2c3e50;">${u.nombre_usuario || 'N/A'}</td>
            <td style="padding: 12px 15px; color: #7f8c8d;">${u.correo || 'N/A'}</td>
            <td style="padding: 12px 15px;"><span style="background: ${u.rol === 'superuser' ? '#8e44ad' : u.rol === 'admin' ? '#e67e22' : '#2980b9'}; color: white; padding: 3px 8px; border-radius: 4px; font-size: 0.85rem;">${u.rol}</span></td>
            <td style="padding: 12px 15px; color: #95a5a6; font-size: 0.9rem;">${fechaLocal}</td>
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
          .btn-warning { background: #d35400; }
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
            <a href="/admin/registro" class="btn btn-warning">+ Registrar Nuevo Admin / Superuser</a>
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
