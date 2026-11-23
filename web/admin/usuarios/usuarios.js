// Usuarios (solo lectura): indicadores, búsqueda y filtro por rol.
import { el, contarHasta, normalizar, fecha, iniciales, retrasar } from '/portal/assets/js/ui.js';
import { admin } from '/portal/assets/js/api.js';

const filas = document.getElementById('filas');
const buscador = document.getElementById('buscar');
const contador = document.getElementById('contador');
const chips = document.getElementById('roles');

const ROLES = [['todos', 'Todos'], ['usuario', 'Estudiantes'], ['admin', 'Admin'], ['superuser', 'Superusuario']];
let usuarios = [];
let rolActivo = 'todos';

function pintarKpis() {
  const hace7dias = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const valores = {
    total: usuarios.length,
    usuarios: usuarios.filter((u) => u.rol === 'usuario').length,
    admins: usuarios.filter((u) => u.rol !== 'usuario').length,
    nuevos: usuarios.filter((u) => u.creado_en && new Date(u.creado_en).getTime() >= hace7dias).length,
  };
  Object.entries(valores).forEach(([clave, valor]) => contarHasta(document.querySelector(`[data-kpi="${clave}"]`), valor));
}

function fila(u, i) {
  const tr = el('tr', {}, [
    el('td', {}, [el('div', { class: 'persona' }, [
      el('span', { class: 'avatar', 'aria-hidden': 'true', text: iniciales(u.nombre_usuario) }),
      el('div', {}, [el('strong', { text: u.nombre_usuario || 'Sin nombre' }), el('small', { text: u.correo })]),
    ])]),
    el('td', {}, [el('span', { class: `insignia-rol rol-${u.rol}`, text: u.rol })]),
    el('td', { text: fecha(u.creado_en) }),
    el('td', {}, [el('span', {
      class: 'estado-conexion', text: 'Sin datos',
      title: 'El estado conectado/desconectado llega con el inicio de sesión seguro (fase 3).',
    })]),
  ]);
  tr.style.animationDelay = `${Math.min(i, 15) * 30}ms`;
  return tr;
}

function pintar() {
  const termino = normalizar(buscador.value.trim());
  const visibles = usuarios.filter((u) => (rolActivo === 'todos' || u.rol === rolActivo)
    && (!termino || normalizar(`${u.nombre_usuario} ${u.correo}`).includes(termino)));
  contador.textContent = `${visibles.length} de ${usuarios.length}`;
  filas.replaceChildren(...(visibles.length
    ? visibles.map(fila)
    : [el('tr', {}, [el('td', { colspan: '4', class: 'vacio', text: 'No hay usuarios que coincidan.' })])]));
}

function pintarChips() {
  chips.replaceChildren(...ROLES.map(([valor, texto]) => el('button', {
    class: 'chip', type: 'button', 'aria-pressed': String(valor === rolActivo),
    onclick: (e) => {
      rolActivo = valor;
      chips.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', 'false'));
      e.currentTarget.setAttribute('aria-pressed', 'true');
      pintar();
    },
  }, [texto])));
}

async function iniciar() {
  try {
    const datos = await admin('/api/admin/usuarios');
    usuarios = datos.usuarios || [];
    pintarKpis();
    pintarChips();
    pintar();
  } catch (err) {
    filas.replaceChildren(el('tr', {}, [el('td', { colspan: '4', class: 'vacio', text: `No se pudo cargar la lista: ${err.message}` })]));
  }
}

buscador.addEventListener('input', retrasar(pintar, 150));
iniciar();
