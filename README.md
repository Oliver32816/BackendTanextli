# Tanextli · Backend

API, portal web público y panel admin de Tanextli (aprendizaje de náhuatl).

## Estructura

```
src/
  server.js          Punto de entrada: levanta portal/API (PORT) y panel admin (ADMIN_PORT)
  app.js             App pública (Tailscale Funnel)
  admin-app.js       App del panel (solo tailnet)
  config/            env.js (valida .env) y db.js (pool de PostgreSQL)
  middlewares/       seguridad, validación y errores
  modules/<tema>/    routes → controller → service → repository
  routes/            agrupadores: api, web y admin
web/
  shared/            plantilla común (CSS, JS, íconos, logo)
  public/            páginas del portal: inicio, audios, imágenes, privacidad
  admin/             páginas del panel: usuarios (lectura) y gestión
  shared/lobita/     Lobita animada por capas, con gestos (mirada, globo, sueño)
db/roles/            rol de la aplicación con privilegios mínimos
db/contenido-ids.json  id fijos de cada palabra (NO borrar: el progreso depende de ellos)
scripts/             generar-contenido.mjs (genera la migración de palabras, en desarrollo)
```

## API

Base: `https://olo.tail0de9ec.ts.net`. Todas las rutas existen con `/api` y con `/api/v1`.
Los errores traen `estado: "ERROR"`, `mensaje` y `error` (mismo texto).

**Lecciones:** cada categoría tiene una lección por subcategoría (en orden) y al final el Repaso.
Se desbloquean en orden y el Repaso se abre al terminar las demás. `porcentaje` = lecciones
completadas / total (incluido el repaso). Actividades: `opcion_multiple`, `escritura`, `pronunciacion`.
Al terminar una lección la app manda **un solo** `POST /api/progreso/lecciones` con sus actividades y
palabras; se guarda todo en una transacción y responde el nuevo porcentaje y la siguiente lección.

**Progreso y token:** `:usuario` es el id o `yo`. Si la petición trae `Authorization: Bearer <token>`
(el que devuelve el login), solo se puede consultar o modificar el progreso de ese usuario
(un admin puede ver a cualquiera). Sin token se acepta el id, para no romper las apps actuales.

| Método | Ruta | Uso |
|---|---|---|
| POST | `/api/registro` | Crear cuenta: `nombre_usuario`, `correo`, `password` |
| POST | `/api/login` | `correo` (o `email`), `password` (o `contrasena`) → `{ estado, mensaje, usuario, token }` |
| POST | `/api/auth/google` | "Continuar con Google": `credential` (ID token de Google). Crea la cuenta (201) o inicia sesión (200); si ya existía una cuenta con ese correo la vincula → `{ nuevo, usuario, token }` |
| GET | `/api/perfil` | Usuario de la sesión. Cabecera `Authorization: Bearer <token>` (dura 7 días) |
| PUT | `/api/perfil/password` | Con token: `password_actual`, `password_nueva` (mín. 8). Quita el aviso `debe_cambiar_password` |
| GET | `/api/progreso/:usuario/categorias` | Avance de cada categoría: lecciones completadas/total, `porcentaje`, `siguiente_leccion` |
| GET | `/api/progreso/:usuario/categorias/:categoria` | Lecciones de una categoría con `estado` (`completada`, `disponible`, `bloqueada`), puntajes y `actividades` (`{ escritura: { aciertos, total } }`) |
| GET | `/api/progreso/:usuario/lecciones` | Lecciones completadas `{ progreso: { familia: [1, 2], frases: [3] }, lecciones: [...] }` |
| POST | `/api/progreso/lecciones` | `usuario_id`, `categoria` (`"familia"` o `9`), `leccion`, `puntaje?`, `actividades?` `[{ tipo, aciertos, total }]`, `palabras?` `[{ palabra_id, completado?, puntaje? }]` |
| GET | `/api/progreso/:usuario/resumen` | Avance por categoría: lecciones, palabras practicadas, puntaje promedio |
| GET | `/api/progreso/:usuario_id` · `/api/progreso?usuario_id=` | Palabras practicadas (formato original + `ultimo_puntaje`, `mejor_puntaje`) |
| POST | `/api/progreso` | `usuario_id`, `palabra_id`, `categoria_id`, `completado?`, `puntaje?` |
| DELETE | `/api/progreso/:usuario` | Reinicia todo el avance. **Requiere token** |
| GET | `/api/categorias` · `/api/palabras?categoria_id=` · `/api/mascota/frases` | Contenido |
| GET | `/api/media-list` · `/api/imagenes?categoria=` | Multimedia |
| GET | `/api/usuarios` · `/api/progreso` (sin id) | **Solo equipo**: dispositivos de la red Tailscale |

Archivos: `/audios/...`, `/media/...` y `/multimedia/AudiosTanextli/...` (misma carpeta).
Panel admin (solo tailnet, también bajo `/api` del puerto 9443): `GET/POST /api/admin/usuarios`,
`PUT/DELETE /api/admin/usuarios/:id`, `PUT /api/admin/usuarios/:id/rol` (`{ rol }`) y
`POST /api/admin/usuarios/:id/restablecer-password` (devuelve una `password_temporal` una sola vez; al
entrar con ella el login trae `debe_cambiar_password: true` y la app debe pedir una nueva). Nunca se
puede quitar ni borrar al último superusuario.

**Google:** crea un ID de cliente OAuth "Aplicación web" en Google Cloud y ponlo en
`GOOGLE_CLIENT_IDS` (separa con comas si agregas el de Android). Vacío = Google desactivado (503).

Panel admin: `https://olo.tail0de9ec.ts.net:9443/admin/` (solo tailnet). El botón "Usuarios" del
portal lleva ahí a los dispositivos de la tailnet; desde internet muestra "No tienes acceso".

## Base de datos y contenido

```
usuarios 1─N progreso_usuarios N─1 palabras N─1 categorias (subcategoría = lección)
usuarios 1─N progreso_lecciones N─1 categorias (categoría principal)
usuarios 1─N resultados_actividades N─1 categorias (cada intento de actividad de una lección)
categorias 1─N categorias (categoria_padre_id)
```

| Archivo | Qué hace | Cuándo corre |
|---|---|---|
| `init.sql` | Estructura final (tablas vacías) | Docker, solo con el volumen vacío |
| `db/migrations/002_contenido_nahuatl.sql` | Categorías y palabras en español y náhuatl (de `contenido.json`, con id fijos) | Docker en instalación nueva; a mano en producción |
| `db/migrations/003_progreso_usuarios.sql` | Progreso por lección, resultados de actividades, puntajes, bcrypt, correo sin mayúsculas | Igual que 002 |
| `db/legacy/init_original.sql` | El init.sql original (lo usa el generador para respetar los id) | Nunca |

Las migraciones se pueden ejecutar varias veces y no borran datos. En producción:

```bash
docker exec -i tanextli_db psql -U postgres -d tanextli_db -v ON_ERROR_STOP=1 < db/migrations/003_progreso_usuarios.sql
```

Contraseñas: se guardan con bcrypt; las cuentas antiguas en texto plano se convierten solas en su
siguiente inicio de sesión. La API solo muestra palabras con náhuatl.

Para regenerar la migración 002 cuando cambie `contenido.json`:

```bash
node scripts/generar-contenido.mjs "<ruta>/Frontend/interfaz/src/data/contenido.json"
```

Haz commit también de `db/contenido-ids.json` (id fijo de cada palabra: el progreso depende de él).

## Desarrollo

```bash
cp .env.example .env   # completar valores
npm install
npm run dev            # node --watch
npm run lint
```

## Producción (servidor)

```bash
git pull && npm ci --omit=dev
pm2 reload ecosystem.config.js && pm2 save
```

| Puerto interno | Publicado por | Contenido |
|---|---|---|
| 127.0.0.1:3001 | Funnel :443 (público) | `/api`, `/api/v1`, `/portal`, `/media`, `/multimedia`, `/galeria-imagenes`, `/health` |
| 127.0.0.1:3010 | serve :9443 (solo tailnet) | `/admin/*`, `/api/admin/*` |
