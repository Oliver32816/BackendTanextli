// Gestión de usuarios: registrar y administrar cuentas (editar, rol, contraseña, eliminar).
import { el, aviso, normalizar, fecha, iniciales, retrasar } from '/portal/assets/js/ui.js';
import { admin } from '/portal/assets/js/api.js';
import { accionesDeUsuario } from '/admin/compartido/acciones-usuario.js';

const filas = document.getElementById('filas');
const buscador = document.getElementById('buscar');
const contador = document.getElementById('contador');

let usuarios = [];

// ---------- Lista ----------
function fila(u, i) {
  const tr = el('tr', {}, [
    el('td', {}, [el('div', { class: 'persona' }, [
      el('span', { class: 'avatar', 'aria-hidden': 'true', text: iniciales(u.nombre_usuario) }),
      el('div', {}, [el('strong', { text: u.nombre_usuario || 'Sin nombre' }), el('small', { text: u.correo })]),
    ])]),
    el('td', {}, [el('span', { class: `insignia-rol rol-${u.rol}`, text: u.rol })]),
    el('td', { text: fecha(u.creado_en) }),
    el('td', {}, [accionesDeUsuario(u, cargar)]),
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

buscador.addEventListener('input', retrasar(pintar, 150));
cargar();
