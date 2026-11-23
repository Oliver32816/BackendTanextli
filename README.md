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

## Base de datos y contenido

1. `init.sql`: esquema base (001). Solo se ejecuta cuando el volumen de Docker está vacío.
2. `db/migrations/002_contenido_nahuatl.sql`: palabras en español y náhuatl tomadas de `contenido.json`
   del frontend. **Respeta los id de init.sql**, agrega las palabras nuevas con id consecutivos y no
   borra palabras ni progreso. Elimina la columna `palabras.audio_url` (las URL se ven en la página de
   audios). Se puede ejecutar varias veces. **Generado, no editar a mano.**
3. `db/revision/palabras-espanol-nahuatl.csv`: lista de palabras (id, categoría, español, náhuatl).
   `db/revision/palabras-sin-contenido.csv`: palabras de init.sql que no están en contenido.json
   (se conservan sin náhuatl, la API no las muestra).

La API (`/api/palabras`) devuelve solo palabras con náhuatl.

Para regenerar la migración cuando cambie `contenido.json`:

```bash
node scripts/generar-contenido.mjs "<ruta>/Frontend/interfaz/src/data/contenido.json"
```

Haz commit también de `db/contenido-ids.json` (id fijo de cada palabra).

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
