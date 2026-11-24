-- =========================================================================
-- 003 · Progreso por usuario y contraseñas seguras
--
-- * progreso_lecciones: qué lecciones completó cada usuario en cada categoría
--   (lo que la app guardaba en el navegador como { familia: [1, 2], colores: [1] }).
-- * resultados_actividades: cada intento de actividad (opción múltiple, escritura,
--   pronunciación) con aciertos/total: "Desempeño por actividad 18/20".
-- * progreso_usuarios (por palabra): agrega puntajes de pronunciación.
-- * usuarios: amplía password_hash para bcrypt y correo a 254 caracteres; correo único
--   sin distinguir mayúsculas.
-- * Quita la tabla heredada progreso_nino solo si está vacía.
--
-- Se puede ejecutar varias veces. No borra datos. Respaldar antes de ejecutar.
-- =========================================================================
BEGIN;

-- 1. Usuarios ------------------------------------------------------------------
ALTER TABLE usuarios ALTER COLUMN password_hash TYPE VARCHAR(100);
ALTER TABLE usuarios ALTER COLUMN correo TYPE VARCHAR(254);
ALTER TABLE usuarios ALTER COLUMN nombre_usuario TYPE VARCHAR(80);
-- Un mismo correo no puede registrarse dos veces aunque cambien las mayúsculas
DO $$
BEGIN
    IF EXISTS (SELECT lower(correo) FROM usuarios GROUP BY lower(correo) HAVING count(*) > 1) THEN
        RAISE NOTICE 'Hay correos repetidos con distintas mayúsculas: no se crea el índice uq_usuarios_correo_lower';
    ELSE
        CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_correo_lower ON usuarios (lower(correo));
    END IF;
END $$;

-- 2. Progreso por palabra (práctica y pronunciación) ----------------------------
ALTER TABLE progreso_usuarios
    ADD COLUMN IF NOT EXISTS ultimo_puntaje   SMALLINT,
    ADD COLUMN IF NOT EXISTS mejor_puntaje    SMALLINT,
    ADD COLUMN IF NOT EXISTS primera_practica TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE progreso_usuarios DROP CONSTRAINT IF EXISTS chk_progreso_puntajes;
ALTER TABLE progreso_usuarios ADD CONSTRAINT chk_progreso_puntajes
    CHECK ((ultimo_puntaje IS NULL OR ultimo_puntaje BETWEEN 0 AND 100)
       AND (mejor_puntaje  IS NULL OR mejor_puntaje  BETWEEN 0 AND 100));
CREATE INDEX IF NOT EXISTS idx_progreso_usuarios_usuario ON progreso_usuarios (usuario_id);

-- 3. Progreso por lección ----------------------------------------------------
-- categoria_id = categoría principal (Familia 9, Colores 6, Números 19, Frases comunes 14…)
-- leccion      = número de lección dentro de la categoría, como en la app (1, 2, 3…; incluye el repaso)
CREATE TABLE IF NOT EXISTS progreso_lecciones (
    id             SERIAL PRIMARY KEY,
    usuario_id     INT       NOT NULL REFERENCES usuarios(id)   ON DELETE CASCADE,
    categoria_id   INT       NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
    leccion        SMALLINT  NOT NULL CHECK (leccion BETWEEN 1 AND 99),
    intentos       INT       NOT NULL DEFAULT 1,
    ultimo_puntaje SMALLINT  CHECK (ultimo_puntaje BETWEEN 0 AND 100),
    mejor_puntaje  SMALLINT  CHECK (mejor_puntaje  BETWEEN 0 AND 100),
    completada_en  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_progreso_leccion UNIQUE (usuario_id, categoria_id, leccion)
);
CREATE INDEX IF NOT EXISTS idx_progreso_lecciones_usuario ON progreso_lecciones (usuario_id);

-- 4. Resultados de actividades (un registro por intento) -------------------------
CREATE TABLE IF NOT EXISTS resultados_actividades (
    id           SERIAL PRIMARY KEY,
    usuario_id   INT         NOT NULL REFERENCES usuarios(id)   ON DELETE CASCADE,
    categoria_id INT         NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,   -- principal
    leccion      SMALLINT    NOT NULL CHECK (leccion BETWEEN 1 AND 99),
    actividad    VARCHAR(20) NOT NULL CHECK (actividad IN ('opcion_multiple', 'escritura', 'pronunciacion')),
    aciertos     SMALLINT    NOT NULL CHECK (aciertos >= 0),
    total        SMALLINT    NOT NULL CHECK (total > 0),
    creado_en    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_resultado_aciertos CHECK (aciertos <= total)
);
CREATE INDEX IF NOT EXISTS idx_resultados_usuario_leccion ON resultados_actividades (usuario_id, categoria_id, leccion, actividad, creado_en DESC);

-- 5. Tabla heredada sin uso ----------------------------------------------------
DO $$
DECLARE n bigint;
BEGIN
    IF to_regclass('public.progreso_nino') IS NOT NULL THEN
        EXECUTE 'SELECT count(*) FROM progreso_nino' INTO n;
        IF n = 0 THEN
            DROP TABLE progreso_nino;
        ELSE
            RAISE NOTICE 'progreso_nino tiene % filas: se conserva', n;
        END IF;
    END IF;
END $$;

-- 6. Permisos del usuario de la aplicación (si ya existe) ----------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tanextli_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO tanextli_app;
        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO tanextli_app;
    END IF;
END $$;

COMMIT;
