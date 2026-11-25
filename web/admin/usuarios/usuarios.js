// Usuarios: indicadores, búsqueda, filtro por rol y acciones (editar, rol, contraseña, eliminar).
import { el, contarHasta, normalizar, fecha, iniciales, retrasar } from '/portal/assets/js/ui.js';
import { admin } from '/portal/assets/js/api.js';
import { accionesDeUsuario, ultimoAcceso } from '/admin/compartido/acciones-usuario.js';

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
  const acceso = ultimoAcceso(u.ultimo_acceso, u.ultima_senal);
  const tr = el('tr', {}, [
    el('td', {}, [el('div', { class: 'persona' }, [
      el('span', { class: 'avatar', 'aria-hidden': 'true', text: iniciales(u.nombre_usuario) }),
      el('div', {}, [el('strong', { text: u.nombre_usuario || 'Sin nombre' }), el('small', { text: u.correo })]),
    ])]),
    el('td', {}, [
      el('span', { class: `insignia-rol rol-${u.rol}`, text: u.rol }),
      u.con_google ? el('span', { class: 'etiqueta-google', title: 'Entra con Google', text: 'Google' }) : null,
      u.debe_cambiar_password ? el('span', { class: 'etiqueta-temporal', title: 'Debe cambiar su contraseña temporal', text: 'Temporal' }) : null,
    ]),
    el('td', { text: fecha(u.creado_en) }),
    el('td', {}, [el('span', {
      class: `estado-conexion ${acceso.activo ? 'activo' : ''}`, text: acceso.texto,
      title: u.ultimo_acceso ? `Último inicio de sesión: ${fecha(u.ultimo_acceso)}` : 'Aún no inicia sesión desde que se registra el acceso',
    })]),
    el('td', {}, [accionesDeUsuario(u, iniciar)]),
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
    : [el('tr', {}, [el('td', { colspan: '5', class: 'vacio', text: 'No hay usuarios que coincidan.' })])]));
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
    filas.replaceChildren(el('tr', {}, [el('td', { colspan: '5', class: 'vacio', text: `No se pudo cargar la lista: ${err.message}` })]));
  }
}

// Cada 30 s vuelve a pedir la lista (sin animaciones) para que "Ahora" / "Hace X min" esté al día.
// Se salta si la pestaña está oculta o hay una ventana de acción abierta.
async function refrescar() {
  if (document.hidden || document.querySelector('.modal[aria-hidden="false"]')) return;
  try {
    const datos = await admin('/api/admin/usuarios');
    usuarios = datos.usuarios || usuarios;
    pintar();
  } catch {
    // sin conexión: se intenta en el siguiente minuto
  }
}

buscador.addEventListener('input', retrasar(pintar, 150));
iniciar();
setInterval(refrescar, 30000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refrescar(); });
