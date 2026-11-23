// Plantilla común: encabezado con navegación, pie de página, fondo animado y tema claro/oscuro.
// Cada página solo declara <body data-zona="publico|admin" data-pagina="..."> y su <main>.
import { el, activarRevelado } from './ui.js';
import { icono, pintarIconos } from './iconos.js';
import { iniciarLobitas } from '../lobita/lobita.js';

const portalPublico = `${location.protocol}//${location.hostname}/portal/`;

const NAVEGACION = {
  publico: [
    { id: 'inicio', texto: 'Inicio', href: '/portal/', icono: 'inicio' },
    { id: 'audios', texto: 'Audios', href: '/portal/audios/', icono: 'audio' },
    { id: 'imagenes', texto: 'Imágenes', href: '/portal/imagenes/', icono: 'imagen' },
    { id: 'privacidad', texto: 'Privacidad', href: '/portal/privacidad/', icono: 'escudo' },
  ],
  admin: [
    { id: 'usuarios', texto: 'Usuarios', href: '/admin/usuarios/', icono: 'usuarios' },
    { id: 'gestion', texto: 'Gestión', href: '/admin/gestion/', icono: 'gestion' },
    { id: 'analitica', texto: 'Analítica', icono: 'grafica', pronto: true },
    { id: 'portal', texto: 'Portal', href: portalPublico, icono: 'externo', externo: true },
  ],
};

function enlaceNav(item, actual) {
  if (item.pronto) {
    return el('span', { class: 'deshabilitado', title: 'Disponible en una fase posterior' }, [
      icono(item.icono), item.texto, el('span', { class: 'pildora', text: 'Pronto' }),
    ]);
  }
  return el('a', {
    href: item.href,
    'aria-current': item.id === actual ? 'page' : null,
    target: item.externo ? '_blank' : null,
    rel: item.externo ? 'noopener' : null,
  }, [icono(item.icono), item.texto]);
}

function cambiarTema(boton) {
  const raiz = document.documentElement;
  const nuevo = raiz.getAttribute('data-tema') === 'oscuro' ? 'claro' : 'oscuro';
  raiz.setAttribute('data-tema', nuevo);
  try { localStorage.setItem('tanextli_tema', nuevo); } catch { /* sin almacenamiento */ }
  boton.replaceChildren(icono(nuevo === 'oscuro' ? 'sol' : 'luna'));
  boton.setAttribute('aria-label', nuevo === 'oscuro' ? 'Usar tema claro' : 'Usar tema oscuro');
}

function construirEncabezado(zona, pagina) {
  const nav = el('nav', { class: 'nav', id: 'navegacion', 'aria-label': 'Navegación principal' },
    NAVEGACION[zona].map((item) => enlaceNav(item, pagina)));

  const oscuro = document.documentElement.getAttribute('data-tema') === 'oscuro';
  const botonTema = el('button', {
    class: 'boton-icono', type: 'button', 'aria-label': oscuro ? 'Usar tema claro' : 'Usar tema oscuro',
  }, [icono(oscuro ? 'sol' : 'luna')]);
  botonTema.addEventListener('click', () => cambiarTema(botonTema));

  const botonMenu = el('button', {
    class: 'boton-icono menu-movil', type: 'button', 'aria-label': 'Abrir menú',
    'aria-controls': 'navegacion', 'aria-expanded': 'false',
  }, [icono('menu')]);
  botonMenu.addEventListener('click', () => {
    const abierto = nav.classList.toggle('abierto');
    botonMenu.setAttribute('aria-expanded', String(abierto));
    botonMenu.replaceChildren(icono(abierto ? 'cerrar' : 'menu'));
  });

  const inicio = zona === 'admin' ? '/admin/usuarios/' : '/portal/';
  return el('header', { class: 'encabezado' }, [
    el('div', { class: 'contenedor' }, [
      el('a', { class: 'marca', href: inicio }, [
        el('img', { src: '/portal/assets/img/logo.svg', alt: '', width: 38, height: 38 }),
        el('span', {}, ['Tanextli', el('small', { text: zona === 'admin' ? 'Panel de administración' : 'Recursos en náhuatl' })]),
      ]),
      zona === 'admin' ? el('span', { class: 'etiqueta-zona', text: 'Solo red privada' }) : null,
      botonMenu,
      nav,
      botonTema,
    ]),
  ]);
}

function construirPie(zona) {
  const anio = new Date().getFullYear();
  const enlaces = zona === 'admin'
    ? [el('a', { href: portalPublico, target: '_blank', rel: 'noopener', text: 'Portal público' })]
    : [
      el('a', { href: '/portal/privacidad/', text: 'Aviso de privacidad' }),
      el('a', { href: '/api/v1/media-list', text: 'API de audios' }),
      el('a', { href: '/api/v1/imagenes', text: 'API de imágenes' }),
    ];
  return el('footer', { class: 'pie' }, [
    el('div', { class: 'contenedor' }, [
      el('span', { text: `© ${anio} Tanextli · Proyecto de servicio social para la enseñanza del náhuatl` }),
      el('nav', { 'aria-label': 'Enlaces del pie' }, enlaces),
    ]),
  ]);
}

export function iniciarPlantilla() {
  const { zona = 'publico', pagina = '' } = document.body.dataset;
  const fondo = el('div', { class: 'fondo-decorativo', 'aria-hidden': 'true' }, [el('span'), el('span'), el('span')]);
  const saltar = el('a', { class: 'sr-only', href: '#contenido', text: 'Saltar al contenido' });

  document.body.prepend(saltar, fondo, construirEncabezado(zona, pagina));
  document.body.append(construirPie(zona));
  pintarIconos();
  iniciarLobitas();
  activarRevelado();
}

iniciarPlantilla();
