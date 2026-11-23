-- Usuario de la aplicación con mínimos privilegios: lee y escribe datos,
-- pero no puede borrar tablas, cambiar el esquema ni crear usuarios.
-- Uso: psql -U postgres -d tanextli_db -v app_pwd="..." -f rol_app.sql
\set ON_ERROR_STOP on

CREATE ROLE tanextli_app LOGIN PASSWORD :'app_pwd';

GRANT CONNECT ON DATABASE tanextli_db TO tanextli_app;
GRANT USAGE ON SCHEMA public TO tanextli_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO tanextli_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO tanextli_app;

-- Tablas y secuencias que creen las migraciones futuras (ejecutadas como postgres)
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO tanextli_app;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO tanextli_app;
