-- =========================================================================
-- 005 · Verificación de correo y recuperación de contraseña por correo
--
-- * usuarios.correo_verificado:
--     TRUE  = la persona demostró que el correo es suyo (código por correo o cuenta de Google).
--     FALSE = cuenta nueva que todavía no confirma su correo (la app web se lo pide).
--     NULL  = cuenta creada antes de esta migración: la app lo sugiere, pero no lo exige.
-- * usuarios.correo_verificado_en: cuándo se verificó.
-- * codigos_correo: códigos de 6 dígitos que se envían por correo. Solo se guarda su huella
--   (HMAC), nunca el código. Vencen a los 15 minutos y aceptan pocos intentos.
--
-- Se puede ejecutar varias veces. No borra datos. Respaldar antes de ejecutar.
-- =========================================================================
BEGIN;

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS correo_verificado    BOOLEAN,
    ADD COLUMN IF NOT EXISTS correo_verificado_en TIMESTAMP;

-- Las cuentas que se creen desde ahora empiezan sin verificar
ALTER TABLE usuarios ALTER COLUMN correo_verificado SET DEFAULT FALSE;

-- Las cuentas vinculadas a Google ya tienen el correo verificado por Google
UPDATE usuarios
   SET correo_verificado = TRUE,
       correo_verificado_en = COALESCE(correo_verificado_en, NOW())
 WHERE google_id IS NOT NULL
   AND correo_verificado IS DISTINCT FROM TRUE;

CREATE TABLE IF NOT EXISTS codigos_correo (
    id          SERIAL PRIMARY KEY,
    usuario_id  INT          NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo        VARCHAR(20)  NOT NULL,
    codigo_hash CHAR(64)     NOT NULL,
    intentos    SMALLINT     NOT NULL DEFAULT 0,
    expira_en   TIMESTAMP    NOT NULL,
    usado_en    TIMESTAMP,
    creado_en   TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_codigos_correo_tipo CHECK (tipo IN ('verificacion', 'restablecer'))
);
CREATE INDEX IF NOT EXISTS ix_codigos_correo_usuario ON codigos_correo (usuario_id, tipo, creado_en DESC);

-- Limpieza: códigos vencidos hace más de un día ya no sirven para nada
DELETE FROM codigos_correo WHERE expira_en < NOW() - INTERVAL '1 day';

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tanextli_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO tanextli_app;
        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO tanextli_app;
    END IF;
END $$;

COMMIT;
