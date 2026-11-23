// ¿La petición viene de un dispositivo registrado en la red Tailscale del equipo?
//
// Tailscale Serve agrega la cabecera Tailscale-User-Login cuando la petición llega desde un
// dispositivo de la tailnet, y la elimina si un cliente intenta mandarla por su cuenta.
// Las peticiones que llegan desde internet por Funnel nunca la traen.
const config = require('../config/env');

// Rango de IPs de Tailscale: 100.64.0.0/10 (IPv4) y fd7a:115c:a1e0::/48 (IPv6)
function esIpTailnet(ip) {
  const limpia = String(ip || '').replace(/^::ffff:/, '');
  const v4 = limpia.match(/^100\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (v4) return Number(v4[1]) >= 64 && Number(v4[1]) <= 127;
  return limpia.toLowerCase().startsWith('fd7a:115c:a1e0:');
}

// Correos permitidos (si la lista está vacía, entra cualquier persona de la tailnet).
// Se ignoran valores que no son correos, como "tagged-devices".
function usuariosPermitidos() {
  return config.adminTailnetUsers.filter((u) => u.includes('@'));
}

function identidad(req) {
  const login = (req.get('Tailscale-User-Login') || '').trim().toLowerCase();
  return { login, nombre: req.get('Tailscale-User-Name') || login, ip: req.ip };
}

// Puerto público (Funnel): solo cuenta la identidad de Tailscale, porque ahí también
// llegan peticiones de internet.
function esEquipoEnPuertoPublico(req) {
  const { login } = identidad(req);
  if (!login) return false;
  const lista = usuariosPermitidos();
  return lista.length === 0 || lista.includes(login);
}

// Puerto del panel (127.0.0.1:3010, publicado solo dentro de la tailnet con Tailscale Serve):
// entra quien traiga identidad de Tailscale permitida o, si no la trae, quien venga de una IP
// de la tailnet (dispositivo registrado).
function esEquipoEnPanel(req) {
  if (!config.adminRequireTailscaleIdentity) return true;
  const { login, ip } = identidad(req);
  if (login) return esEquipoEnPuertoPublico(req);
  return esIpTailnet(ip);
}

module.exports = { esIpTailnet, identidad, esEquipoEnPuertoPublico, esEquipoEnPanel };
