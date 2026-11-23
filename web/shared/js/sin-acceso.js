// Página "No tienes acceso": Lobita animada y botón al portal público (puerto 443),
// aunque la página se muestre desde el panel.
import { iniciarLobitas } from '../lobita/lobita.js';

document.getElementById('volver').href = `${location.protocol}//${location.hostname}/portal/`;
iniciarLobitas();
