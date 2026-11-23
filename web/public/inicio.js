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

// Todas las rutas funcionan también con el prefijo /api/v1
const ENDPOINTS = [
  ['Cuenta', [
    ['POST', '/api/registro', 'Crea una cuenta (nombre_usuario, correo, password)'],
    ['POST', '/api/login', 'Inicia sesión (correo, password); devuelve el usuario y un token'],
    ['GET', '/api/perfil', 'Usuario de la sesión (Authorization: Bearer <token>)'],
  ]],
  ['Progreso', [
    ['GET', '/api/progreso/1', 'Progreso de un usuario por su id'],
    ['POST', '/api/progreso', 'Guarda una palabra practicada (usuario_id, palabra_id, categoria_id, completado)'],
  ]],
  ['Contenido', [
    ['GET', '/api/categorias', 'Categorías y subcategorías'],
    ['GET', '/api/palabras?categoria_id=9', 'Palabras en español y náhuatl de una categoría'],
    ['GET', '/api/mascota/frases', 'Frases de Lobita'],
  ]],
  ['Multimedia', [
    ['GET', '/api/media-list', 'Carpetas y archivos de audio'],
    ['GET', '/api/imagenes?categoria=animales', 'Imágenes con su URL'],
  ]],
  ['Solo equipo (red Tailscale)', [
    ['GET', '/api/usuarios', 'Usuarios registrados'],
    ['GET', '/api/progreso', 'Progreso de todos los usuarios'],
  ]],
];

function pintarEndpoints() {
  const contenedor = document.getElementById('endpoints');
  ENDPOINTS.forEach(([grupo, rutas]) => {
    contenedor.append(el('h4', { class: 'grupo-endpoints', text: grupo }));
    rutas.forEach(([metodo, ruta, descripcion]) => {
      const url = `${location.origin}${ruta}`;
      contenedor.append(el('div', { class: 'endpoint', title: descripcion }, [
        el('span', { class: `metodo ${metodo === 'POST' ? 'post' : ''}`, text: metodo }),
        el('div', { class: 'endpoint-texto' }, [
          el('code', { text: ruta, title: url }),
          el('small', { text: descripcion }),
        ]),
        el('button', {
          class: 'mini-boton', type: 'button', 'aria-label': `Copiar ${ruta}`,
          onclick: () => copiar(url, 'URL copiada'),
        }, [icono('copiar')]),
      ]));
    });
  });
}

pintarEndpoints();
cargarEstadisticas();
activarRevelado();
