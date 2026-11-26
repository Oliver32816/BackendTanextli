// Lobita animada por capas (versión web sin React de MascotaAnimada.jsx de la app).
// Uso en HTML:  <div data-lobita data-tamano="300" data-rutina="portal"></div>
//          o:   <div data-lobita data-estado="saludando" data-entrada="rebote"></div>
//          data-globo="false" → hace los gestos pero sin globos de texto
//          data-tamano-movil="110" → tamaño en celulares (≤ 720 px)
// Uso en JS:    const lobita = crearLobita(nodo, { estado: 'feliz', tamano: 240 }); lobita.estado('pirueta');
// Los movimientos de cada estado viven en lobita.css (mismo archivo que usa la app).
//
// Gestos del portal (solo web): sigue el cursor con la mirada e inclina la cabeza, saluda al
// pasar el mouse, dice frases en un globo al tocarla, da una pirueta con doble clic y se queda
// dormida si nadie mueve nada un rato. Desde JS:  lobita.decir('¡Piali!', 'feliz', 2500)

const IMG = '/portal/assets/lobita/img';
// WebP: unas 4.5 veces más ligero que PNG y se ve igual
const capa = (nombre) => `${IMG}/capas/${nombre}.webp`;
const boca = (nombre) => `${IMG}/expresiones/bocas/${nombre}.webp`;
const ojo = (nombre) => `${IMG}/expresiones/ojos/${nombre}.webp`;

// ---- Precarga ----
// Lobita se arma con ~30 capas. Si se muestra antes de que TODAS lleguen, se ve "a pedazos"
// (por ejemplo, con los ojos en blanco porque el fondo del ojo llegó antes que el iris).
// Se descargan y decodifican todas en cuanto carga este archivo, y Lobita aparece completa.
const TODAS_LAS_CAPAS = [
  ...['cola', 'mano', 'antebrazo', 'cuerpo', 'oreja-i', 'oreja-d', 'cabeza', 'ceja-i', 'ceja-d', 'sonrisa',
    'ojo-fondo-i', 'ojo-fondo-d', 'iris-i', 'iris-d', 'pestanas-i', 'pestanas-d', 'ojo-mascara-i', 'ojo-mascara-d'].map(capa),
  ...['boca-abierta', 'boca-grande', 'boca-triste', 'boca-sorpresa', 'boca-hmm'].map(boca),
  ...['ojo-cerrado-i', 'ojo-cerrado-d', 'ojo-feliz-i', 'ojo-feliz-d'].map(ojo),
];
const imagenesListas = []; // se guardan para que el navegador no las descarte
const capasListas = Promise.all(TODAS_LAS_CAPAS.map((src) => {
  const imagen = new Image();
  imagen.decoding = 'async';
  imagen.src = src;
  imagenesListas.push(imagen);
  return (imagen.decode ? imagen.decode() : Promise.resolve()).catch(() => {});
}));

// boca: sonrisa | hablando | grande | triste | sorpresa | hmm · ojos: abiertos | felices | cerrados
// mirada: [x, y] de las pupilas · vivo: mira a los lados por su cuenta
export const ESTADOS = {
  reposo:      { boca: 'sonrisa',  ojos: 'abiertos', mirada: [0, 0],   vivo: true },
  saludando:   { boca: 'sonrisa',  ojos: 'abiertos', mirada: [0, 0],   vivo: false },
  hablando:    { boca: 'hablando', ojos: 'abiertos', mirada: [0, 0],   vivo: true },
  escuchando:  { boca: 'sonrisa',  ojos: 'abiertos', mirada: [0, 0],   vivo: true },
  pensando:    { boca: 'hmm',      ojos: 'abiertos', mirada: [-7, -3], vivo: false },
  feliz:       { boca: 'sonrisa',  ojos: 'felices',  mirada: [0, 0],   vivo: false },
  celebrando:  { boca: 'grande',   ojos: 'felices',  mirada: [0, 0],   vivo: false },
  triste:      { boca: 'triste',   ojos: 'abiertos', mirada: [-2, 6],  vivo: false },
  sorprendida: { boca: 'sorpresa', ojos: 'abiertos', mirada: [0, -3],  vivo: false },
  error:       { boca: 'triste',   ojos: 'abiertos', mirada: [-4, 5],  vivo: false },
  bailando:    { boca: 'grande',   ojos: 'felices',  mirada: [0, 0],   vivo: false },
  pirueta:     { boca: 'grande',   ojos: 'felices',  mirada: [0, 0],   vivo: false },
  emocionada:  { boca: 'grande',   ojos: 'abiertos', mirada: [0, -2],  vivo: false },
  agradecida:  { boca: 'sonrisa',  ojos: 'felices',  mirada: [0, 0],   vivo: false },
  curiosa:     { boca: 'sonrisa',  ojos: 'abiertos', mirada: [-8, -1], vivo: true },
  timida:      { boca: 'sonrisa',  ojos: 'abiertos', mirada: [-8, 5],  vivo: false },
  orgullosa:   { boca: 'sonrisa',  ojos: 'abiertos', mirada: [3, -3],  vivo: false },
  sonolienta:  { boca: 'sonrisa',  ojos: 'cerrados', mirada: [0, 0],   vivo: false },
};

// Rutinas del portal: pasos que se repiten en bucle
export const RUTINAS = {
  portal: [
    { estado: 'saludando', ms: 3500, texto: '¡Piali! Bienvenidos a Tanextli' },
    { estado: 'reposo', ms: 4000 },
    { estado: 'curiosa', ms: 3000 },
    { estado: 'hablando', ms: 2500 },
    { estado: 'feliz', ms: 2500 },
    { estado: 'reposo', ms: 4000 },
  ],
  audios: [
    { estado: 'escuchando', ms: 5000 },
    { estado: 'curiosa', ms: 3000 },
    { estado: 'reposo', ms: 4000 },
  ],
  imagenes: [
    { estado: 'curiosa', ms: 4000, texto: '¿Qué te gustaría ver hoy?' },
    { estado: 'sorprendida', ms: 2000 },
    { estado: 'reposo', ms: 4000 },
  ],
  sinAcceso: [
    { estado: 'timida', ms: 4000, texto: 'Esta parte es solo para el equipo' },
    { estado: 'pensando', ms: 3000 },
    { estado: 'triste', ms: 3000 },
  ],
};

const MIRADAS_AL_AZAR = [[-8, 0], [-5, -2], [3, 0], [0, 3], [-6, 3], [2, -2]];
const reducido = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Estados con una mirada intencional: ahí no sigue al cursor
const MIRADA_FIJA = new Set(['pensando', 'triste', 'timida', 'sonolienta', 'error', 'pirueta']);
const DORMIR_TRAS_MS = 45000;

// Frases al tocarla: las de la app (API) o, si no hay conexión, estas
const FRASES_LOCALES = [
  { texto: '¡Piali! (Hola)', estado: 'saludando' },
  { texto: '¡A divertirnos!', estado: 'feliz' },
  { texto: 'Me encanta enseñarte', estado: 'agradecida' },
  { texto: '¿Qué te gustaría aprender hoy?', estado: 'curiosa' },
  { texto: 'Tlasohkamatik (Gracias)', estado: 'agradecida' },
  { texto: 'Estoy para ayudarte en lo que necesites', estado: 'feliz' },
  { texto: 'Kwali Tanecik (Buenos días)', estado: 'saludando' },
];
let frasesPromesa = null;
function frases() {
  if (!frasesPromesa) {
    frasesPromesa = !location.pathname.startsWith('/portal')
      ? Promise.resolve(FRASES_LOCALES)
      : fetch('/api/v1/mascota/frases', { headers: { Accept: 'application/json' } })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d) => {
          const lista = (d.frases || [])
            .filter((f) => f.texto && !['error', 'triste'].includes(f.estado_mascota))
            .map((f) => ({ texto: f.texto, estado: ESTADOS[f.estado_mascota] ? f.estado_mascota : 'hablando' }));
          return lista.length ? [...lista, ...FRASES_LOCALES.slice(0, 2)] : FRASES_LOCALES;
        })
        .catch(() => FRASES_LOCALES);
  }
  return frasesPromesa;
}

// Un solo oyente global para el cursor y la inactividad, compartido por todas las Lobitas
const instancias = new Set();
let cuadroPendiente = false;
let ultimoPuntero = null;
let ultimaActividad = Date.now();
let dormidas = false;
function alMoverPuntero(e) {
  ultimoPuntero = { x: e.clientX, y: e.clientY, t: Date.now() };
  if (cuadroPendiente) return;
  cuadroPendiente = true;
  requestAnimationFrame(() => { cuadroPendiente = false; instancias.forEach((i) => i.mirarA(ultimoPuntero)); });
}
function alActividad() {
  ultimaActividad = Date.now();
  if (dormidas) { dormidas = false; instancias.forEach((i) => i.despertar()); }
}
function vigilarSueno() {
  if (!dormidas && !document.hidden && Date.now() - ultimaActividad > DORMIR_TRAS_MS) {
    dormidas = true;
    instancias.forEach((i) => i.dormir());
  }
}
let oyentesListos = false;
function prepararOyentes() {
  if (oyentesListos) return;
  oyentesListos = true;
  window.addEventListener('pointermove', alMoverPuntero, { passive: true });
  window.addEventListener('pointerleave', () => { ultimoPuntero = null; instancias.forEach((i) => i.mirarA(null)); });
  document.addEventListener('mouseleave', () => { ultimoPuntero = null; instancias.forEach((i) => i.mirarA(null)); });
  ['pointermove', 'pointerdown', 'keydown', 'scroll', 'touchstart', 'wheel'].forEach((ev) => window.addEventListener(ev, alActividad, { passive: true }));
  setInterval(vigilarSueno, 5000);
}
const limitar = (v, min, max) => Math.max(min, Math.min(max, v));

function div(clase, hijos = []) {
  const nodo = document.createElement('div');
  nodo.className = clase;
  nodo.append(...hijos);
  return nodo;
}

function img(src, clase = 'm-capa') {
  const nodo = document.createElement('img');
  nodo.className = clase;
  nodo.src = src;
  nodo.alt = '';
  nodo.draggable = false;
  nodo.decoding = 'async';
  return nodo;
}

function construirOjo(lado) {
  const clip = div('m-iris-clip', [div('m-iris-mov', [img(capa(`iris-${lado}`))])]);
  const mascara = `url("${capa(`ojo-mascara-${lado}`)}")`;
  clip.style.setProperty('-webkit-mask-image', mascara);
  clip.style.setProperty('mask-image', mascara);
  return div(`m-ojo m-ojo-${lado}`, [img(capa(`ojo-fondo-${lado}`)), clip, img(capa(`pestanas-${lado}`))]);
}

function construir(entrada) {
  const orejaI = div('m-oreja m-oreja-i', [img(capa('oreja-i'))]);
  const orejaD = div('m-oreja m-oreja-d', [img(capa('oreja-d'))]);

  const cabeza = div('m-cabeza-pose', [div('m-cabeza-anim', [
    orejaI, orejaD,
    img(capa('cabeza')),
    img(capa('ceja-i'), 'm-capa m-ceja-i'),
    img(capa('ceja-d'), 'm-capa m-ceja-d'),
    div('m-ojos m-ojos-abiertos', [div('m-pestaneo-abre', [construirOjo('i'), construirOjo('d')])]),
    div('m-ojos m-ojos-pestaneo', [div('m-pestaneo-cierra', [img(ojo('ojo-cerrado-i')), img(ojo('ojo-cerrado-d'))])]),
    div('m-ojos m-ojos-felices', [img(ojo('ojo-feliz-i')), img(ojo('ojo-feliz-d'))]),
    div('m-ojos m-ojos-cerrados', [img(ojo('ojo-cerrado-i')), img(ojo('ojo-cerrado-d'))]),
    img(capa('sonrisa'), 'm-capa m-boca m-boca-sonrisa'),
    img(boca('boca-abierta'), 'm-capa m-boca m-boca-abierta'),
    img(boca('boca-grande'), 'm-capa m-boca m-boca-grande'),
    img(boca('boca-triste'), 'm-capa m-boca m-boca-triste'),
    img(boca('boca-sorpresa'), 'm-capa m-boca m-boca-sorpresa'),
    img(boca('boca-hmm'), 'm-capa m-boca m-boca-hmm'),
  ])]);

  const todo = div('m-todo', [
    img(capa('cola'), 'm-capa m-cola'),
    div('m-brazo', [div('m-mano-g', [img(capa('mano'))]), img(capa('antebrazo'))]),
    img(capa('cuerpo')),
    cabeza,
  ]);

  const mxa = div('mxa', [div('mxa-lienzo', [div(`m-entrada${entrada ? ` m-entrada-${entrada}` : ''}`, [todo])])]);
  mxa.setAttribute('role', 'img');
  mxa.setAttribute('aria-label', 'Lobita, la mascota de Tanextli');
  return { mxa, orejaI, orejaD };
}

export function crearLobita(contenedor, opciones = {}) {
  // En pantallas angostas usa tamanoMovil (data-tamano-movil) si se indicó
  const movil = opciones.tamanoMovil && window.matchMedia('(max-width: 720px)').matches;
  const tamano = Number(movil ? opciones.tamanoMovil : opciones.tamano) || 240;
  const { mxa, orejaI, orejaD } = construir(opciones.entrada);
  // Invisible (y con la entrada en pausa) hasta que todas las capas estén listas
  mxa.classList.add('mxa-cargando');
  capasListas.then(() => mxa.classList.remove('mxa-cargando'));
  const globo = div('mxa-globo');
  const flota = div('mxa-flota oculto', [globo]);
  flota.setAttribute('aria-live', 'polite');
  const ancla = div('mxa-ancla', [flota, mxa]);
  contenedor.replaceChildren(div('mxa-contenedor', [ancla]));
  mxa.style.setProperty('--u', `${tamano / 640}px`);
  if (opciones.espejo) mxa.style.transform = 'scaleX(-1)';
  const signo = opciones.espejo ? -1 : 1;

  let actual = 'reposo';
  let azar = null;
  let seguir = null; // [x, y] cuando mira al cursor
  const temporizadores = new Set();
  const despues = (ms, fn) => {
    const id = setTimeout(() => { temporizadores.delete(id); fn(); }, ms);
    temporizadores.add(id);
    return id;
  };

  function pintar() {
    const cfg = ESTADOS[actual];
    const [mx, my] = (!MIRADA_FIJA.has(actual) && seguir) || azar || cfg.mirada;
    mxa.dataset.estado = actual;
    mxa.dataset.boca = cfg.boca;
    mxa.dataset.ojos = cfg.ojos;
    mxa.style.setProperty('--mx', mx);
    mxa.style.setProperty('--my', my);
  }

  function estado(nombre) {
    actual = ESTADOS[nombre] ? nombre : 'reposo';
    azar = null;
    pintar();
  }

  // Vida propia: mira a los lados y mueve una oreja de vez en cuando
  function mirarAlAzar() {
    despues(1800 + Math.random() * 3200, () => {
      if (ESTADOS[actual].vivo && !document.hidden) {
        azar = MIRADAS_AL_AZAR[Math.floor(Math.random() * MIRADAS_AL_AZAR.length)];
        pintar();
        despues(900 + Math.random() * 1200, () => { azar = null; pintar(); mirarAlAzar(); });
      } else {
        mirarAlAzar();
      }
    });
  }

  function moverOreja() {
    despues(4000 + Math.random() * 6000, () => {
      const oreja = Math.random() < 0.5 ? orejaI : orejaD;
      oreja.classList.add('mueve');
      despues(700, () => oreja.classList.remove('mueve'));
      moverOreja();
    });
  }

  // Rutina: recorre sus pasos en bucle; una reacción (hover, clic) la pausa un momento
  let pasos = RUTINAS[opciones.rutina] || null;
  let indice = 0;
  let vuelta = 0;
  let pausada = false;
  let dormida = false;
  let finReaccion = null;
  function siguientePaso() {
    if (!pasos) return;
    if (!pausada && !dormida) {
      const paso = pasos[indice];
      estado(paso.estado);
      if (paso.texto && vuelta === 0) mostrarGlobo(paso.texto, Math.min(paso.ms, 3200));
      indice = (indice + 1) % pasos.length;
      if (indice === 0) vuelta += 1;
    }
    despues(pasos[(indice + pasos.length - 1) % pasos.length].ms, siguientePaso);
  }

  function reaccionar(nombre, ms = 2200) {
    if (dormida) despertar(false);
    pausada = true;
    estado(nombre);
    clearTimeout(finReaccion);
    temporizadores.delete(finReaccion);
    finReaccion = despues(ms, () => { pausada = false; if (!pasos) estado(opciones.estado || 'reposo'); });
  }

  // Globo de diálogo
  let ocultarGlobo = null;
  function mostrarGlobo(texto, ms = 2600, clase = '') {
    if (opciones.globo === false) return; // data-globo="false": gestos sin texto
    globo.textContent = texto;
    globo.className = `mxa-globo${clase ? ` ${clase}` : ''}`;
    flota.classList.remove('oculto');
    clearTimeout(ocultarGlobo);
    temporizadores.delete(ocultarGlobo);
    if (ms) ocultarGlobo = despues(ms, () => flota.classList.add('oculto'));
  }
  function decir(texto, nombre = 'hablando', ms = 2600) {
    mostrarGlobo(texto, ms);
    reaccionar(nombre, ms);
  }

  // Mirada e inclinación de cabeza hacia el cursor
  let soltarMirada = null;
  function mirarA(p) {
    if (reducido() || dormida || document.hidden) return;
    if (!p) { seguir = null; mxa.style.setProperty('--g-rot', '0deg'); pintar(); return; }
    const caja = ancla.getBoundingClientRect();
    if (!caja.width || caja.bottom < 0 || caja.top > window.innerHeight) return;
    const cx = caja.left + caja.width * 0.42;
    const cy = caja.top + caja.height * 0.35;
    const dx = p.x - cx;
    const dy = p.y - cy;
    if (Math.hypot(dx, dy) > Math.max(window.innerWidth, window.innerHeight) * 0.75) { mirarA(null); return; }
    seguir = [
      Math.round(limitar(dx / (caja.width * 1.1), -1, 1) * 8 * signo * 10) / 10,
      Math.round(limitar(dy / (caja.height * 1.1), -1, 1) * 6 * 10) / 10,
    ];
    mxa.style.setProperty('--g-rot', `${(limitar(dx / (caja.width * 2), -1, 1) * 6 * signo).toFixed(2)}deg`);
    pintar();
    clearTimeout(soltarMirada);
    temporizadores.delete(soltarMirada);
    soltarMirada = despues(2800, () => { seguir = null; mxa.style.setProperty('--g-rot', '0deg'); pintar(); });
  }

  // Sueño por inactividad
  function dormir() {
    if (reducido()) return;
    dormida = true;
    seguir = null;
    mxa.style.setProperty('--g-rot', '0deg');
    estado('sonolienta');
    mostrarGlobo('Zzz…', 0, 'zzz');
  }
  function despertar(conSusto = true) {
    if (!dormida) return;
    dormida = false;
    flota.classList.add('oculto');
    if (conSusto) {
      pausada = true;
      estado('sorprendida');
      finReaccion = despues(1200, () => { pausada = false; estado(pasos ? pasos[indice].estado : (opciones.estado || 'reposo')); });
    }
  }

  estado(opciones.estado || (pasos ? pasos[0].estado : 'reposo'));
  if (!reducido()) {
    mirarAlAzar();
    moverOreja();
    siguientePaso();
  }

  if (opciones.interactiva) {
    contenedor.classList.add('lobita-interactiva');
    let saludo = false;
    let toques = 0;
    contenedor.addEventListener('mouseenter', () => {
      if (!saludo) { saludo = true; decir('¡Piali! (Hola)', 'saludando', 2200); } else reaccionar('feliz', 1600);
    });
    contenedor.addEventListener('click', async () => {
      toques += 1;
      if (toques % 4 === 0) { mostrarGlobo('¡Wiii!', 1600); reaccionar(Math.random() < 0.5 ? 'pirueta' : 'bailando', 2600); return; }
      const lista = await frases();
      const f = lista[Math.floor(Math.random() * lista.length)];
      decir(f.texto, f.estado, 2800);
    });
    contenedor.addEventListener('dblclick', (e) => { e.preventDefault(); mostrarGlobo('¡Mira mi pirueta!', 2000); reaccionar('pirueta', 2600); });
  }

  const instancia = {
    estado,
    reaccionar,
    decir,
    mirarA,
    dormir,
    despertar,
    rutina(nombre) { pasos = RUTINAS[nombre] || null; indice = 0; vuelta = 0; },
    destruir() { temporizadores.forEach(clearTimeout); temporizadores.clear(); instancias.delete(instancia); },
  };
  instancias.add(instancia);
  prepararOyentes();
  return instancia;
}

// Inicio automático para <div data-lobita ...>
export function iniciarLobitas(raiz = document) {
  const instancias = [];
  raiz.querySelectorAll('[data-lobita]').forEach((nodo) => {
    const lobita = crearLobita(nodo, {
      estado: nodo.dataset.estado,
      tamano: nodo.dataset.tamano,
      tamanoMovil: nodo.dataset.tamanoMovil,
      rutina: nodo.dataset.rutina,
      entrada: nodo.dataset.entrada,
      espejo: nodo.dataset.espejo === 'true',
      interactiva: nodo.dataset.interactiva === 'true',
      globo: nodo.dataset.globo !== 'false',
    });
    nodo.lobita = lobita;
    instancias.push(lobita);
  });
  return instancias;
}
