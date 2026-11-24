// Revisa que el dominio de un correo exista y pueda recibir correos (registros MX del DNS).
// Así se detectan correos inventados o con errores de escritura antes de crear la cuenta.
// Si el DNS no responde, NO se bloquea el registro: el código por correo es la prueba final.
const dns = require('dns').promises;

// Errores frecuentes al escribir dominios conocidos
const SUGERENCIAS = {
  'gmial.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gmail.co': 'gmail.com',
  'gmail.con': 'gmail.com', 'gmai.com': 'gmail.com', 'gnail.com': 'gmail.com', 'gmaill.com': 'gmail.com',
  'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmail.con': 'hotmail.com', 'hotmai.com': 'hotmail.com',
  'outlok.com': 'outlook.com', 'outlook.con': 'outlook.com', 'outllok.com': 'outlook.com',
  'yahoo.con': 'yahoo.com', 'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com',
  'icloud.con': 'icloud.com', 'iclod.com': 'icloud.com',
};

const conTiempo = (promesa, ms) => Promise.race([
  promesa,
  new Promise((_, rechazar) => setTimeout(() => rechazar(Object.assign(new Error('timeout'), { code: 'ETIMEOUT' })), ms)),
]);

// Devuelve { valido: true } o { valido: false, motivo, sugerencia? }
async function revisarDominio(correo) {
  const dominio = String(correo || '').split('@')[1]?.trim().toLowerCase();
  if (!dominio || !dominio.includes('.')) return { valido: false, motivo: 'El correo no tiene un dominio válido.' };

  if (SUGERENCIAS[dominio]) {
    return { valido: false, motivo: `¿Quisiste decir ${correo.split('@')[0]}@${SUGERENCIAS[dominio]}?`, sugerencia: SUGERENCIAS[dominio] };
  }

  try {
    const mx = await conTiempo(dns.resolveMx(dominio), 4000);
    // "MX nulo" (RFC 7505): el dominio declara que no recibe correos
    const recibe = mx.some((r) => r.exchange && r.exchange !== '.');
    return recibe ? { valido: true } : { valido: false, motivo: `El dominio ${dominio} no recibe correos.` };
  } catch (err) {
    if (err.code === 'ENOTFOUND' || err.code === 'ENODATA' || err.code === 'NXDOMAIN') {
      return { valido: false, motivo: `El dominio ${dominio} no existe o no recibe correos. Revisa que esté bien escrito.` };
    }
    console.warn(`[correo] No se pudo revisar el dominio ${dominio}: ${err.code || err.message}`);
    return { valido: true };
  }
}

module.exports = { revisarDominio };
