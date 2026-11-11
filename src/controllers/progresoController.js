// src/controllers/progresoController.js
const db = require('../config/db'); // O tu pool de conexión de pg

// GET /api/progreso/:usuario_id
// Obtiene el progreso general y por palabra de un usuario
exports.obtenerProgresoUsuario = async (req, res) => {
  const { usuario_id } = req.params;

  try {
    const consulta = `
      SELECT 
        p.id,
        p.usuario_id,
        p.categoria_id,
        c.nombre AS categoria_nombre,
        p.palabra_id,
        pal.palabra_nahuatl,
        pal.traduccion,
        p.completado,
        p.veces_practicada,
        p.ultima_practica
      FROM progreso_nino p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN palabras pal ON p.palabra_id = pal.id
      WHERE p.usuario_id = $1
      ORDER BY p.ultima_practica DESC;
    `;

    const { rows } = await db.query(consulta, [usuario_id]);

    return res.status(200).json({
      ok: true,
      total_registros: rows.length,
      progreso: rows
    });
  } catch (error) {
    console.error("Error al obtener progreso:", error);
    return res.status(500).json({ ok: false, error: "Error interno del servidor" });
  }
};

// POST /api/progreso
// Registra o actualiza el progreso de una palabra aprendida/practicada
exports.registrarProgreso = async (req, res) => {
  const { usuario_id, palabra_id, categoria_id, completado } = req.body;

  if (!usuario_id || !palabra_id || !categoria_id) {
    return res.status(400).json({
      ok: false,
      error: "Los campos usuario_id, palabra_id y categoria_id son obligatorios"
    });
  }

  try {
    // Upsert: Si el registro existe lo actualiza e incrementa veces_practicada; si no, lo inserta
    const consultaUpsert = `
      INSERT INTO progreso_nino (usuario_id, palabra_id, categoria_id, completado, veces_practicada, ultima_practica)
      VALUES ($1, $2, $3, COALESCE($4, true), 1, NOW())
      ON CONFLICT (usuario_id, palabra_id) 
      DO UPDATE SET 
        completado = EXCLUDED.completado,
        veces_practicada = progreso_nino.veces_practicada + 1,
        ultima_practica = NOW()
      RETURNING *;
    `;

    const values = [usuario_id, palabra_id, categoria_id, completado];
    const { rows } = await db.query(consultaUpsert, values);

    return res.status(200).json({
      ok: true,
      mensaje: "Progreso registrado correctamente",
      data: rows[0]
    });
  } catch (error) {
    console.error("Error al guardar progreso:", error);
    return res.status(500).json({ ok: false, error: "Error interno al guardar el progreso" });
  }
};