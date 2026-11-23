// Utilidades de interfaz. Los datos SIEMPRE se insertan con textContent, nunca con innerHTML.
import { icono } from './iconos.js';

// Crea un elemento: el('a', { class: 'x', href: '/', text: 'Hola' }, [hijos])
export function el(etiqueta, props = {}, hijos = []) {
  const nodo = document.createElement(etiqueta);
  for (const [clave, valor] of Object.entries(props)) {
    if (valor === undefined || valor === null || valor === false) continue;
    if (clave === 'class') nodo.className = valor;
    else if (clave === 'text') nodo.textContent = valor;
    else if (clave === 'dataset') Object.assign(nodo.dataset, valor);
    else if (clave.startsWith('on') && typeof valor === 'function') nodo.addEventListener(clave.slice(2), valor);
    else nodo.setAttribute(clave, valor === true ? '' : valor);
  }
  for (const hijo of [].concat(hijos)) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    nodo.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
  }
  return nodo;
}

export function aviso(mensaje, tipo = 'exito') {
  let contenedor = document.querySelector('.avisos');
  if (!contenedor) {
    contenedor = el('div', { class: 'avisos', role: 'status', 'aria-live': 'polite' });
    document.body.append(contenedor);
  }
  const nodo = el('div', { class: `aviso ${tipo === 'error' ? 'error' : ''}` }, [
    icono(tipo === 'error' ? 'alerta' : 'check'),
    el('span', { text: mensaje }),
  ]);
  contenedor.append(nodo);
  setTimeout(() => {
    nodo.classList.add('saliendo');
    nodo.addEventListener('animationend', () => nodo.remove(), { once: true });
  }, 3200);
}

export async function copiar(texto, mensaje = 'Copiado al portapapeles') {
  try {
    await navigator.clipboard.writeText(texto);
    aviso(mensaje);
  } catch {
    aviso('No se pudo copiar. Selecciona y copia manualmente.', 'error');
  }
}

// Anima un número desde 0 hasta su valor final
export function contarHasta(nodo, final, duracion = 1100) {
  const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducido || final === 0) { nodo.textContent = final.toLocaleString('es-MX'); return; }
  const inicio = performance.now();
  const paso = (ahora) => {
    const t = Math.min(1, (ahora - inicio) / duracion);
    const suavizado = 1 - Math.pow(1 - t, 3);
    nodo.textContent = Math.round(final * suavizado).toLocaleString('es-MX');
    if (t < 1) requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}

export function retrasar(fn, ms = 200) {
  let id;
  return (...args) => { clearTimeout(id); id = setTimeout(() => fn(...args), ms); };
}

// Quita acentos y pasa a minúsculas para búsquedas tolerantes
export function normalizar(texto) {
  return String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// "frases_comunes.m4a" → "Frases comunes"
export function legible(nombre) {
  const texto = String(nombre).replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function fecha(valor) {
  if (!valor) return '—';
  return new Date(valor).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Mexico_City' });
}

export function iniciales(nombre) {
  return String(nombre || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

// Aparición al hacer scroll para elementos con la clase .revelar
export function activarRevelado(raiz = document) {
  const elementos = raiz.querySelectorAll('.revelar:not(.visible)');
  if (!('IntersectionObserver' in window)) { elementos.forEach((e) => e.classList.add('visible')); return; }
  const observador = new IntersectionObserver((entradas) => {
    entradas.forEach((entrada) => {
      if (entrada.isIntersecting) { entrada.target.classList.add('visible'); observador.unobserve(entrada.target); }
    });
  }, { threshold: 0.12 });
  elementos.forEach((e) => observador.observe(e));
}

// Modal accesible: abre, enfoca el primer campo y cierra con Esc o clic fuera
export function crearModal(id) {
  const modal = document.getElementById(id);
  let anterior = null;
  const cerrar = () => {
    modal.classList.remove('abierto');
    modal.setAttribute('aria-hidden', 'true');
    anterior?.focus();
  };
  const abrir = () => {
    anterior = document.activeElement;
    modal.classList.add('abierto');
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => modal.querySelector('input, select, button')?.focus(), 60);
  };
  modal.addEventListener('click', (e) => { if (e.target === modal || e.target.closest('[data-cerrar]')) cerrar(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('abierto')) cerrar(); });
  return { abrir, cerrar, modal };
}
