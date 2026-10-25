-- 1. Tabla de Usuarios con soporte de 3 Roles (usuario, admin, superuser)
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre_usuario VARCHAR(50) NOT NULL,
    correo VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL DEFAULT 'usuario' CHECK (rol IN ('usuario', 'admin', 'superuser')),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Categorías
CREATE TABLE IF NOT EXISTS categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE
);

-- 3. Tabla de Palabras
CREATE TABLE IF NOT EXISTS palabras (
    id SERIAL PRIMARY KEY,
    categoria_id INT NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
    palabra_nahuatl VARCHAR(100) NOT NULL,
    traduccion VARCHAR(100) NOT NULL,
    audio_archivo VARCHAR(255) NOT NULL
);

-- 4. Tabla de Progreso
CREATE TABLE IF NOT EXISTS progreso_nino (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    palabra_id INT NOT NULL REFERENCES palabras(id) ON DELETE CASCADE,
    categoria_id INT NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
    completado BOOLEAN DEFAULT FALSE,
    veces_practicada INT DEFAULT 0,
    ultima_practica TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla de Objetos AR
CREATE TABLE IF NOT EXISTS objetos_ar (
    id SERIAL PRIMARY KEY,
    nombre_objeto VARCHAR(100) NOT NULL,
    palabra_id INT NOT NULL REFERENCES palabras(id) ON DELETE CASCADE,
    etiqueta_modelo VARCHAR(100) NOT NULL UNIQUE
);

-- 6. Categorías Semilla originales
INSERT INTO categorias (id, nombre) VALUES
(1, 'Animales'), (2, 'Colores'), (3, 'Números'), (4, 'Familia'),
(5, 'Frutas'), (6, 'Cuerpo Humano'), (7, 'Naturaleza'), (8, 'Saludos')
ON CONFLICT (id) DO NOTHING;

-- 7. Semilla de Superuser por defecto (Prioridad 1 e Intocable)
-- Nota: Puedes iniciar sesión con este correo y contraseña para administrar el sistema
INSERT INTO usuarios (nombre_usuario, correo, password_hash, rol)
VALUES (
    'Oliver Superuser', 
    'oliver@tanextli.com', 
    '$2b$10$e8R1/m.ejemploHashOContrasena', 
    'superuser'
) ON CONFLICT (correo) DO NOTHING;