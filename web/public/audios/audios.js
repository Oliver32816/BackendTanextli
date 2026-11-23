// Explorador de audios: agrupa por categoría, busca sin acentos y reproduce uno a la vez.
// Estructura en el servidor:  <categoria>/[<subcategoria>/][espanol|nahuatl/]<palabra>[_es|_nah].m4a
import { el, copiar, normalizar, legible, retrasar } from '/portal/assets/js/ui.js';
import { icono } from '/portal/assets/js/iconos.js';
import { obtenerJSON } from '/portal/assets/js/api.js';

const BASE = '/audios/';
// Nombres de carpeta y de archivo legibles: "nahuatl" → "Náhuatl", "hermano_nah.m4a" → "Hermano"
const CARPETAS = { nahuatl: 'Náhuatl', espanol: 'Español', numeros: 'Números', 'frases-comunes': 'Frases comunes' };
const carpeta = (nombre) => CARPETAS[nombre] || legible(nombre);
const nombreAudio = (archivo) => legible(archivo.replace(/_(es|nah)(\.[^.]+)$/i, '$2'));
const lista = document.getElementById('lista');
const buscador = document.getElementById('buscar');
const contador = document.getElementById('contador');
const chips = document.getElementById('categorias');

const lobita = () => document.getElementById('lobita')?.lobita;

const reproductor = new Audio();
reproductor.preload = 'none';
let tarjetaActiva = null;
let audios = [];
let categoriaActiva = 'todas';

// Convierte el árbol de carpetas en una lista plana de audios
function aplanar(items, ruta = []) {
  return items.flatMap((item) => {
    if (item.tipo === 'carpeta') return aplanar(item.contenido, [...ruta, item.nombre]);
    const segmentos = [...ruta, item.nombre];
    return [{
      nombre: nombreAudio(item.nombre),
      categoria: ruta[0] || 'General',
      seccion: ruta.slice(1).map(carpeta).join(' / '),
      url: BASE + segmentos.map(encodeURIComponent).join('/'),
      busqueda: normalizar(segmentos.join(' ')),
    }];
  });
}

function detenerActual() {
  if (!tarjetaActiva) return;
  tarjetaActiva.classList.remove('sonando');
  tarjetaActiva.querySelector('.boton-play').replaceChildren(icono('play'));
  tarjetaActiva.querySelector('.progreso-audio i').style.width = '0%';
  tarjetaActiva = null;
}

function alternar(tarjeta, audio) {
  if (tarjetaActiva === tarjeta && !reproductor.paused) {
    reproductor.pause();
    detenerActual();
    return;
  }
  detenerActual();
  tarjetaActiva = tarjeta;
  tarjeta.classList.add('sonando');
  tarjeta.querySelector('.boton-play').replaceChildren(icono('pausa'));
  reproductor.src = audio.url;
  reproductor.play().then(() => lobita()?.reaccionar('escuchando', 4000)).catch(() => detenerActual());
}

reproductor.addEventListener('timeupdate', () => {
  if (!tarjetaActiva || !reproductor.duration) return;
  tarjetaActiva.querySelector('.progreso-audio i').style.width = `${(reproductor.currentTime / reproductor.duration) * 100}%`;
});
reproductor.addEventListener('ended', () => {
  detenerActual();
  lobita()?.reaccionar('feliz', 1800);
});

function tarjetaAudio(audio, indice) {
  const tarjeta = el('article', { class: 'tarjeta-audio' });
  tarjeta.style.animationDelay = `${Math.min(indice, 12) * 35}ms`;
  tarjeta.append(
    el('button', {
      class: 'boton-play', type: 'button', 'aria-label': `Reproducir ${audio.nombre}`,
      onclick: () => alternar(tarjeta, audio),
    }, [icono('play')]),
    el('div', { class: 'info-audio' }, [
      el('strong', { text: audio.nombre, title: audio.nombre }),
      el('div', { class: 'progreso-audio' }, [el('i')]),
    ]),
    el('div', { class: 'ecualizador', 'aria-hidden': 'true' }, [el('i'), el('i'), el('i'), el('i')]),
    el('button', {
      class: 'mini-boton', type: 'button', 'aria-label': `Copiar URL de ${audio.nombre}`,
      onclick: () => copiar(location.origin + audio.url, 'URL del audio copiada'),
    }, [icono('copiar')]),
  );
  return tarjeta;
}

function pintar() {
  detenerActual();
  reproductor.pause();
  const termino = normalizar(buscador.value.trim());
  const visibles = audios.filter((a) => (categoriaActiva === 'todas' || a.categoria === categoriaActiva)
    && (!termino || a.busqueda.includes(termino)));

  contador.textContent = `${visibles.length} de ${audios.length} audios`;

  if (visibles.length === 0) {
    lista.replaceChildren(el('div', { class: 'vacio' }, [icono('audio'), el('p', { text: 'No encontramos audios con esa búsqueda.' })]));
    return;
  }

  const porCategoria = new Map();
  visibles.forEach((a) => {
    if (!porCategoria.has(a.categoria)) porCategoria.set(a.categoria, new Map());
    const secciones = porCategoria.get(a.categoria);
    if (!secciones.has(a.seccion)) secciones.set(a.seccion, []);
    secciones.get(a.seccion).push(a);
  });

  const colores = ['', 'naranja', 'morado', 'azul'];
  let indiceColor = 0;
  const grupos = [];
  porCategoria.forEach((secciones, categoria) => {
    const total = [...secciones.values()].reduce((n, l) => n + l.length, 0);
    const grupo = el('section', { class: 'grupo-audios' }, [
      el('header', {}, [
        el('div', { class: `icono-circulo ${colores[indiceColor++ % colores.length]}` }, [icono('carpeta')]),
        el('h2', { text: carpeta(categoria) }),
        el('span', { class: 'contador', text: `${total} audios` }),
      ]),
    ]);
    // Dentro de cada subcategoría: primero el audio completo, después náhuatl y español
    const orden = (seccion) => {
      const partes = seccion.split(' / ');
      const idioma = ['Náhuatl', 'Español'].indexOf(partes.at(-1));
      return [idioma >= 0 ? partes.slice(0, -1).join(' / ') : seccion, idioma + 1];
    };
    [...secciones].sort(([a], [b]) => {
      const [baseA, idiomaA] = orden(a);
      const [baseB, idiomaB] = orden(b);
      return baseA.localeCompare(baseB, 'es') || idiomaA - idiomaB;
    }).forEach(([seccion, items]) => {
      if (seccion) grupo.append(el('h3', { class: 'subgrupo-titulo', text: seccion }));
      grupo.append(el('div', { class: 'rejilla rejilla-3' }, items.map(tarjetaAudio)));
    });
    grupos.push(grupo);
  });
  lista.replaceChildren(...grupos);
}

function pintarChips() {
  const conteo = audios.reduce((m, a) => m.set(a.categoria, (m.get(a.categoria) || 0) + 1), new Map());
  const opciones = [['todas', 'Todas', audios.length], ...[...conteo].map(([c, n]) => [c, carpeta(c), n])];
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
    const datos = await obtenerJSON('/api/v1/media-list');
    audios = aplanar(datos.estructura || []);
    pintarChips();
    pintar();
  } catch (err) {
    lista.replaceChildren(el('div', { class: 'vacio' }, [icono('alerta'), el('p', { text: `No se pudieron cargar los audios: ${err.message}` })]));
  }
}

buscador.addEventListener('input', retrasar(pintar, 180));
iniciar();
