// Portal: estadísticas en vivo y lista de endpoints.
import { el, contarHasta, copiar, activarRevelado } from '/portal/assets/js/ui.js';
import { icono } from '/portal/assets/js/iconos.js';
import { obtenerJSON } from '/portal/assets/js/api.js';

function contarArchivos(estructura) {
  return estructura.reduce((total, item) => total + (item.tipo === 'carpeta' ? contarArchivos(item.contenido) : 1), 0);
}

async function cargarEstadisticas() {
  const tareas = {
    audios: obtenerJSON('/api/v1/media-list').then((d) => contarArchivos(d.estructura || [])),
    imagenes: obtenerJSON('/api/v1/imagenes').then((d) => d.total),
    palabras: obtenerJSON('/api/v1/palabras').then((d) => d.total),
    categorias: obtenerJSON('/api/v1/categorias').then((d) => d.categorias.filter((c) => !c.categoria_padre_id).length),
  };

  await Promise.all(Object.entries(tareas).map(async ([clave, promesa]) => {
    const nodo = document.querySelector(`[data-estadistica="${clave}"]`);
    try {
      contarHasta(nodo, Number(await promesa) || 0);
    } catch {
      nodo.textContent = '—';
      nodo.title = 'No disponible en este momento';
    }
  }));
}

const ENDPOINTS = [
  ['GET', '/api/v1/categorias'],
  ['GET', '/api/v1/palabras?categoria_id=10'],
  ['GET', '/api/v1/media-list'],
  ['GET', '/api/v1/imagenes?categoria=animales'],
  ['POST', '/api/v1/login'],
  ['POST', '/api/v1/progreso'],
];

function pintarEndpoints() {
  const contenedor = document.getElementById('endpoints');
  ENDPOINTS.forEach(([metodo, ruta]) => {
    const url = `${location.origin}${ruta}`;
    contenedor.append(el('div', { class: 'endpoint' }, [
      el('span', { class: `metodo ${metodo === 'POST' ? 'post' : ''}`, text: metodo }),
      el('code', { text: ruta, title: url }),
      el('button', {
        class: 'mini-boton', type: 'button', 'aria-label': `Copiar ${ruta}`,
        onclick: () => copiar(url, 'URL copiada'),
      }, [icono('copiar')]),
    ]));
  });
}

pintarEndpoints();
cargarEstadisticas();
activarRevelado();
