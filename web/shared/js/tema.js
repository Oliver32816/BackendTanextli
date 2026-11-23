// Se carga en <head> (sin defer) para aplicar el tema antes de pintar y evitar parpadeo.
(function () {
  var tema = null;
  try { tema = localStorage.getItem('tanextli_tema'); } catch { /* sin almacenamiento */ }
  if (!tema) tema = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
  document.documentElement.setAttribute('data-tema', tema);
})();
