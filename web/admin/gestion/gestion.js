// Gestión de usuarios: registrar, editar, cambiar rol y eliminar (con confirmación).
import { el, aviso, normalizar, fecha, iniciales, retrasar, crearModal } from '/portal/assets/js/ui.js';
import { icono } from '/portal/assets/js/iconos.js';
import { admin } from '/portal/assets/js/api.js';

const filas = document.getElementById('filas');
const buscador = document.getElementById('buscar');
const contador = document.getElementById('contador');
const modalEditar = crearModal('modal-editar');
const modalEliminar = crearModal('modal-eliminar');

let usuarios = [];
let seleccionado = null;

// ---------- Lista ----------
function botonAccion(nombreIcono, etiqueta, alClic, { peligro = false, deshabilitado = false, titulo } = {}) {
  return el('button', {
    class: `mini-boton ${peligro ? 'boton-peligro' : ''}`, type: 'button',
    'aria-label': etiqueta, title: titulo || etiqueta, disabled: deshabilitado, onclick: alClic,
  }, [icono(nombreIcono)]);
}

function fila(u, i) {
  const tr = el('tr', {}, [
    el('td', {}, [el('div', { class: 'persona' }, [
      el('span', { class: 'avatar', 'aria-hidden': 'true', text: iniciales(u.nombre_usuario) }),
      el('div', {}, [el('strong', { text: u.nombre_usuario || 'Sin nombre' }), el('small', { text: u.correo })]),
    ])]),
    el('td', {}, [el('span', { class: `insignia-rol rol-${u.rol}`, text: u.rol })]),
    el('td', { text: fecha(u.creado_en) }),
    el('td', {}, [el('div', { class: 'acciones' }, [
      botonAccion('editar', `Editar a ${u.nombre_usuario}`, () => abrirEdicion(u)),
      botonAccion('llave', 'Restablecer contraseña', null, { deshabilitado: true, titulo: 'Restablecer contraseña: disponible en la fase 3' }),
      botonAccion('basura', `Eliminar a ${u.nombre_usuario}`, () => abrirEliminacion(u), { peligro: true }),
    ])]),
  ]);
  tr.style.animationDelay = `${Math.min(i, 15) * 30}ms`;
  return tr;
}

function pintar() {
  const termino = normalizar(buscador.value.trim());
  const visibles = usuarios.filter((u) => !termino || normalizar(`${u.nombre_usuario} ${u.correo}`).includes(termino));
  contador.textContent = `${visibles.length} de ${usuarios.length}`;
  filas.replaceChildren(...(visibles.length
    ? visibles.map(fila)
    : [el('tr', {}, [el('td', { colspan: '4', class: 'vacio', text: 'No hay usuarios que coincidan.' })])]));
}

async function cargar() {
  try {
    usuarios = (await admin('/api/admin/usuarios')).usuarios || [];
    pintar();
  } catch (err) {
    filas.replaceChildren(el('tr', {}, [el('td', { colspan: '4', class: 'vacio', text: `No se pudo cargar la lista: ${err.message}` })]));
  }
}

// ---------- Registro ----------
const formRegistro = document.getElementById('form-registro');
const campoPassword = document.getElementById('r-password');
const medidor = document.getElementById('medidor');

function fuerza(password) {
  let puntos = 0;
  if (password.length >= 8) puntos++;
  if (password.length >= 12) puntos++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) puntos++;
  if (/\d/.test(password)) puntos++;
  if (/[^A-Za-z0-9]/.test(password)) puntos++;
  return puntos; // 0 a 5
}

campoPassword.addEventListener('input', () => {
  const p = fuerza(campoPassword.value);
  const colores = ['#d64545', '#d64545', '#f08c2b', '#f0c02b', '#5cc489', '#2b7a56'];
  medidor.style.width = `${(p / 5) * 100}%`;
  medidor.style.backgroundColor = colores[p];
});

document.getElementById('ver-password').addEventListener('click', (e) => {
  const visible = campoPassword.type === 'text';
  campoPassword.type = visible ? 'password' : 'text';
  e.currentTarget.setAttribute('aria-label', visible ? 'Mostrar contraseña' : 'Ocultar contraseña');
});

document.getElementById('generar-password').addEventListener('click', () => {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%*?';
  const aleatorios = crypto.getRandomValues(new Uint32Array(14));
  campoPassword.value = Array.from(aleatorios, (n) => alfabeto[n % alfabeto.length]).join('');
  campoPassword.type = 'text';
  campoPassword.dispatchEvent(new Event('input'));
  aviso('Contraseña segura generada');
});

formRegistro.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!formRegistro.checkValidity()) { formRegistro.reportValidity(); return; }
  const boton = formRegistro.querySelector('[type="submit"]');
  boton.disabled = true;
  try {
    const datos = Object.fromEntries(new FormData(formRegistro));
    const respuesta = await admin('/api/admin/registrar-usuario', { method: 'POST', body: datos });
    aviso(respuesta.mensaje);
    formRegistro.reset();
    campoPassword.type = 'password';
    medidor.style.width = '0%';
    await cargar();
  } catch (err) {
    aviso(err.message, 'error');
  } finally {
    boton.disabled = false;
  }
});

// ---------- Edición ----------
const formEditar = document.getElementById('form-editar');

function abrirEdicion(u) {
  seleccionado = u;
  document.getElementById('e-nombre').value = u.nombre_usuario || '';
  document.getElementById('e-correo').value = u.correo || '';
  document.getElementById('e-rol').value = u.rol;
  modalEditar.abrir();
}

formEditar.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!formEditar.checkValidity()) { formEditar.reportValidity(); return; }
  try {
    const respuesta = await admin(`/api/admin/usuarios/${seleccionado.id}`, {
      method: 'PUT',
      body: {
        nombre_usuario: document.getElementById('e-nombre').value,
        correo: document.getElementById('e-correo').value,
        rol: document.getElementById('e-rol').value,
      },
    });
    aviso(respuesta.mensaje);
    modalEditar.cerrar();
    await cargar();
  } catch (err) {
    aviso(err.message, 'error');
  }
});

// ---------- Eliminación ----------
const confirmacion = document.getElementById('eliminar-confirmacion');
const botonEliminar = document.getElementById('confirmar-eliminar');

function abrirEliminacion(u) {
  seleccionado = u;
  document.getElementById('eliminar-nombre').textContent = u.nombre_usuario || u.correo;
  document.getElementById('eliminar-correo').textContent = u.correo;
  confirmacion.value = '';
  botonEliminar.disabled = true;
  modalEliminar.abrir();
}

confirmacion.addEventListener('input', () => {
  botonEliminar.disabled = confirmacion.value.trim() !== seleccionado?.correo;
});

document.getElementById('form-eliminar').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (botonEliminar.disabled) return;
  try {
    const respuesta = await admin(`/api/admin/usuarios/${seleccionado.id}`, { method: 'DELETE' });
    aviso(respuesta.mensaje);
    modalEliminar.cerrar();
    await cargar();
  } catch (err) {
    aviso(err.message, 'error');
  }
});

buscador.addEventListener('input', retrasar(pintar, 150));
cargar();
