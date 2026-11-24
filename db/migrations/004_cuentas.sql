-- =========================================================================
-- 004 · Cuentas: inicio con Google, contraseña temporal y último acceso
--
-- * proveedor: 'local' (correo y contraseña) o 'google' (creada con "Continuar con Google").
-- * google_id: identificador de la cuenta de Google (una cuenta local también puede vincularse).
-- * debe_cambiar_password: TRUE después de que un admin restablece la contraseña.
-- * ultimo_acceso: último inicio de sesión (columna "Conexión" del panel).
--
-- Se puede ejecutar varias veces. No borra datos. Respaldar antes de ejecutar.
-- =========================================================================
BEGIN;

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS proveedor             VARCHAR(20)  NOT NULL DEFAULT 'local',
    ADD COLUMN IF NOT EXISTS google_id             VARCHAR(64),
    ADD COLUMN IF NOT EXISTS foto_url              VARCHAR(500),
    ADD COLUMN IF NOT EXISTS debe_cambiar_password BOOLEAN      NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS ultimo_acceso         TIMESTAMP;

ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS chk_usuarios_proveedor;
ALTER TABLE usuarios ADD CONSTRAINT chk_usuarios_proveedor CHECK (proveedor IN ('local', 'google'));
CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_google_id ON usuarios (google_id) WHERE google_id IS NOT NULL;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tanextli_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO tanextli_app;
        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO tanextli_app;
    END IF;
END $$;

COMMIT;
