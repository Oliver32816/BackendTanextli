-- =========================================================================
-- 001 · Estructura de la base de datos Tanextli
--
-- Solo crea las tablas (vacías). Docker lo ejecuta únicamente cuando el volumen está
-- vacío, seguido de:
--   002_contenido_nahuatl.sql   categorías y palabras en español y náhuatl
--   003_progreso_usuarios.sql   progreso (ya incluido aquí; en una base nueva no cambia nada)
--   004_cuentas.sql             Google y contraseña temporal (ya incluido aquí)
--   005_verificacion_correo.sql verificación de correo y códigos por correo (ya incluido aquí)
--
-- Relaciones:
--   usuarios 1─N progreso_usuarios N─1 palabras N─1 categorias (subcategoría = lección)
--   usuarios 1─N progreso_lecciones N─1 categorias (categoría principal)
--   usuarios 1─N resultados_actividades N─1 categorias (cada intento de actividad de una lección)
--   categorias 1─N categorias (categoria_padre_id: categoría principal → subcategorías)
-- =========================================================================

-- 1. Usuarios -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id             SERIAL PRIMARY KEY,
    nombre_usuario VARCHAR(80)  NOT NULL,
    correo         VARCHAR(254) NOT NULL UNIQUE,
    password_hash  VARCHAR(100) NOT NULL,              -- bcrypt
    rol            VARCHAR(10)  DEFAULT 'usuario' CHECK (rol IN ('usuario', 'admin', 'superuser')),
    creado_en      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    proveedor      VARCHAR(20)  NOT NULL DEFAULT 'local', -- 'local' o 'google'
    google_id      VARCHAR(64),
    foto_url       VARCHAR(500),
    debe_cambiar_password BOOLEAN NOT NULL DEFAULT FALSE, -- tras un restablecimiento
    ultimo_acceso  TIMESTAMP,
    correo_verificado    BOOLEAN DEFAULT FALSE,      -- NULL = cuenta anterior a la verificación
    correo_verificado_en TIMESTAMP,
    CONSTRAINT chk_usuarios_proveedor CHECK (proveedor IN ('local', 'google'))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_correo_lower ON usuarios (lower(correo));
CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_google_id ON usuarios (google_id) WHERE google_id IS NOT NULL;

-- Códigos de 6 dígitos enviados por correo (verificar correo / restablecer contraseña).
-- Solo se guarda su huella HMAC, nunca el código.
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

-- 2. Categorías y subcategorías ---------------------------------------------------
-- Principal: categoria_padre_id NULL (Familia, Colores…). Subcategoría: la lección (Familia principal…).
CREATE TABLE IF NOT EXISTS categorias (
    id                 SERIAL PRIMARY KEY,
    nombre             VARCHAR(100) NOT NULL,
    categoria_padre_id INT REFERENCES categorias(id) ON DELETE CASCADE,
    imagen_url         VARCHAR(255),
    slug               VARCHAR(80),                     -- igual que la carpeta de audios
    orden              SMALLINT NOT NULL DEFAULT 0,
    nombre_nahuatl     VARCHAR(100),
    disponible         BOOLEAN  NOT NULL DEFAULT TRUE
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_categorias_slug ON categorias (categoria_padre_id, slug);

-- 3. Palabras ----------------------------------------------------------------------
-- id fijo (db/contenido-ids.json): el progreso lo guarda, no debe cambiar.
CREATE TABLE IF NOT EXISTS palabras (
    id           SERIAL PRIMARY KEY,
    espanol      VARCHAR(150) NOT NULL,
    nahuatl      VARCHAR(150),                          -- NULL = falta la traducción (la API no la muestra)
    categoria_id INT REFERENCES categorias(id) ON DELETE CASCADE,   -- subcategoría
    imagen_url   VARCHAR(255),
    slug         VARCHAR(80),                           -- igual que el nombre del archivo de audio
    orden        SMALLINT NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_palabras_slug ON palabras (categoria_id, slug);
CREATE INDEX        IF NOT EXISTS idx_palabras_cat ON palabras (categoria_id, orden);

-- 4. Progreso por palabra (práctica y pronunciación) -------------------------------
CREATE TABLE IF NOT EXISTS progreso_usuarios (
    id               SERIAL PRIMARY KEY,
    usuario_id       INT REFERENCES usuarios(id)   ON DELETE CASCADE,
    palabra_id       INT REFERENCES palabras(id)   ON DELETE CASCADE,
    categoria_id     INT REFERENCES categorias(id) ON DELETE CASCADE,
    completado       BOOLEAN   DEFAULT TRUE,
    veces_practicada INT       DEFAULT 1,
    ultima_practica  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultimo_puntaje   SMALLINT,
    mejor_puntaje    SMALLINT,
    primera_practica TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_usuario_palabra UNIQUE (usuario_id, palabra_id),
    CONSTRAINT chk_progreso_puntajes CHECK ((ultimo_puntaje IS NULL OR ultimo_puntaje BETWEEN 0 AND 100)
                                        AND (mejor_puntaje  IS NULL OR mejor_puntaje  BETWEEN 0 AND 100))
);
CREATE INDEX IF NOT EXISTS idx_progreso_usuarios_usuario ON progreso_usuarios (usuario_id);

-- 5. Progreso por lección ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS progreso_lecciones (
    id             SERIAL PRIMARY KEY,
    usuario_id     INT       NOT NULL REFERENCES usuarios(id)   ON DELETE CASCADE,
    categoria_id   INT       NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,   -- principal
    leccion        SMALLINT  NOT NULL CHECK (leccion BETWEEN 1 AND 99),
    intentos       INT       NOT NULL DEFAULT 1,
    ultimo_puntaje SMALLINT  CHECK (ultimo_puntaje BETWEEN 0 AND 100),
    mejor_puntaje  SMALLINT  CHECK (mejor_puntaje  BETWEEN 0 AND 100),
    completada_en  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_progreso_leccion UNIQUE (usuario_id, categoria_id, leccion)
);
CREATE INDEX IF NOT EXISTS idx_progreso_lecciones_usuario ON progreso_lecciones (usuario_id);

-- 6. Resultados de actividades (opción múltiple, escritura, pronunciación) -----------
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
