const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'tanextli_admin_2026';

const verificarAdminPassword = (req, res, next) => {
  const passEnviado = req.query.admin_pass || req.headers['x-admin-key'];

  if (!passEnviado || passEnviado !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Acceso denegado: Contraseña de administrador inválida' });
  }

  next();
};

module.exports = { verificarAdminPassword };
