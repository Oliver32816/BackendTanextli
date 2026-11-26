// Comprime (gzip) las páginas, el CSS, el JS y las respuestas JSON: llegan ~70 % más ligeras.
// Audios e imágenes no se tocan (ya vienen comprimidos y así el audio sigue cargando por partes).
// Usa el paquete "compression"; si todavía no está instalado, el servidor funciona igual, sin comprimir.
let compression = null;
try {
  // eslint-disable-next-line global-require
  compression = require('compression');
} catch {
  console.warn('[web] Falta el paquete "compression" (npm install compression): las respuestas van sin comprimir.');
}

const NO_COMPRIMIR = /\.(m4a|mp3|ogg|wav|webm|aac|png|jpe?g|webp|gif|tflite|wasm|zip)$/i;

module.exports = compression
  ? compression({
      threshold: 1024, // menos de 1 KB no vale la pena
      filter: (req, res) => !NO_COMPRIMIR.test(req.path) && compression.filter(req, res),
    })
  : (req, res, next) => next();
