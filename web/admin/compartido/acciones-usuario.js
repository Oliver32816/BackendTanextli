// Acciones sobre una cuenta (Usuarios y Gestión): editar, cambiar rol, restablecer contraseña y eliminar.
// Crea sus propias ventanas (modales) la primera vez que se usa.
import { el, aviso, crearModal, copiar } from '/portal/assets/js/ui.js';
import { icono } from '/portal/assets/js/iconos.js';
import { admin } from '/portal/assets/js/api.js';

const ROLES = [
  ['usuario', 'Estudiante (usuario)', 'Usa la app y guarda su progreso.'],
  ['admin', 'Administrador', 'Además puede administrar contenido.'],
  ['superuser', 'Superusuario', 'Control total. Debe existir al menos uno.'],
];

let modales = null;
let seleccionado = null;
let alTerminar = async () => {};

const campo = (id, etiqueta, props = {}) => el('div', { class: 'grupo' }, [
  el('label', { class: 'etiqueta', for: id, text: etiqueta }),
  el('input', { class: 'campo', id, ...props }),
]);
const pie = (textoBoton, nombreIcono, { peligro = false, id } = {}) => el('div', { class: 'pie-modal' }, [
  el('button', { class: 'boton boton-secundario', type: 'button', 'data-cerrar': true, text: 'Cancelar' }),
  el('button', { class: `boton ${peligro ? 'boton-peligro' : ''}`, type: 'submit', id }, [icono(nombreIcono), textoBoton]),
]);
const modal = (id, titulo, contenido, rol = 'dialog') => el('div', {
  class: 'modal', id, role: rol, 'aria-modal': 'true', 'aria-labelledby': `${id}-titulo`, 'aria-hidden': 'true',
}, [el('form', { class: 'caja', novalidate: true }, [el('h3', { id: `${id}-titulo`, text: titulo }), ...contenido])]);

async function enviar(form, accion) {
  const boton = form.querySelector('[type="submit"]');
  boton.disabled = true;
  try {
    await accion();
  } catch (err) {
    aviso(err.message, 'error');
  } finally {
    boton.disabled = false;
  }
}

function preparar() {
  if (modales) return modales;

  // ---------- Editar ----------
  document.body.append(modal('mu-editar', 'Editar usuario', [
    campo('mu-nombre', 'Nombre de usuario', { maxlength: '80', required: true, autocomplete: 'off' }),
    campo('mu-correo', 'Correo electrónico', { type: 'email', maxlength: '254', required: true, autocomplete: 'off' }),
    pie('Guardar cambios', 'check'),
  ]));

  // ---------- Cambiar rol ----------
  document.body.append(modal('mu-rol', 'Cambiar rol', [
    el('p', {}, ['Cuenta: ', el('strong', { id: 'mu-rol-nombre' })]),
    el('div', { class: 'opciones-rol', role: 'radiogroup', 'aria-label': 'Rol' }, ROLES.map(([valor, titulo, ayuda]) => el('label', { class: 'opcion-rol' }, [
      el('input', { type: 'radio', name: 'mu-rol', value: valor }),
      el('span', {}, [el('strong', { text: titulo }), el('small', { text: ayuda })]),
    ]))),
    pie('Cambiar rol', 'escudo'),
  ]));

  // ---------- Restablecer contraseña ----------
  document.body.append(modal('mu-reset', 'Restablecer contraseña', [
    el('div', { id: 'mu-reset-pregunta' }, [
      el('p', {}, ['Se generará una contraseña temporal para ', el('strong', { id: 'mu-reset-nombre' }), '. La anterior dejará de funcionar.']),
      el('p', { class: 'ayuda', id: 'mu-reset-google', hidden: true, text: 'Esta cuenta entra con Google: puede seguir haciéndolo. La contraseña temporal solo sirve para entrar con correo.' }),
    ]),
    el('div', { id: 'mu-reset-resultado', hidden: true }, [
      el('p', { text: 'Compártela con la persona por un medio privado. Se muestra solo esta vez; al iniciar sesión se le pedirá cambiarla.' }),
      el('div', { class: 'password-temporal' }, [
        el('code', { id: 'mu-reset-clave' }),
        el('button', { class: 'mini-boton', type: 'button', id: 'mu-reset-copiar', 'aria-label': 'Copiar contraseña' }, [icono('copiar')]),
      ]),
    ]),
    pie('Generar contraseña temporal', 'llave', { id: 'mu-reset-boton' }),
  ], 'alertdialog'));

  // ---------- Eliminar ----------
  document.body.append(modal('mu-eliminar', 'Eliminar cuenta', [
    el('p', {}, ['Se borrará la cuenta de ', el('strong', { id: 'mu-eliminar-nombre' }), ' y todo su progreso. ', el('strong', { text: 'No se puede deshacer.' })]),
    el('div', { class: 'grupo' }, [
      el('label', { class: 'etiqueta', for: 'mu-eliminar-confirmacion' }, ['Para confirmar, escribe el correo: ', el('code', { id: 'mu-eliminar-correo' })]),
      el('input', { class: 'campo', id: 'mu-eliminar-confirmacion', autocomplete: 'off' }),
    ]),
    pie('Eliminar definitivamente', 'basura', { peligro: true, id: 'mu-eliminar-boton' }),
  ], 'alertdialog'));

  modales = {
    editar: crearModal('mu-editar'), rol: crearModal('mu-rol'),
    reset: crearModal('mu-reset'), eliminar: crearModal('mu-eliminar'),
  };
  const $ = (id) => document.getElementById(id);

  modales.editar.modal.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    enviar(form, async () => {
      const r = await admin(`/api/admin/usuarios/${seleccionado.id}`, {
        method: 'PUT', body: { nombre_usuario: $('mu-nombre').value, correo: $('mu-correo').value },
      });
      aviso(r.mensaje);
      modales.editar.cerrar();
      await alTerminar();
    });
  });

  modales.rol.modal.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    const rol = e.currentTarget.querySelector('input[name="mu-rol"]:checked')?.value;
    if (!rol) return;
    enviar(e.currentTarget, async () => {
      const r = await admin(`/api/admin/usuarios/${seleccionado.id}/rol`, { method: 'PUT', body: { rol } });
      aviso(r.mensaje);
      modales.rol.cerrar();
      await alTerminar();
    });
  });

  modales.reset.modal.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!$('mu-reset-resultado').hidden) { modales.reset.cerrar(); return; }
    enviar(e.currentTarget, async () => {
      const r = await admin(`/api/admin/usuarios/${seleccionado.id}/restablecer-password`, { method: 'POST', body: {} });
      $('mu-reset-clave').textContent = r.password_temporal;
      $('mu-reset-pregunta').hidden = true;
      $('mu-reset-resultado').hidden = false;
      $('mu-reset-boton').replaceChildren(icono('check'), 'Listo');
      modales.reset.modal.querySelector('[data-cerrar]').style.display = 'none';
      aviso('Contraseña temporal generada');
      await alTerminar();
    });
  });
  $('mu-reset-copiar').addEventListener('click', () => copiar($('mu-reset-clave').textContent, 'Contraseña copiada'));

  const confirmacion = $('mu-eliminar-confirmacion');
  confirmacion.addEventListener('input', () => {
    $('mu-eliminar-boton').disabled = confirmacion.value.trim().toLowerCase() !== seleccionado?.correo.toLowerCase();
  });
  modales.eliminar.modal.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    if ($('mu-eliminar-boton').disabled) return;
    enviar(e.currentTarget, async () => {
      const r = await admin(`/api/admin/usuarios/${seleccionado.id}`, { method: 'DELETE' });
      aviso(r.mensaje);
      modales.eliminar.cerrar();
      await alTerminar();
    });
  });
  return modales;
}

const abrir = {
  editar(u) {
    preparar().editar.abrir();
    document.getElementById('mu-nombre').value = u.nombre_usuario || '';
    document.getElementById('mu-correo').value = u.correo || '';
  },
  rol(u) {
    preparar();
    document.getElementById('mu-rol-nombre').textContent = `${u.nombre_usuario} (${u.correo})`;
    document.querySelectorAll('input[name="mu-rol"]').forEach((r) => { r.checked = r.value === u.rol; });
    modales.rol.abrir();
  },
  reset(u) {
    preparar();
    document.getElementById('mu-reset-nombre').textContent = u.nombre_usuario || u.correo;
    document.getElementById('mu-reset-google').hidden = !u.con_google;
    document.getElementById('mu-reset-pregunta').hidden = false;
    document.getElementById('mu-reset-resultado').hidden = true;
    document.getElementById('mu-reset-clave').textContent = '';
    document.getElementById('mu-reset-boton').replaceChildren(icono('llave'), 'Generar contraseña temporal');
    modales.reset.modal.querySelector('[data-cerrar]').style.display = '';
    modales.reset.abrir();
  },
  eliminar(u) {
    preparar();
    document.getElementById('mu-eliminar-nombre').textContent = u.nombre_usuario || u.correo;
    document.getElementById('mu-eliminar-correo').textContent = u.correo;
    document.getElementById('mu-eliminar-confirmacion').value = '';
    document.getElementById('mu-eliminar-boton').disabled = true;
    modales.eliminar.abrir();
  },
};

function boton(nombreIcono, etiqueta, accion, { peligro = false } = {}) {
  return el('button', {
    class: `mini-boton ${peligro ? 'boton-peligro' : ''}`, type: 'button',
    'aria-label': etiqueta, title: etiqueta, onclick: accion,
  }, [icono(nombreIcono)]);
}

// Botones de una fila. "recargar" se llama después de cada cambio.
export function accionesDeUsuario(u, recargar) {
  const conRecarga = (fn) => () => { seleccionado = u; alTerminar = recargar; fn(u); };
  return el('div', { class: 'acciones' }, [
    boton('editar', `Editar a ${u.nombre_usuario}`, conRecarga(abrir.editar)),
    boton('escudo', `Cambiar rol de ${u.nombre_usuario}`, conRecarga(abrir.rol)),
    boton('llave', `Restablecer contraseña de ${u.nombre_usuario}`, conRecarga(abrir.reset)),
    boton('basura', `Eliminar a ${u.nombre_usuario}`, conRecarga(abrir.eliminar), { peligro: true }),
  ]);
}

// "Hace 5 min" / "Nunca"; "Ahora" (activo) si la app mandó señal en los últimos 3 minutos
// (la app abierta avisa cada minuto con POST /auth/latido)
const EN_LINEA_MIN = 3;
export function ultimoAcceso(fechaIso) {
  if (!fechaIso) return { texto: 'Nunca', activo: false };
  const minutos = Math.max(0, Math.round((Date.now() - new Date(fechaIso).getTime()) / 60000));
  const activo = minutos < EN_LINEA_MIN;
  const texto = activo ? 'Ahora' : minutos < 60 ? `Hace ${minutos} min`
    : minutos < 1440 ? `Hace ${Math.round(minutos / 60)} h` : `Hace ${Math.round(minutos / 1440)} d`;
  return { texto, activo };
}
