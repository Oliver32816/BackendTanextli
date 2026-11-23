// Galería: filtra por categoría, busca sin acentos y muestra un visor con navegación por teclado.
import { el, copiar, normalizar, legible, retrasar } from '/portal/assets/js/ui.js';
import { icono } from '/portal/assets/js/iconos.js';
import { obtenerJSON } from '/portal/assets/js/api.js';

const galeria = document.getElementById('galeria');
const buscador = document.getElementById('buscar');
const contador = document.getElementById('contador');
const chips = document.getElementById('categorias');
const visor = document.getElementById('visor');
const visorImagen = document.getElementById('visor-imagen');

let imagenes = [];
let visibles = [];
let categoriaActiva = 'todas';
let indiceVisor = -1;
let enfoqueAnterior = null;

// Ruta relativa al servidor: funciona igual en local, en producción y desde cualquier dominio
const rutaLocal = (img) => `/galeria-imagenes/imagenes/${img.rutaRelativa.split('/').map(encodeURIComponent).join('/')}`;

function abrirVisor(indice) {
  indiceVisor = (indice + visibles.length) % visibles.length;
  const img = visibles[indiceVisor];
  visorImagen.src = rutaLocal(img);
  visorImagen.alt = legible(img.nombre);
  document.getElementById('visor-titulo').textContent = legible(img.nombre);
  document.getElementById('visor-ruta').textContent = img.rutaRelativa;
  document.getElementById('visor-abrir').href = rutaLocal(img);
  if (!visor.classList.contains('abierto')) {
    enfoqueAnterior = document.activeElement;
    visor.classList.add('abierto');
    visor.setAttribute('aria-hidden', 'false');
    visor.querySelector('.cerrar').focus();
    document.getElementById('lobita')?.lobita?.decir('¡Qué bonito!', 'sorprendida', 1800);
  }
}

function cerrarVisor() {
  visor.classList.remove('abierto');
  visor.setAttribute('aria-hidden', 'true');
  enfoqueAnterior?.focus();
}

visor.querySelector('.cerrar').addEventListener('click', cerrarVisor);
visor.querySelector('.anterior').addEventListener('click', () => abrirVisor(indiceVisor - 1));
visor.querySelector('.siguiente').addEventListener('click', () => abrirVisor(indiceVisor + 1));
visor.addEventListener('click', (e) => { if (e.target === visor) cerrarVisor(); });
document.getElementById('visor-copiar').addEventListener('click', () => copiar(visibles[indiceVisor].url, 'URL de la imagen copiada'));
document.addEventListener('keydown', (e) => {
  if (!visor.classList.contains('abierto')) return;
  if (e.key === 'Escape') cerrarVisor();
  if (e.key === 'ArrowLeft') abrirVisor(indiceVisor - 1);
  if (e.key === 'ArrowRight') abrirVisor(indiceVisor + 1);
});

function tarjeta(img, indice) {
  const nombre = legible(img.nombre);
  const figura = el('figure', { class: 'foto', tabindex: '0', role: 'button', 'aria-label': `Ampliar ${nombre}` }, [
    el('div', { class: 'marco' }, [
      el('img', { src: rutaLocal(img), alt: nombre, loading: 'lazy', decoding: 'async' }),
    ]),
    el('figcaption', {}, [
      el('strong', { text: nombre, title: nombre }),
      el('small', { text: img.subcarpeta ? `${legible(img.categoria)} · ${legible(img.subcarpeta)}` : legible(img.categoria) }),
    ]),
    el('div', { class: 'acciones-foto' }, [
      el('button', {
        class: 'mini-boton', type: 'button', 'aria-label': `Copiar URL de ${nombre}`,
        onclick: (e) => { e.stopPropagation(); copiar(img.url, 'URL de la imagen copiada'); },
      }, [icono('copiar')]),
    ]),
  ]);
  figura.style.animationDelay = `${Math.min(indice, 16) * 30}ms`;
  figura.addEventListener('click', () => abrirVisor(indice));
  figura.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirVisor(indice); } });
  return figura;
}

function pintar() {
  const termino = normalizar(buscador.value.trim());
  visibles = imagenes.filter((img) => (categoriaActiva === 'todas' || img.categoria === categoriaActiva)
    && (!termino || normalizar(`${img.nombre} ${img.categoria} ${img.subcarpeta || ''}`).includes(termino)));
  contador.textContent = `${visibles.length} de ${imagenes.length} imágenes`;

  if (visibles.length === 0) {
    galeria.replaceChildren(el('div', { class: 'vacio' }, [icono('imagen'), el('p', { text: 'No encontramos imágenes con esa búsqueda.' })]));
    return;
  }
  galeria.replaceChildren(...visibles.map(tarjeta));
}

function pintarChips() {
  const conteo = imagenes.reduce((m, i) => m.set(i.categoria, (m.get(i.categoria) || 0) + 1), new Map());
  const opciones = [['todas', 'Todas', imagenes.length], ...[...conteo].map(([c, n]) => [c, legible(c), n])];
  chips.replaceChildren(...opciones.map(([valor, texto, n]) => el('button', {
    class: 'chip', type: 'button', 'aria-pressed': String(valor === categoriaActiva),
    onclick: (e) => {
      categoriaActiva = valor;
      chips.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', 'false'));
      e.currentTarget.setAttribute('aria-pressed', 'true');
      pintar();
    },
  }, [texto, el('span', { class: 'n', text: n })])));
}

async function iniciar() {
  try {
    const datos = await obtenerJSON('/api/v1/imagenes');
    imagenes = datos.imagenes || [];
    pintarChips();
    pintar();
  } catch (err) {
    galeria.replaceChildren(el('div', { class: 'vacio' }, [icono('alerta'), el('p', { text: `No se pudieron cargar las imágenes: ${err.message}` })]));
  }
}

buscador.addEventListener('input', retrasar(pintar, 180));
iniciar();
