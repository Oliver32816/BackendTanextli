-- =========================================================================
-- ESQUEMA DE BASE DE DATOS TANEXTLI (VERSION DEFINITIVA CON COORDENADAS)
-- =========================================================================

-- 1. Tabla de Usuarios (Base para la vinculación automática)
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre_usuario VARCHAR(50) NOT NULL,
    correo VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(50) NOT NULL,
    rol VARCHAR(10) DEFAULT 'usuario' CHECK (rol IN ('usuario', 'admin', 'superuser')),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Categorías y Subcategorías Jerárquicas
CREATE TABLE IF NOT EXISTS categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    categoria_padre_id INT REFERENCES categorias(id) ON DELETE CASCADE NULL,
    imagen_url VARCHAR(255) NULL
);

-- 3. Tabla de Palabras / Lecciones (Cada palabra con su ID único y coordenada exacta)
CREATE TABLE IF NOT EXISTS palabras (
    id SERIAL PRIMARY KEY,
    espanol VARCHAR(150) NOT NULL,
    nahuatl VARCHAR(150) NOT NULL, -- Se puede poblar o actualizar con el término en Náhuatl
    categoria_id INT REFERENCES categorias(id) ON DELETE CASCADE, -- ID de la Subcategoría
    audio_url VARCHAR(255) NULL,
    imagen_url VARCHAR(255) NULL
);

-- 4. Tabla de Progreso por Usuario (Vinculación automática cuenta <-> coordenada exacta)
CREATE TABLE IF NOT EXISTS progreso_usuarios (
    id SERIAL PRIMARY KEY,
    usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
    palabra_id INT REFERENCES palabras(id) ON DELETE CASCADE,
    categoria_id INT REFERENCES categorias(id) ON DELETE CASCADE, -- Subcategoría o categoría para referencia rápida
    completado BOOLEAN DEFAULT TRUE,
    veces_practicada INT DEFAULT 1,
    ultima_practica TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_usuario_palabra UNIQUE(usuario_id, palabra_id)
);

-- =========================================================================
-- SEEDERS: CATEGORÍAS Y SUBCATEGORÍAS
-- =========================================================================
INSERT INTO categorias (id, nombre, categoria_padre_id) VALUES
-- Animales (ID 1)
(1, 'Animales', NULL),
(2, 'Animales de granja', 1),
(3, 'Animales domésticos', 1),
(4, 'Animales silvestres', 1),
(5, 'Aves y reptiles', 1),

-- Colores (ID 6)
(6, 'Colores', NULL),
(7, 'Colores básicos', 6),
(8, 'Colores secundarios', 6),

-- Familia (ID 9)
(9, 'Familia', NULL),
(10, 'Familia Principal', 9),
(11, 'Familia extendida', 9),
(12, 'Más familiares', 9),
(13, 'Personas', 9),

-- Frases comunes (ID 14)
(14, 'Frases comunes', NULL),
(15, 'Conversación', 14),
(16, 'Despedida', 14),
(17, 'Expresiones', 14),
(18, 'Saludos', 14),

-- Números (ID 19)
(19, 'Números', NULL),
(20, 'Del 1-5', 19),
(21, 'Del 6-10', 19),
(22, 'Del 11-15', 19),
(23, 'Del 16-20', 19),

-- Objetos (ID 24)
(24, 'Objetos', NULL),
(25, 'Cocina', 24),
(26, 'Hogar', 24),
(27, 'Objetos de casa', 24),
(28, 'Objetos diversos', 24),

-- Partes del cuerpo (ID 29)
(29, 'Partes del cuerpo', NULL),
(30, 'Extremidades del cuerpo', 29),
(31, 'Rostro', 29),

-- Sentimientos (ID 32)
(32, 'Sentimientos', NULL),
(33, 'Emociones intensas', 32),
(34, 'Sentimientos difíciles', 32),
(35, 'Sentimientos positivos', 32),
(36, 'Valores y emociones', 32),

-- Voz lobita (ID 37)
(37, 'Voz lobita', NULL),
(38, 'Voz lobita', 37)
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- SEEDERS: TODAS LAS PALABRAS Y AUDIOS (CATÁLOGO COMPLETO)
-- =========================================================================
INSERT INTO palabras (id, espanol, nahuatl, categoria_id, audio_url) VALUES
-- 📌 Animales de granja (Subcategoría ID 2)
(1, 'Cerdo', 'Cerdo', 2, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Animales/Animales%20de%20granja/Cerdo.m4a'),
(2, 'Gallina', 'Gallina', 2, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Animales/Animales%20de%20granja/Gallina.m4a'),
(3, 'Gallo', 'Gallo', 2, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Animales/Animales%20de%20granja/Gallo.m4a'),
(4, 'Guajolote', 'Guajolote', 2, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Animales/Animales%20de%20granja/Guajolote.m4a'),
(5, 'Oveja', 'Oveja', 2, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Animales/Animales%20de%20granja/Oveja.m4a'),
(6, 'Pato', 'Pato', 2, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Animales/Animales%20de%20granja/Pato.m4a'),

-- 📌 Animales domésticos (Subcategoría ID 3)
(7, 'Conejo', 'Conejo', 3, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Animales/Animales%20dom%C3%A9sticos/Conejo.m4a'),
(8, 'Gato', 'Gato', 3, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Animales/Animales%20dom%C3%A9sticos/Gato.m4a'),
(9, 'Perro', 'Perro', 3, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Animales/Animales%20dom%C3%A9sticos/Perro.m4a'),

-- 📌 Animales silvestres (Subcategoría ID 4)
(10, 'Ardilla', 'Ardilla', 4, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Animales/Animales%20silvestres/Ardilla.m4a'),
(11, 'Cacomixtle', 'Cacomixtle', 4, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Animales/Animales%20silvestres/Cacomixtle.m4a'),
(12, 'Coyote', 'Coyote', 4, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Animales/Animales%20silvestres/Coyote.m4a'),
(13, 'Mapache', 'Mapache', 4, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Animales/Animales%20silvestres/Mapache.m4a'),
(14, 'Tlacuache', 'Tlacuache', 4, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Animales/Animales%20silvestres/Tlacuache.m4a'),
(15, 'Venado', 'Venado', 4, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Animales/Animales%20silvestres/Venado.m4a'),
(16, 'Zorro', 'Zorro', 4, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Animales/Animales%20silvestres/Zorro.m4a'),

-- 📌 Aves y reptiles (Subcategoría ID 5)
(17, 'Aguila', 'Aguila', 5, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Animales/Aves%20y%20reptiles/Aguila.m4a'),
(18, 'Buho', 'Buho', 5, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Animales/Aves%20y%20reptiles/Buho.m4a'),
(19, 'Colibrí', 'Colibrí', 5, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Animales/Aves%20y%20reptiles/Colibr%C3%AD.m4a'),
(20, 'Lagartija', 'Lagartija', 5, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Animales/Aves%20y%20reptiles/Lagartija.m4a'),
(21, 'Pájaro', 'Pájaro', 5, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Animales/Aves%20y%20reptiles/P%C3%A1jaro.m4a'),
(22, 'Serpiente', 'Serpiente', 5, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Animales/Aves%20y%20reptiles/Serpiente.m4a'),
(23, 'Tortuga', 'Tortuga', 5, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Animales/Aves%20y%20reptiles/Tortuga.m4a'),

-- 📌 Colores básicos (Subcategoría ID 7)
(24, 'Amarillo', 'Amarillo', 7, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Colores/Colores%20b%C3%A1sicos/Amarillo.m4a'),
(25, 'Blanco', 'Blanco', 7, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Colores/Colores%20b%C3%A1sicos/Blanco.m4a'),
(26, 'Negro', 'Negro', 7, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Colores/Colores%20b%C3%A1sicos/Negro.m4a'),
(27, 'Rojo', 'Rojo', 7, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Colores/Colores%20b%C3%A1sicos/Rojo.m4a'),
(28, 'Verde', 'Verde', 7, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Colores/Colores%20b%C3%A1sicos/Verde.m4a'),

-- 📌 Colores secundarios (Subcategoría ID 8)
(29, 'Anaranjado', 'Anaranjado', 8, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Colores/Colores%20secundarios/Anaranjado.m4a'),
(30, 'Café', 'Café', 8, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Colores/Colores%20secundarios/Caf%C3%A9.m4a'),
(31, 'Gris', 'Gris', 8, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Colores/Colores%20secundarios/Gris.m4a'),
(32, 'Morado', 'Morado', 8, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Colores/Colores%20secundarios/Morado.m4a'),
(33, 'Rosa', 'Rosa', 8, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Colores/Colores%20secundarios/Rosa.m4a'),

-- 📌 Familia Principal (Subcategoría ID 10)
(34, 'Familia', 'Familia', 10, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Familia/Familia%20Principal/Familia.m4a'),
(35, 'Hermana', 'Hermana', 10, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Familia/Familia%20Principal/Hermana.m4a'),
(36, 'Hermano', 'Hermano', 10, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Familia/Familia%20Principal/Hermano.m4a'),
(37, 'Mamá', 'Mamá', 10, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Familia/Familia%20Principal/Mam%C3%A1.m4a'),
(38, 'Papá', 'Papá', 10, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Familia/Familia%20Principal/Pap%C3%A1.m4a'),

-- 📌 Familia extendida (Subcategoría ID 11)
(39, 'Abuela', 'Abuela', 11, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Familia/Familia%20extendida/Abuela.m4a'),
(40, 'Abuelo', 'Abuelo', 11, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Familia/Familia%20extendida/Abuelo.m4a'),
(41, 'Prima', 'Prima', 11, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Familia/Familia%20extendida/Prima.m4a'),
(42, 'Primo', 'Primo', 11, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Familia/Familia%20extendida/Primo.m4a'),
(43, 'Tía', 'Tía', 11, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Familia/Familia%20extendida/T%C3%ADa.m4a'),
(44, 'Tío (hermano de papá)', 'Tío (hermano de papá)', 11, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Familia/Familia%20extendida/T%C3%ADo%20(hermano%20de%20pap%C3%A1).m4a'),

-- 📌 Más familiares (Subcategoría ID 12)
(45, 'Cuñada', 'Cuñada', 12, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Familia/M%C3%A1s%20familiares/Cu%C3%B1ada.m4a'),
(46, 'Cuñado', 'Cuñado', 12, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Familia/M%C3%A1s%20familiares/Cu%C3%B1ado.m4a'),
(47, 'Nieta', 'Nieta', 12, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Familia/M%C3%A1s%20familiares/Nieta.m4a'),
(48, 'Nieto', 'Nieto', 12, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Familia/M%C3%A1s%20familiares/Nieto.m4a'),
(49, 'Sobrina', 'Sobrina', 12, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Familia/M%C3%A1s%20familiares/Sobrina.m4a'),
(50, 'Sobrino', 'Sobrino', 12, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Familia/M%C3%A1s%20familiares/Sobrino.m4a'),
(51, 'Suegra', 'Suegra', 12, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Familia/M%C3%A1s%20familiares/Suegra.m4a'),
(52, 'Suegro', 'Suegro', 12, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Familia/M%C3%A1s%20familiares/Suegro.m4a'),

-- 📌 Personas (Subcategoría ID 13)
(53, 'Bebé', 'Bebé', 13, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Familia/Personas/Beb%C3%A9.m4a'),
(54, 'Hombre', 'Hombre', 13, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Familia/Personas/Hombre.m4a'),
(55, 'Joven', 'Joven', 13, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Familia/Personas/Joven.m4a'),
(56, 'Mujer', 'Mujer', 13, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Familia/Personas/Mujer.m4a'),
(57, 'Niña', 'Niña', 13, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Familia/Personas/Ni%C3%B1a.m4a'),
(58, 'Niño', 'Niño', 13, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Familia/Personas/Ni%C3%B1o.m4a'),
(59, 'Señor', 'Señor', 13, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Familia/Personas/Se%C3%B1or.m4a'),
(60, 'Señora', 'Señora', 13, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Familia/Personas/Se%C3%B1ora.m4a'),
(61, 'Vieja', 'Vieja', 13, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Familia/Personas/Vieja.m4a'),
(62, 'Viejo', 'Viejo', 13, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Familia/Personas/Viejo.m4a'),

-- 📌 Conversación (Subcategoría ID 15)
(63, 'Como esta tu familia', 'Como esta tu familia', 15, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Conversaci%C3%B3n/Como%20esta%20tu%20familia.m4a'),
(64, 'Cómo estás', 'Cómo estás', 15, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Conversaci%C3%B3n/C%C3%B3mo%20est%C3%A1s.m4a'),
(65, 'Cómo te llamas', 'Cómo te llamas', 15, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Conversaci%C3%B3n/C%C3%B3mo%20te%20llamas.m4a'),
(66, 'De donde eres', 'De donde eres', 15, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Conversaci%C3%B3n/De%20donde%20eres.m4a'),
(67, 'De nada', 'De nada', 15, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Conversaci%C3%B3n/De%20nada.m4a'),
(68, 'Estoy bien', 'Estoy bien', 15, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Conversaci%C3%B3n/Estoy%20bien.m4a'),

-- 📌 Despedida (Subcategoría ID 16)
(69, 'Cuídate mucho', 'Cuídate mucho', 16, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Despedida/Cu%C3%ADdate%20mucho.m4a'),
(70, 'Que dios te bendiga', 'Que dios te bendiga', 16, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Despedida/Que%20dios%20te%20bendiga.m4a'),
(71, 'Que te vaya bien', 'Que te vaya bien', 16, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Despedida/Que%20te%20vaya%20bien.m4a'),
(72, 'Qué descanses', 'Qué descanses', 16, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Despedida/Qu%C3%A9%20descanses.m4a'),
(73, 'Qué tengas un buen día', 'Qué tengas un buen día', 16, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Despedida/Qu%C3%A9%20tengas%20un%20buen%20d%C3%ADa.m4a'),

-- 📌 Expresiones (Subcategoría ID 17)
(74, 'Cuanto cuesta', 'Cuanto cuesta', 17, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Expresiones/Cuanto%20cuesta.m4a'),
(75, 'De acuerdo', 'De acuerdo', 17, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Expresiones/De%20acuerdo.m4a'),
(76, 'Eres guapo', 'Eres guapo', 17, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Expresiones/Eres%20guapo.m4a'),
(77, 'Es difícil', 'Es difícil', 17, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Expresiones/Es%20dif%C3%ADcil.m4a'),
(78, 'Es fácil', 'Es fácil', 17, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Expresiones/Es%20f%C3%A1cil.m4a'),
(79, 'Estas bonita', 'Estas bonita', 17, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Expresiones/Estas%20bonita.m4a'),
(80, 'Guarda silencio', 'Guarda silencio', 17, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Expresiones/Guarda%20silencio.m4a'),
(81, 'Hasta luego', 'Hasta luego', 17, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Expresiones/Hasta%20luego.m4a'),
(82, 'Mi nombre es', 'Mi nombre es', 17, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Expresiones/Mi%20nombre%20es.m4a'),
(83, 'Mucho gusto', 'Mucho gusto', 17, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Expresiones/Mucho%20gusto.m4a'),
(84, 'Mucho', 'Mucho', 17, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Expresiones/Mucho.m4a'),
(85, 'Nada', 'Nada', 17, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Expresiones/Nada.m4a'),
(86, 'No me gusta', 'No me gusta', 17, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Expresiones/No%20me%20gusta.m4a'),
(87, 'No puedo', 'No puedo', 17, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Expresiones/No%20puedo.m4a'),
(88, 'No quiero', 'No quiero', 17, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Expresiones/No%20quiero.m4a'),
(89, 'No sé', 'No sé', 17, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Expresiones/No%20s%C3%A9.m4a'),
(90, 'No tengo', 'No tengo', 17, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Expresiones/No%20tengo.m4a'),
(91, 'No', 'No', 17, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Expresiones/No.m4a'),
(92, 'Poco', 'Poco', 17, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Expresiones/Poco.m4a'),
(93, 'Que necesitas', 'Que necesitas', 17, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Expresiones/Que%20necesitas.m4a'),
(94, 'Quiero comer', 'Quiero comer', 17, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Expresiones/Quiero%20comer.m4a'),
(95, 'Si me gusta', 'Si me gusta', 17, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Expresiones/Si%20me%20gusta.m4a'),
(96, 'Si puedo', 'Si puedo', 17, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Expresiones/Si%20puedo.m4a'),
(97, 'Si quiero', 'Si quiero', 17, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Expresiones/Si%20quiero.m4a'),
(98, 'Si sé', 'Si sé', 17, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Expresiones/Si%20s%C3%A9.m4a'),
(99, 'Si tengo', 'Si tengo', 17, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Expresiones/Si%20tengo.m4a'),
(100, 'Si', 'Si', 17, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Expresiones/Si.m4a'),
(101, 'Te quiero', 'Te quiero', 17, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Expresiones/Te%20quiero.m4a'),
(102, 'Tengo hambre', 'Tengo hambre', 17, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Expresiones/Tengo%20hambre.m4a'),
(103, 'Vamonos', 'Vamonos', 17, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Expresiones/Vamonos.m4a'),
(104, 'Ya llegue', 'Ya llegue', 17, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Expresiones/Ya%20llegue.m4a'),

-- 📌 Saludos (Subcategoría ID 18)
(105, 'Buenas noches', 'Buenas noches', 18, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Saludos/Buenas%20noches.m4a'),
(106, 'Buenas tardes', 'Buenas tardes', 18, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Saludos/Buenas%20tardes.m4a'),
(107, 'Buenos días', 'Buenos días', 18, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Saludos/Buenos%20d%C3%ADas.m4a'),
(108, 'Gracias', 'Gracias', 18, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Frases%20comunes/Saludos/Gracias.m4a'),
(109, 'Hola', 'Hola', 18, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Hola.m4a'),

-- 📌 Del 1-5 (Subcategoría ID 20)
(110, '1', '1', 20, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/N%C3%BAmeros/Del%201-5/1.m4a'),
(111, '2', '2', 20, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/N%C3%BAmeros/Del%201-5/2.m4a'),
(112, '3', '3', 20, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/N%C3%BAmeros/Del%201-5/3.m4a'),
(113, '4', '4', 20, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/N%C3%BAmeros/Del%201-5/4.m4a'),
(114, '5', '5', 20, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/N%C3%BAmeros/Del%201-5/5.m4a'),

-- 📌 Del 6-10 (Subcategoría ID 21)
(115, '6', '6', 21, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/N%C3%BAmeros/Del%206-10/6.m4a'),
(116, '7', '7', 21, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/N%C3%BAmeros/Del%206-10/7.m4a'),
(117, '8', '8', 21, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/N%C3%BAmeros/Del%206-10/8.m4a'),
(118, '9', '9', 21, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/N%C3%BAmeros/Del%206-10/9.m4a'),
(119, '10', '10', 21, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/N%C3%BAmeros/Del%206-10/10.m4a'),

-- 📌 Del 11-15 (Subcategoría ID 22)
(120, '11', '11', 22, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/N%C3%BAmeros/Del%2011-15/11.m4a'),
(121, '12', '12', 22, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/N%C3%BAmeros/Del%2011-15/12.m4a'),
(122, '13', '13', 22, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/N%C3%BAmeros/Del%2011-15/13.m4a'),
(123, '14', '14', 22, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/N%C3%BAmeros/Del%2011-15/14.m4a'),
(124, '15', '15', 22, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/N%C3%BAmeros/Del%2011-15/15.m4a'),

-- 📌 Del 16-20 (Subcategoría ID 23)
(125, '16', '16', 23, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/N%C3%BAmeros/Del%2016-20/16.m4a'),
(126, '17', '17', 23, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/N%C3%BAmeros/Del%2016-20/17.m4a'),
(127, '18', '18', 23, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/N%C3%BAmeros/Del%2016-20/18.m4a'),
(128, '19', '19', 23, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/N%C3%BAmeros/Del%2016-20/19.m4a'),
(129, '20', '20', 23, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/N%C3%BAmeros/Del%2016-20/20.m4a'),

-- 📌 Cocina (Subcategoría ID 25)
(130, 'Caserola', 'Caserola', 25, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Objetos/Cocina/Caserola.m4a'),
(131, 'Cuchara', 'Cuchara', 25, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Objetos/Cocina/Cuchara.m4a'),
(132, 'Estufa', 'Estufa', 25, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Objetos/Cocina/Estufa.m4a'),
(133, 'Fregadero', 'Fregadero', 25, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Objetos/Cocina/Fregadero.m4a'),
(134, 'Horno', 'Horno', 25, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Objetos/Cocina/Horno.m4a'),
(135, 'Olla', 'Olla', 25, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Objetos/Cocina/Olla.m4a'),
(136, 'Plato', 'Plato', 25, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Objetos/Cocina/Plato.m4a'),
(137, 'Taza', 'Taza', 25, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Objetos/Cocina/Taza.m4a'),
(138, 'Vaso', 'Vaso', 25, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Objetos/Cocina/Vaso.m4a'),

-- 📌 Hogar (Subcategoría ID 26)
(139, 'Baño', 'Baño', 26, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Objetos/Hogar/Ba%C3%B1o.m4a'),
(140, 'Casa', 'Casa', 26, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Objetos/Hogar/Casa.m4a'),
(141, 'Cocina', 'Cocina', 26, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Objetos/Hogar/Cocina.m4a'),
(142, 'Habitación', 'Habitación', 26, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Objetos/Hogar/Habitaci%C3%B3n.m4a'),
(143, 'Patio', 'Patio', 26, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Objetos/Hogar/Patio.m4a'),

-- 📌 Objetos de casa (Subcategoría ID 27)
(144, 'Cama', 'Cama', 27, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Objetos/Objetos%20de%20casa/Cama.m4a'),
(145, 'Mesa', 'Mesa', 27, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Objetos/Objetos%20de%20casa/Mesa.m4a'),
(146, 'Puerta', 'Puerta', 27, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Objetos/Objetos%20de%20casa/Puerta.m4a'),
(147, 'Ropero', 'Ropero', 27, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Objetos/Objetos%20de%20casa/Ropero.m4a'),
(148, 'Silla', 'Silla', 27, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Objetos/Objetos%20de%20casa/Silla.m4a'),
(149, 'Ventana', 'Ventana', 27, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Objetos/Objetos%20de%20casa/Ventana.m4a'),

-- 📌 Objetos diversos (Subcategoría ID 28)
(150, 'Almohada', 'Almohada', 28, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Objetos/Objetos%20diversos/Almohada.m4a'),
(151, 'Camiza', 'Camiza', 28, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Objetos/Objetos%20diversos/Camiza.m4a'),
(152, 'Canasta', 'Canasta', 28, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Objetos/Objetos%20diversos/Canasta.m4a'),
(153, 'Falda', 'Falda', 28, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Objetos/Objetos%20diversos/Falda.m4a'),
(154, 'Huarache', 'Huarache', 28, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Objetos/Objetos%20diversos/Huarache.m4a'),
(155, 'Manta', 'Manta', 28, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Objetos/Objetos%20diversos/Manta.m4a'),
(156, 'Pantalón', 'Pantalón', 28, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Objetos/Objetos%20diversos/Pantal%C3%B3n.m4a'),
(157, 'Sombrero', 'Sombrero', 28, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Objetos/Objetos%20diversos/Sombrero.m4a'),
(158, 'Vestido', 'Vestido', 28, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Objetos/Objetos%20diversos/Vestido.m4a'),

-- 📌 Extremidades del cuerpo (Subcategoría ID 30)
(159, 'Brazo', 'Brazo', 30, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Partes%20del%20cuerpo/Extremidades%20del%20cuerpo/Brazo.m4a'),
(160, 'Cuello', 'Cuello', 30, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Partes%20del%20cuerpo/Extremidades%20del%20cuerpo/Cuello.m4a'),
(161, 'Dedos de la mano', 'Dedos de la mano', 30, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Partes%20del%20cuerpo/Extremidades%20del%20cuerpo/Dedos%20de%20la%20mano.m4a'),
(162, 'Dedos del pie', 'Dedos del pie', 30, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Partes%20del%20cuerpo/Extremidades%20del%20cuerpo/Dedos%20del%20pie.m4a'),
(163, 'Espalda', 'Espalda', 30, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Partes%20del%20cuerpo/Extremidades%20del%20cuerpo/Espalda.m4a'),
(164, 'Hombro', 'Hombro', 30, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Partes%20del%20cuerpo/Extremidades%20del%20cuerpo/Hombro.m4a'),
(165, 'Mano', 'Mano', 30, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Partes%20del%20cuerpo/Extremidades%20del%20cuerpo/Mano.m4a'),
(166, 'Pecho', 'Pecho', 30, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Partes%20del%20cuerpo/Extremidades%20del%20cuerpo/Pecho.m4a'),
(167, 'Pie', 'Pie', 30, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Partes%20del%20cuerpo/Extremidades%20del%20cuerpo/Pie.m4a'),
(168, 'Pierna', 'Pierna', 30, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Partes%20del%20cuerpo/Extremidades%20del%20cuerpo/Pierna.m4a'),
(169, 'Rodilla', 'Rodilla', 30, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Partes%20del%20cuerpo/Extremidades%20del%20cuerpo/Rodilla.m4a'),

-- 📌 Rostro (Subcategoría ID 31)
(170, 'Boca', 'Boca', 31, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Partes%20del%20cuerpo/Rostro/Boca.m4a'),
(171, 'Cabello', 'Cabello', 31, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Partes%20del%20cuerpo/Rostro/Cabello.m4a'),
(172, 'Cabeza', 'Cabeza', 31, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Partes%20del%20cuerpo/Rostro/Cabeza.m4a'),
(173, 'Ceja', 'Ceja', 31, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Partes%20del%20cuerpo/Rostro/Ceja.m4a'),
(174, 'Dientes', 'Dientes', 31, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Partes%20del%20cuerpo/Rostro/Dientes.m4a'),
(175, 'Frente', 'Frente', 31, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Partes%20del%20cuerpo/Rostro/Frente.m4a'),
(176, 'Lengua', 'Lengua', 31, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Partes%20del%20cuerpo/Rostro/Lengua.m4a'),
(177, 'Nariz', 'Nariz', 31, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Partes%20del%20cuerpo/Rostro/Nariz.m4a'),
(178, 'Ojo', 'Ojo', 31, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Partes%20del%20cuerpo/Rostro/Ojo.m4a'),
(179, 'Oreja', 'Oreja', 31, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Partes%20del%20cuerpo/Rostro/Oreja.m4a'),

-- 📌 Emociones intensas (Subcategoría ID 33)
(180, 'Enojo', 'Enojo', 33, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Sentimientos/Emociones%20intensas/Enojo.m4a'),
(181, 'Nostalgia', 'Nostalgia', 33, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Sentimientos/Emociones%20intensas/Nostalgia.m4a'),
(182, 'Odio', 'Odio', 33, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Sentimientos/Emociones%20intensas/Odio.m4a'),
(183, 'Satisfacción', 'Satisfacción', 33, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Sentimientos/Emociones%20intensas/Satisfacci%C3%B3n.m4a'),

-- 📌 Sentimientos difíciles (Subcategoría ID 34)
(184, 'Dolor', 'Dolor', 34, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Sentimientos/Sentimientos%20dif%C3%ADciles/Dolor.m4a'),
(185, 'Miedo', 'Miedo', 34, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Sentimientos/Sentimientos%20dif%C3%ADciles/Miedo.m4a'),
(186, 'Preocupación', 'Preocupación', 34, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Sentimientos/Sentimientos%20dif%C3%ADciles/Preocupaci%C3%B3n.m4a'),
(187, 'Soledad', 'Soledad', 34, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Sentimientos/Sentimientos%20dif%C3%ADciles/Soledad.m4a'),
(188, 'Tristeza', 'Tristeza', 34, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Sentimientos/Sentimientos%20dif%C3%ADciles/Tristeza.m4a'),

-- 📌 Sentimientos positivos (Subcategoría ID 35)
(189, 'Alegría', 'Alegría', 35, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Sentimientos/Sentimientos%20positivos/Alegr%C3%ADa.m4a'),
(190, 'Amor', 'Amor', 35, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Sentimientos/Sentimientos%20positivos/Amor.m4a'),
(191, 'Calma', 'Calma', 35, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Sentimientos/Sentimientos%20positivos/Calma.m4a'),
(192, 'Felicidad', 'Felicidad', 35, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Sentimientos/Sentimientos%20positivos/Felicidad.m4a'),
(193, 'Tranquilidad', 'Tranquilidad', 35, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Sentimientos/Sentimientos%20positivos/Tranquilidad.m4a'),

-- 📌 Valores y emociones (Subcategoría ID 36)
(194, 'Cariño', 'Cariño', 36, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Sentimientos/Valores%20y%20emociones/Cari%C3%B1o.m4a'),
(195, 'Compasión', 'Compasión', 36, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Sentimientos/Valores%20y%20emociones/Compasi%C3%B3n.m4a'),
(196, 'Confianza', 'Confianza', 36, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Sentimientos/Valores%20y%20emociones/Confianza.m4a'),
(197, 'Esperanza', 'Esperanza', 36, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Sentimientos/Valores%20y%20emociones/Esperanza.m4a'),
(198, 'Gratitud', 'Gratitud', 36, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Sentimientos/Valores%20y%20emociones/Gratitud.m4a'),
(199, 'Respeto', 'Respeto', 36, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Sentimientos/Valores%20y%20emociones/Respeto.m4a'),

-- 📌 Voz lobita (Subcategoría ID 38)
(200, 'A divertirnos', 'A divertirnos', 38, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Voz%20lobita/A_divertirnos.m4a'),
(201, 'Aprendes rápidamente', 'Aprendes rápidamente', 38, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Voz%20lobita/Aprendes_rapidamente.m4a'),
(202, 'Bienvenidos Tani', 'Bienvenidos Tani', 38, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Voz%20lobita/Bienvenidos_Tani.m4a'),
(203, 'Enfoca un objeto', 'Enfoca un objeto', 38, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Voz%20lobita/Enfoca_un_objeto.m4a'),
(204, 'Escucha atentamente y repite la respuesta', 'Escucha atentamente y repite la respuesta', 38, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Voz%20lobita/Escucha_atentamente_y_repite_la_respuesta.m4a'),
(205, 'Escucha con atencion y repite conmigo', 'Escucha con atencion y repite conmigo', 38, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Voz%20lobita/Escucha_con_atencion_y_repite_conmigo.m4a'),
(206, 'Estas listo para empezar', 'Estas listo para empezar', 38, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Voz%20lobita/Estas_listo_para_empezar.m4a'),
(207, 'Estoy para ayudarte en lo que necesites', 'Estoy para ayudarte en lo que necesites', 38, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Voz%20lobita/Estoy_para_ayudarte_en_lo_que_necesites.m4a'),
(208, 'Estuviste cerca vuelve a intentarlo', 'Estuviste cerca vuelve a intentarlo', 38, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Voz%20lobita/Estuviste_cerca_vuelve_a_intentarlo.m4a'),
(209, 'Excelente comencemos', 'Excelente comencemos', 38, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Voz%20lobita/Excelente_comencemos.m4a'),
(210, 'Excelente muy bien', 'Excelente muy bien', 38, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Voz%20lobita/Excelente_muy_bien.m4a'),
(211, 'Fallar es parte del proceso', 'Fallar es parte del proceso', 38, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Voz%20lobita/Fallar_es_parte_del_proceso.m4a'),
(212, 'Felicidades completaste el repaso general', 'Felicidades completaste el repaso general', 38, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Voz%20lobita/Felicidades_completaste_el_repaso_general.m4a'),
(213, 'Final Tani', 'Final Tani', 38, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Voz%20lobita/Final_Tani.m4a'),
(214, 'Has progresado', 'Has progresado', 38, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Voz%20lobita/Has_progresado.m4a'),
(215, 'Me encanta enseñarte', 'Me encanta enseñarte', 38, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Voz%20lobita/Me_encanta_ensenarte.m4a'),
(216, 'No te preocupes inténtalo nuevamente', 'No te preocupes inténtalo nuevamente', 38, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Voz%20lobita/No_ye_preocupes_intentalo_nuevamente.m4a'),
(217, 'Que te gustaria aprender hoy', 'Que te gustaria aprender hoy', 38, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Voz%20lobita/Que_te_gustaria_aprender_hoy.m4a'),
(218, 'Racha completa', 'Racha completa', 38, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Voz%20lobita/Racha_completa.m4a'),
(219, 'Recuerda como lo aprendimos', 'Recuerda como lo aprendimos', 38, 'https://olo.tail0de9ec.ts.net/multimedia/AudiosTanextli/Tanextli/Voz%20lobita/Recuerda_como_lo_aprendimos.m4a')
ON CONFLICT (id) DO NOTHING;