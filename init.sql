CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre_usuario VARCHAR(50) NOT NULL,
    correo VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS palabras (
    id SERIAL PRIMARY KEY,
    categoria_id INT NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
    palabra_nahuatl VARCHAR(100) NOT NULL,
    traduccion VARCHAR(100) NOT NULL,
    audio_archivo VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS progreso_nino (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    palabra_id INT NOT NULL REFERENCES palabras(id) ON DELETE CASCADE,
    categoria_id INT NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
    completado BOOLEAN DEFAULT FALSE,
    veces_practicada INT DEFAULT 0,
    ultima_practica TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS objetos_ar (
    id SERIAL PRIMARY KEY,
    nombre_objeto VARCHAR(100) NOT NULL,
    palabra_id INT NOT NULL REFERENCES palabras(id) ON DELETE CASCADE,
    etiqueta_modelo VARCHAR(100) NOT NULL UNIQUE
);

INSERT INTO categorias (id, nombre) VALUES
(1, 'Animales'), (2, 'Colores'), (3, 'Números'), (4, 'Familia'),
(5, 'Frutas'), (6, 'Cuerpo Humano'), (7, 'Naturaleza'), (8, 'Saludos')
ON CONFLICT (id) DO NOTHING;
