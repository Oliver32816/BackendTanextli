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
    ['POST', '/api/auth/google', 'Continuar con Google (credential): crea la cuenta o inicia sesión; devuelve token'],
    ['GET', '/api/perfil', 'Usuario de la sesión (Authorization: Bearer <token>)'],
    ['PUT', '/api/perfil/password', 'Cambia la contraseña (password_actual, password_nueva) con token'],
  ]],
  ['Progreso (id del usuario o "yo" con su token)', [
    ['GET', '/api/progreso/1/categorias', 'Avance de cada categoría: porcentaje y siguiente lección'],
    ['GET', '/api/progreso/1/categorias/familia', 'Lecciones con estado (completada, disponible, bloqueada) y desempeño'],
    ['POST', '/api/progreso/lecciones', 'Lección terminada con sus actividades y palabras (una sola llamada)'],
    ['GET', '/api/progreso/1/lecciones', 'Lecciones completadas: { familia: [1, 2], colores: [1] }'],
    ['GET', '/api/progreso/1/resumen', 'Avance por categoría: lecciones y palabras practicadas'],
    ['GET', '/api/progreso/1', 'Palabras practicadas, veces y mejor puntaje'],
    ['POST', '/api/progreso', 'Guarda una palabra practicada (usuario_id, palabra_id, categoria_id, completado, puntaje)'],
    ['DELETE', '/api/progreso/yo', 'Reinicia todo el avance (requiere token)'],
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
        el('span', { class: `metodo ${{ POST: 'post', DELETE: 'delete' }[metodo] || ''}`, text: metodo }),
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
// ---------- Palabras que cambian en las burbujas (igual que el login de la app) ----------
// Las tres burbujas junto a Lobita muestran el vocabulario real (GET /api/v1/palabras),
// cambiando una por una cada 1.6 s, sin repetir las que se están viendo.
const CAMBIO_PALABRA_MS = 1600;

function armarVocabulario(palabras) {
  const vistas = new Set();
  const lista = [];
  palabras.forEach((p) => {
    if (!p.nahuatl || !p.espanol) return;
    const clave = p.nahuatl.trim().toLowerCase();
    if (vistas.has(clave)) return;
    vistas.add(clave);
    lista.push({ nahuatl: p.nahuatl.trim(), espanol: /^\d+$/.test(p.espanol) ? `Número ${p.espanol}` : p.espanol.trim() });
  });
  for (let i = lista.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [lista[i], lista[j]] = [lista[j], lista[i]];
  }
  return lista;
}

function mostrarPalabra(burbuja, palabra) {
  const nueva = el('span', { class: 'burbuja-palabra' }, [el('strong', {}, [palabra.nahuatl]), el('small', {}, [palabra.espanol])]);
  burbuja.replaceChildren(nueva);
  burbuja.setAttribute('title', `${palabra.nahuatl} = ${palabra.espanol}`);
}

async function animarPalabras() {
  const burbujas = [...document.querySelectorAll('.ilustracion .burbuja')];
  if (!burbujas.length) return;
  let vocabulario = [];
  try {
    vocabulario = armarVocabulario((await obtenerJSON('/api/v1/palabras')).palabras || []);
  } catch {
    return; // sin conexión: se quedan las palabras de ejemplo
  }
  if (vocabulario.length <= burbujas.length) return;
  burbujas.forEach((b, i) => mostrarPalabra(b, vocabulario[i]));
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  let turno = 0;
  let siguiente = burbujas.length;
  setInterval(() => {
    if (document.hidden) return;
    mostrarPalabra(burbujas[turno % burbujas.length], vocabulario[siguiente % vocabulario.length]);
    siguiente += 1;
    turno += 1;
  }, CAMBIO_PALABRA_MS);
}

cargarEstadisticas();
animarPalabras();
activarRevelado();
