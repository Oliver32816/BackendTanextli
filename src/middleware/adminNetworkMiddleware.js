module.exports = (req, res, next) => {
    const clientIp = req.ip || req.connection.remoteAddress;
    
    // Permitir localhost y red interna/Tailscale (ajusta el rango según tu IP de Tailscale si es necesario)
    const isLocal = clientIp.includes('127.0.0.1') || clientIp.includes('::1') || clientIp.includes('100.'); // Tailscale IPs suelen empezar con 100.

    if (!isLocal) {
        return res.status(403).json({ error: 'Acceso denegado: Esta ruta de administración es privada y segura.' });
    }
    next();
};