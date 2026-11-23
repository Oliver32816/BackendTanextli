// Resalta en el índice la sección que se está leyendo.
const enlaces = [...document.querySelectorAll('.indice a')];
const secciones = enlaces.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);

if ('IntersectionObserver' in window) {
  const observador = new IntersectionObserver((entradas) => {
    entradas.forEach((entrada) => {
      if (!entrada.isIntersecting) return;
      enlaces.forEach((a) => a.classList.toggle('activo', a.getAttribute('href') === `#${entrada.target.id}`));
    });
  }, { rootMargin: '-30% 0px -60% 0px' });
  secciones.forEach((s) => observador.observe(s));
}
