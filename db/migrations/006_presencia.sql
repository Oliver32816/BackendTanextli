-- =========================================================================
-- 006 · Presencia ("En línea ahora") más precisa
--
-- * usuarios.ultima_senal: última vez que la app ABIERTA Y VISIBLE avisó que sigue en uso
--   (POST /auth/latido, cada 30 s). Se borra (NULL) al cerrar sesión, cerrar la pestaña o
--   dejar la app en segundo plano (POST /auth/salida). "Ahora" = señal de hace menos de 75 s.
-- * ultimo_acceso no cambia: sigue siendo la última actividad con sesión (para "hace 2 horas").
--
-- Se puede ejecutar varias veces. No borra datos.
-- =========================================================================
BEGIN;

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ultima_senal TIMESTAMPTZ;

COMMIT;
