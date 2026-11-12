const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

const adminRoutes = require('./routes/adminRoutes'); // Importar vistas web separadas

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

// Compartir la instancia de pool con los routers externos
app.locals.pool = pool;

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

// ------------------------------------------
// MONTAR LAS RUTAS DE LA PÁGINA WEB Y VISTAS HTML
// ------------------------------------------
app.use('/', adminRoutes);

// ------------------------------------------
// APIS JSON (Consumidas por Flutter y Externos)
// ------------------------------------------

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
// API DE CATÁLOGO (CATEGORÍAS Y PALABRAS)
// ==========================================

app.get('/api/categorias', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nombre, categoria_padre_id, imagen_url FROM categorias ORDER BY id ASC');
    return res.status(200).json({
      estado: 'EXITO',
      total: result.rowCount,
      categorias: result.rows
    });
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    return res.status(500).json({ estado: 'ERROR', error: error.message });
  }
});

app.get('/api/palabras', async (req, res) => {
  const { categoria_id } = req.query;
  try {
    let query = `
      SELECT 
        p.id AS palabra_id,
        p.espanol,
        p.nahuatl,
        p.categoria_id,
        c.nombre AS subcategoria_nombre,
        p.audio_url,
        p.imagen_url
      FROM palabras p
      LEFT JOIN categorias c ON p.categoria_id = c.id
    `;
    const params = [];
    if (categoria_id) {
      query += ' WHERE p.categoria_id = $1';
      params.push(categoria_id);
    }
    query += ' ORDER BY p.id ASC';

    const result = await pool.query(query, params);
    return res.status(200).json({
      estado: 'EXITO',
      total: result.rowCount,
      palabras: result.rows
    });
  } catch (error) {
    console.error('Error al obtener palabras:', error);
    return res.status(500).json({ estado: 'ERROR', error: error.message });
  }
});

// ==========================================
// API DE PROGRESO DE USUARIOS / APRENDIZAJE
// ==========================================

app.get('/api/progreso/:usuario_id', async (req, res) => {
  const { usuario_id } = req.params;

  try {
    const consulta = `
      SELECT 
        p.id,
        p.usuario_id,
        p.categoria_id AS categoria_id,
        c.nombre AS categoria,
        p.palabra_id AS palabra_id,
        pal.nahuatl AS palabra_nahuatl,
        pal.espanol AS palabra_espanol,
        pal.audio_url,
        p.completado,
        p.veces_practicada,
        p.ultima_practica
      FROM progreso_usuarios p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN palabras pal ON p.palabra_id = pal.id
      WHERE p.usuario_id = $1
      ORDER BY p.ultima_practica DESC;
    `;

    const { rows } = await pool.query(consulta, [usuario_id]);

    return res.status(200).json({
      estado: 'EXITO',
      total_registros: rows.length,
      progreso: rows
    });
  } catch (error) {
    console.error("Error al obtener progreso:", error);
    return res.status(500).json({ estado: 'ERROR', error: error.message });
  }
});

app.post('/api/progreso', async (req, res) => {
  const { usuario_id, palabra_id, categoria_id, completado } = req.body;

  if (!usuario_id || !palabra_id || !categoria_id) {
    return res.status(400).json({
      estado: 'ERROR',
      mensaje: "Los campos usuario_id, palabra_id y categoria_id son obligatorios"
    });
  }

  try {
    const consultaUpsert = `
      INSERT INTO progreso_usuarios (usuario_id, palabra_id, categoria_id, completado, veces_practicada, ultima_practica)
      VALUES ($1, $2, $3, COALESCE($4, true), 1, NOW())
      ON CONFLICT (usuario_id, palabra_id) 
      DO UPDATE SET 
        completado = EXCLUDED.completado,
        veces_practicada = progreso_usuarios.veces_practicada + 1,
        ultima_practica = NOW()
      RETURNING *;
    `;

    const values = [usuario_id, palabra_id, categoria_id, completado];
    const { rows } = await pool.query(consultaUpsert, values);

    return res.status(200).json({
      estado: 'EXITO',
      mensaje: "Progreso registrado correctamente",
      data: rows[0]
    });
  } catch (error) {
    console.error("Error al guardar progreso:", error);
    return res.status(500).json({ estado: 'ERROR', error: error.message });
  }
});

// ==========================================
// API Y GESTIÓN DE ADMINISTRADORES Y ROLES
// ==========================================

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

app.get('/api/admin/usuarios', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, nombre_usuario, correo, COALESCE(rol, 'usuario') AS rol, creado_en FROM usuarios ORDER BY id ASC"
    );
    return res.json({ estado: 'EXITO', total: result.rowCount, usuarios: result.rows });
  } catch (err) {
    console.error('Error al obtener usuarios admin:', err);
    return res.status(500).json({ estado: 'ERROR', error: error.message });
  }
});

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

app.listen(PORT, () => {
  console.log(`Servidor Tanextli ejecutándose en el puerto ${PORT}`);
});