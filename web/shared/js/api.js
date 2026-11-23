// Peticiones a la API del mismo servidor.
export async function obtenerJSON(url) {
  const respuesta = await fetch(url, { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) throw new Error(datos.mensaje || `Error ${respuesta.status}`);
  return datos;
}

// Peticiones del panel admin: llevan la cabecera que exige el servidor contra CSRF.
export async function admin(url, { method = 'GET', body } = {}) {
  const respuesta = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      'X-Tanextli-Admin': '1',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    const detalle = datos.errores?.map((e) => `${e.campo}: ${e.problema}`).join(' · ');
    throw new Error(detalle ? `${datos.mensaje} (${detalle})` : datos.mensaje || `Error ${respuesta.status}`);
  }
  return datos;
}
