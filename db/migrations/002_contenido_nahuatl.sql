-- =========================================================================
-- 002 · Contenido: palabras en español y náhuatl
-- Generado el 2026-11-23 con scripts/generar-contenido.mjs desde contenido.json del frontend.
-- NO editar a mano: corregir contenido.json y volver a generar.
--
-- Respeta los id de init.sql: actualiza las palabras existentes, agrega las nuevas con id
-- consecutivos y NO borra palabras ni progreso. Se puede ejecutar varias veces.
-- La tabla palabras deja de guardar URL de audio (columna audio_url eliminada).
-- Respaldar antes de ejecutar.
-- =========================================================================
BEGIN;

-- 1. Columnas
ALTER TABLE categorias
    ADD COLUMN IF NOT EXISTS slug           VARCHAR(80),
    ADD COLUMN IF NOT EXISTS orden          SMALLINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS nombre_nahuatl VARCHAR(100),
    ADD COLUMN IF NOT EXISTS disponible     BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE palabras
    ADD COLUMN IF NOT EXISTS slug  VARCHAR(80),
    ADD COLUMN IF NOT EXISTS orden SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE palabras ALTER COLUMN nahuatl DROP NOT NULL;
ALTER TABLE palabras DROP COLUMN IF EXISTS audio_url;

-- 2. Categorías (mismos id; nombres y orden de contenido.json)
INSERT INTO categorias (id, nombre, categoria_padre_id, slug, orden, nombre_nahuatl, disponible) VALUES
    (9, 'Familia', NULL, 'familia', 1, NULL, true),
    (10, 'Familia principal', 9, 'familia-principal', 1, NULL, true),
    (11, 'Familia extendida', 9, 'familia-extendida', 2, NULL, true),
    (12, 'Más familiares', 9, 'mas-familiares', 3, NULL, true),
    (13, 'Personas', 9, 'personas', 4, NULL, true),
    (32, 'Sentimientos', NULL, 'sentimientos', 2, 'Neyolmatilistli', true),
    (35, 'Sentimientos positivos', 32, 'sentimientos-positivos', 1, NULL, true),
    (36, 'Valores y emociones', 32, 'valores-y-emociones', 2, NULL, true),
    (34, 'Sentimientos difíciles', 32, 'sentimientos-dificiles', 3, NULL, true),
    (33, 'Emociones intensas', 32, 'emociones-intensas', 4, NULL, true),
    (6, 'Colores', NULL, 'colores', 3, NULL, true),
    (7, 'Colores básicos', 6, 'colores-basicos', 1, NULL, true),
    (8, 'Colores secundarios', 6, 'colores-secundarios', 2, NULL, true),
    (19, 'Números', NULL, 'numeros', 4, NULL, true),
    (20, 'Del 1-5', 19, 'del-1-5', 1, NULL, true),
    (21, 'Del 6-10', 19, 'del-6-10', 2, NULL, true),
    (22, 'Del 11-15', 19, 'del-11-15', 3, NULL, true),
    (23, 'Del 16-20', 19, 'del-16-20', 4, NULL, true),
    (14, 'Frases comunes', NULL, 'frases-comunes', 5, NULL, true),
    (18, 'Saludos', 14, 'saludos', 1, NULL, true),
    (15, 'Conversación', 14, 'conversacion', 2, NULL, true),
    (17, 'Expresiones', 14, 'expresiones', 3, NULL, true),
    (16, 'Despedida', 14, 'despedida', 4, NULL, true),
    (1, 'Animales', NULL, 'animales', 6, NULL, true),
    (3, 'Animales domésticos', 1, 'animales-domesticos', 1, NULL, true),
    (2, 'Animales de granja', 1, 'animales-de-granja', 2, NULL, true),
    (4, 'Animales silvestres', 1, 'animales-silvestres', 3, NULL, true),
    (5, 'Aves y reptiles', 1, 'aves-y-reptiles', 4, NULL, true),
    (24, 'Objetos', NULL, 'objetos', 7, NULL, true),
    (26, 'Hogar', 24, 'hogar', 1, NULL, true),
    (27, 'Objetos de casa', 24, 'objetos-de-casa', 2, NULL, true),
    (28, 'Objetos diversos', 24, 'objetos-diversos', 3, NULL, true),
    (25, 'Cocina', 24, 'cocina', 4, NULL, true),
    (29, 'Partes del cuerpo', NULL, 'partes-del-cuerpo', 8, NULL, false),
    (31, 'Cabeza y rostro', 29, 'cabeza-y-rostro', 1, NULL, false),
    (30, 'Cuerpo y extremidades', 29, 'cuerpo-y-extremidades', 2, NULL, false)
ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre, categoria_padre_id = EXCLUDED.categoria_padre_id, slug = EXCLUDED.slug,
    orden = EXCLUDED.orden, nombre_nahuatl = EXCLUDED.nombre_nahuatl, disponible = EXCLUDED.disponible;
UPDATE categorias SET slug = CASE WHEN categoria_padre_id IS NULL THEN 'voz-lobita' ELSE 'frases' END, orden = 99, disponible = FALSE
WHERE id IN (37, 38);

-- 3. Palabras de contenido.json (las existentes conservan su id)
INSERT INTO palabras (id, espanol, nahuatl, categoria_id, slug, orden) VALUES
    -- Familia › Familia principal
    (34, 'Familia', 'Cenchan', 10, 'familia', 1),
    (38, 'Padre', 'Papan', 10, 'padre', 2),
    (37, 'Madre', 'Maman', 10, 'madre', 3),
    (36, 'Hermano', 'Noikniuj', 10, 'hermano', 4),
    (35, 'Hermana', 'Noikniuj', 10, 'hermana', 5),
    -- Familia › Familia extendida
    (40, 'Abuelo', 'Tatatsin', 11, 'abuelo', 1),
    (39, 'Abuela', 'Nanatsin', 11, 'abuela', 2),
    (44, 'Tío', 'Noikniuj papan', 11, 'tio', 3),
    (43, 'Tía', 'Noikniuj maman', 11, 'tia', 4),
    (42, 'Primo', 'Nomajichniuj', 11, 'primo', 5),
    -- Familia › Más familiares
    (41, 'Prima', 'Nomajichniuj', 12, 'prima', 1),
    (48, 'Nieto', 'Noixuiuj', 12, 'nieto', 2),
    (47, 'Nieta', 'Noiuiuj', 12, 'nieta', 3),
    (50, 'Sobrino', 'Nokonemaj', 12, 'sobrino', 4),
    (51, 'Suegra', 'Monnantsin', 12, 'suegra', 5),
    (52, 'Suegro', 'Motatsin', 12, 'suegro', 6),
    (45, 'Cuñada', 'Noikniuj ni cihuat', 12, 'cunada', 7),
    (46, 'Cuñado', 'Noikniuj ni tagat', 12, 'cunado', 8),
    (49, 'Sobrina', 'Nokonemaj', 12, 'sobrina', 9),
    -- Familia › Personas
    (58, 'Niño', 'Okichpil', 13, 'nino', 1),
    (57, 'Niña', 'Suapil', 13, 'nina', 2),
    (59, 'Señor', 'Tagat', 13, 'senor', 3),
    (60, 'Señora', 'Cihuatsin', 13, 'senora', 4),
    (54, 'Hombre', 'Wuehuet', 13, 'hombre', 5),
    (56, 'Mujer', 'Lamat', 13, 'mujer', 6),
    (53, 'Bebé', 'Pili', 13, 'bebe', 7),
    (62, 'Viejo', 'Vevetsin', 13, 'viejo', 8),
    (61, 'Vieja', 'Nanatsin', 13, 'vieja', 9),
    (55, 'Joven', 'Telpoch', 13, 'joven', 10),
    -- Sentimientos › Sentimientos positivos
    (190, 'Amor', 'Tlasojtlalis', 35, 'amor', 1),
    (192, 'Felicidad', 'Yolpahpaki', 35, 'felicidad', 2),
    (220, 'Bondad', 'Kualiyolotl', 35, 'bondad', 3),
    (221, 'Emocionado', 'Yolpaktok', 35, 'emocionado', 4),
    -- Sentimientos › Valores y emociones
    (195, 'Compasión', 'Taikneli', 36, 'compasion', 1),
    (199, 'Respeto', 'Mahwiztilia', 36, 'respeto', 2),
    (198, 'Gratitud', 'Tlasojkamatilis', 36, 'gratitud', 3),
    (196, 'Confianza', 'Tlaneltokayot', 36, 'confianza', 4),
    (194, 'Cariño', 'Tlazohkayot', 36, 'carino', 5),
    -- Sentimientos › Sentimientos difíciles
    (188, 'Tristeza', 'Amo yolpahpaki', 34, 'tristeza', 1),
    (184, 'Dolor', 'Kokoua', 34, 'dolor', 2),
    (185, 'Miedo', 'Mauik', 34, 'miedo', 3),
    (222, 'Inseguridad', 'Amo yolchikaualis', 34, 'inseguridad', 4),
    -- Sentimientos › Emociones intensas
    (180, 'Enojo', 'Kualantli', 33, 'enojo', 1),
    (181, 'Nostalgia', 'Elnamikisli', 33, 'nostalgia', 2),
    (182, 'Odio', 'Tlajuelitalis', 33, 'odio', 3),
    (183, 'Satisfacción', 'Yolpaki', 33, 'satisfaccion', 4),
    -- Colores › Colores básicos
    (27, 'Rojo', 'Chichiltik', 7, 'rojo', 1),
    (25, 'Blanco', 'Istak', 7, 'blanco', 2),
    (28, 'Verde', 'Xoxoktik', 7, 'verde', 3),
    (26, 'Negro', 'Tiltik', 7, 'negro', 4),
    (24, 'Amarillo', 'Kostik', 7, 'amarillo', 5),
    -- Colores › Colores secundarios
    (29, 'Naranja', 'Chilkostik', 8, 'naranja', 1),
    (32, 'Morado', 'Kaniojtik', 8, 'morado', 2),
    (33, 'Rosa', 'Xochipaltik', 8, 'rosa', 3),
    (31, 'Gris', 'Tenextik', 8, 'gris', 4),
    (30, 'Café', 'Tilkostik', 8, 'cafe', 5),
    -- Números › Del 1-5
    (110, '1', 'Se', 20, '1', 1),
    (111, '2', 'Ome', 20, '2', 2),
    (112, '3', 'Eyi', 20, '3', 3),
    (113, '4', 'Nahui', 20, '4', 4),
    (114, '5', 'Makuil', 20, '5', 5),
    -- Números › Del 6-10
    (115, '6', 'Chikuase', 21, '6', 1),
    (116, '7', 'Chikame', 21, '7', 2),
    (117, '8', 'Chikeyi', 21, '8', 3),
    (118, '9', 'Chiknahui', 21, '9', 4),
    (119, '10', 'Mahtlaktli', 21, '10', 5),
    -- Números › Del 11-15
    (120, '11', 'Mahtlaktli ihwan se', 22, '11', 1),
    (121, '12', 'Mahtlaktli ihwan ome', 22, '12', 2),
    (122, '13', 'Mahtlaktli ihwan eyi', 22, '13', 3),
    (123, '14', 'Mahtlaktli ihwan nahui', 22, '14', 4),
    (124, '15', 'Kaxtolli', 22, '15', 5),
    -- Números › Del 16-20
    (125, '16', 'Kaxtolli ihwan se', 23, '16', 1),
    (126, '17', 'Kaxtolli ihwan ome', 23, '17', 2),
    (127, '18', 'Kaxtolli ihwan eyi', 23, '18', 3),
    (128, '19', 'Kaxtolli ihwan nahui', 23, '19', 4),
    (129, '20', 'Sempowalli', 23, '20', 5),
    -- Frases comunes › Saludos
    (109, 'Hola', 'Piali', 18, 'hola', 1),
    (107, 'Buenos días', 'Kwali Tanecik', 18, 'buenos-dias', 2),
    (106, 'Buenas tardes', 'Kwali Tiotaki', 18, 'buenas-tardes', 3),
    (105, 'Buenas noches', 'Kwali Tapoyaui', 18, 'buenas-noches', 4),
    (108, 'Gracias', 'Tlasohkamatik', 18, 'gracias', 5),
    -- Frases comunes › Conversación
    (63, '¿Cómo está tu familia?', '¿Keni yetokemo chinikniuan?', 15, 'como-esta-tu-familia', 1),
    (65, '¿Cómo te llamas?', '¿Keni motokay?', 15, 'como-te-llamas', 2),
    (64, '¿Cómo estás?', '¿Keni tietok?', 15, 'como-estas', 3),
    (66, '¿De dónde eres?', '¿Kani tiwala?', 15, 'de-donde-eres', 4),
    (67, 'De nada', 'Amo tlen', 15, 'de-nada', 5),
    (68, 'Estoy bien', 'Kwali nica nietok', 15, 'estoy-bien', 6),
    (93, 'Qué necesitas', '¿Toni tikneki?', 15, 'que-necesitas', 7),
    -- Frases comunes › Expresiones
    (82, 'Mi nombre es', 'Notokay', 17, 'mi-nombre-es', 1),
    (101, 'Te quiero', 'Nimitztlazohtla', 17, 'te-quiero', 2),
    (81, 'Hasta luego', 'Ma tiakan', 17, 'hasta-luego', 3),
    (75, 'De acuerdo', 'Kuali', 17, 'de-acuerdo', 4),
    (79, 'Estás bonita', 'Ti kuacualtsin', 17, 'estas-bonita', 5),
    (76, 'Eres guapo', 'Ti okichpil kuacualtsin', 17, 'eres-guapo', 6),
    (223, 'Eres Feo/a', 'amo', 17, 'eres-feo-a', 7),
    (100, 'Sí', 'Kema', 17, 'si', 8),
    (91, 'No', 'Amo', 17, 'no', 9),
    (84, 'Mucho', 'Miak', 17, 'mucho', 10),
    (92, 'Poco', 'Litsin', 17, 'poco', 11),
    (85, 'Nada', 'Amo teyi', 17, 'nada', 12),
    (83, 'Mucho gusto', 'Packi noyolo', 17, 'mucho-gusto', 13),
    (102, 'Tengo hambre', 'Nimayana', 17, 'tengo-hambre', 14),
    (94, 'Quiero comer', 'Nitakauas neki', 17, 'quiero-comer', 15),
    (74, '¿Cuánto cuesta?', 'Kanachi', 17, 'cuanto-cuesta', 16),
    (80, 'Guarda silencio', 'Ximotencaua', 17, 'guarda-silencio', 17),
    (90, 'No tengo', 'Amo nikpia', 17, 'no-tengo', 18),
    (88, 'No quiero', 'Amo nikneki', 17, 'no-quiero', 19),
    (87, 'No puedo', 'Amo ni wueli', 17, 'no-puedo', 20),
    (86, 'No me gusta', 'Amo ni kuelita', 17, 'no-me-gusta', 21),
    (77, 'Es difícil', 'Owhui', 17, 'es-dificil', 22),
    (89, 'No sé', 'Amo nikmati', 17, 'no-se', 23),
    (104, 'Ya llegue', 'Niejokia', 17, 'ya-llegue', 24),
    (99, 'Sí tengo', 'Kema nik pia', 17, 'si-tengo', 25),
    (97, 'Sí quiero', 'Kema nik neki', 17, 'si-quiero', 26),
    (96, 'Sí puedo', 'Kema nik wueli', 17, 'si-puedo', 27),
    (95, 'Sí me gusta', 'Kema nik kuelita', 17, 'si-me-gusta', 28),
    (78, 'Es fácil', 'Amo owhuiyo', 17, 'es-facil', 29),
    (98, 'Sí sé', 'Kema nik mati', 17, 'si-se', 30),
    -- Frases comunes › Despedida
    (73, 'Que tengas un buen día', 'Ma kwali tonal tikpia', 16, 'que-tengas-un-buen-dia', 1),
    (71, 'Que te vaya bien', 'Ma kwali tioj', 16, 'que-te-vaya-bien', 2),
    (69, 'Cuídate mucho', 'Ixmopiali miak', 16, 'cuidate-mucho', 3),
    (72, 'Que descanses', 'Ma tiyo Isewi', 16, 'que-descanses', 4),
    (70, 'Que Dios te bendiga', 'Ma Toteotsin mitz piali', 16, 'que-dios-te-bendiga', 5),
    -- Animales › Animales domésticos
    (9, 'Perro', 'Itzcuintli', 3, 'perro', 1),
    (8, 'Gato', 'Mixton', 3, 'gato', 2),
    (7, 'Conejo', 'Tochtli', 3, 'conejo', 3),
    -- Animales › Animales de granja
    (2, 'Gallina', 'Piolamat', 2, 'gallina', 1),
    (3, 'Gallo', 'Kashtil', 2, 'gallo', 2),
    (4, 'Pavo', 'Wewejcho', 2, 'pavo', 3),
    (1, 'Cerdo', 'Pitsot', 2, 'cerdo', 4),
    (5, 'Oveja', 'Ichkal', 2, 'oveja', 5),
    (6, 'Pato', 'Apiok', 2, 'pato', 6),
    -- Animales › Animales silvestres
    (15, 'Venado', 'Masat', 4, 'venado', 1),
    (12, 'Coyote', 'Coyotl', 4, 'coyote', 2),
    (16, 'Zorro', 'Kuekti', 4, 'zorro', 3),
    (10, 'Ardilla', 'Chechelot', 4, 'ardilla', 4),
    (13, 'Mapache', 'Mapach', 4, 'mapache', 5),
    (11, 'Cacomixtle', 'Tlacomiztli', 4, 'cacomixtle', 6),
    (14, 'Tlacuache', 'Tlacuatsin', 4, 'tlacuache', 7),
    -- Animales › Aves y reptiles
    (17, 'Águila', 'Tzopilot', 5, 'aguila', 1),
    (19, 'Colibrí', 'Witsikitzin', 5, 'colibri', 2),
    (18, 'Búho', 'Tekolot', 5, 'buho', 3),
    (22, 'Serpiente', 'Kowat', 5, 'serpiente', 4),
    (23, 'Tortuga', 'Ayotl', 5, 'tortuga', 5),
    (21, 'Pájaro', 'Tototl', 5, 'pajaro', 6),
    (20, 'Lagartija', 'Pehpetz', 5, 'lagartija', 7),
    -- Objetos › Hogar
    (140, 'Casa', 'Kalit', 26, 'casa', 1),
    (143, 'Patio', 'Kalixpan', 26, 'patio', 2),
    (141, 'Cocina', 'Tlacualchihualoyan', 26, 'cocina', 3),
    (139, 'Baño', 'Axixkalli', 26, 'bano', 4),
    (142, 'Cuarto/habitación', 'Kalkochi', 26, 'cuarto-habitacion', 5),
    -- Objetos › Objetos de casa
    (145, 'Mesa', 'Tlaixpan', 27, 'mesa', 1),
    (148, 'Silla', 'Tokotzoualis', 27, 'silla', 2),
    (144, 'Cama', 'Tlapechtli', 27, 'cama', 3),
    (146, 'Puerta', 'Tlatsakua kalit', 27, 'puerta', 4),
    (149, 'Ventana', 'Tlachialoyan', 27, 'ventana', 5),
    (147, 'Ropero', 'Pia tasal', 27, 'ropero', 6),
    -- Objetos › Objetos diversos
    (152, 'Canasta/Bolsa', 'Chikiwitl', 28, 'canasta-bolsa', 1),
    (154, 'Huarache', 'Wuarachi', 28, 'huarache', 2),
    (158, 'Vestido', 'Kwewitl', 28, 'vestido', 3),
    (150, 'Almohada', 'Tzonpechtli', 28, 'almohada', 4),
    (155, 'Manta/Cobija', 'Ayat', 28, 'manta-cobija', 5),
    (156, 'Pantalón', 'Kaltzon', 28, 'pantalon', 6),
    (151, 'Camisa', 'Koton', 28, 'camisa', 7),
    (153, 'Falda', 'Kueitl', 28, 'falda', 8),
    (157, 'Sombrero', 'Ekawilotl', 28, 'sombrero', 9),
    -- Objetos › Cocina
    (136, 'Plato', 'Caxitl', 25, 'plato', 1),
    (138, 'Vaso', 'Acaxit', 25, 'vaso', 2),
    (130, 'Caserola', 'Caxilt', 25, 'caserola', 3),
    (135, 'Olla', 'Komitl', 25, 'olla', 4),
    (131, 'Cuchara', 'Tlamawiloni', 25, 'cuchara', 5),
    (132, 'Estufa', 'Tekol tepoz', 25, 'estufa', 6),
    (133, 'Fregadero', 'Pahpacho caxitl', 25, 'fregadero', 7),
    (134, 'Horno', 'Tlekalli', 25, 'horno', 8),
    (137, 'Taza', 'Akomit', 25, 'taza', 9),
    -- Partes del cuerpo › Cabeza y rostro
    (170, 'Boca', NULL, 31, 'boca', 1),
    (171, 'Cabello', NULL, 31, 'cabello', 2),
    (172, 'Cabeza', NULL, 31, 'cabeza', 3),
    (173, 'Ceja', NULL, 31, 'ceja', 4),
    (174, 'Dientes', NULL, 31, 'dientes', 5),
    (175, 'Frente', NULL, 31, 'frente', 6),
    (176, 'Lengua', NULL, 31, 'lengua', 7),
    (177, 'Nariz', NULL, 31, 'nariz', 8),
    (178, 'Ojo', NULL, 31, 'ojo', 9),
    (179, 'Oreja', NULL, 31, 'oreja', 10),
    -- Partes del cuerpo › Cuerpo y extremidades
    (159, 'Brazo', NULL, 30, 'brazo', 1),
    (160, 'Cuello', NULL, 30, 'cuello', 2),
    (161, 'Dedos de la mano', NULL, 30, 'dedos-de-la-mano', 3),
    (162, 'Dedos del pie', NULL, 30, 'dedos-del-pie', 4),
    (163, 'Espalda', NULL, 30, 'espalda', 5),
    (164, 'Hombro', NULL, 30, 'hombro', 6),
    (165, 'Mano', NULL, 30, 'mano', 7),
    (166, 'Pecho', NULL, 30, 'pecho', 8),
    (167, 'Pie', NULL, 30, 'pie', 9),
    (168, 'Pierna', NULL, 30, 'pierna', 10),
    (169, 'Rodilla', NULL, 30, 'rodilla', 11)
ON CONFLICT (id) DO UPDATE SET
    espanol = EXCLUDED.espanol, nahuatl = EXCLUDED.nahuatl, categoria_id = EXCLUDED.categoria_id,
    slug = EXCLUDED.slug, orden = EXCLUDED.orden;

-- 4. Palabras de init.sql que no están en contenido.json: se conservan con su id y progreso,
--    pero sin náhuatl (en init.sql traían el español repetido), así la API no las muestra.
--    Lista en db/revision/palabras-sin-contenido.csv
UPDATE palabras SET nahuatl = NULL, slug = 'vamonos', orden = 100 WHERE id = 103; -- Vamonos
UPDATE palabras SET nahuatl = NULL, slug = 'preocupacion', orden = 101 WHERE id = 186; -- Preocupación
UPDATE palabras SET nahuatl = NULL, slug = 'soledad', orden = 102 WHERE id = 187; -- Soledad
UPDATE palabras SET nahuatl = NULL, slug = 'alegria', orden = 103 WHERE id = 189; -- Alegría
UPDATE palabras SET nahuatl = NULL, slug = 'calma', orden = 104 WHERE id = 191; -- Calma
UPDATE palabras SET nahuatl = NULL, slug = 'tranquilidad', orden = 105 WHERE id = 193; -- Tranquilidad
UPDATE palabras SET nahuatl = NULL, slug = 'esperanza', orden = 106 WHERE id = 197; -- Esperanza
UPDATE palabras SET nahuatl = NULL, slug = 'a-divertirnos', orden = 107 WHERE id = 200; -- A divertirnos
UPDATE palabras SET nahuatl = NULL, slug = 'aprendes-rapidamente', orden = 108 WHERE id = 201; -- Aprendes rápidamente
UPDATE palabras SET nahuatl = NULL, slug = 'bienvenidos-tani', orden = 109 WHERE id = 202; -- Bienvenidos Tani
UPDATE palabras SET nahuatl = NULL, slug = 'enfoca-un-objeto', orden = 110 WHERE id = 203; -- Enfoca un objeto
UPDATE palabras SET nahuatl = NULL, slug = 'escucha-atentamente-y-repite-la-respuesta', orden = 111 WHERE id = 204; -- Escucha atentamente y repite la respuesta
UPDATE palabras SET nahuatl = NULL, slug = 'escucha-con-atencion-y-repite-conmigo', orden = 112 WHERE id = 205; -- Escucha con atencion y repite conmigo
UPDATE palabras SET nahuatl = NULL, slug = 'estas-listo-para-empezar', orden = 113 WHERE id = 206; -- Estas listo para empezar
UPDATE palabras SET nahuatl = NULL, slug = 'estoy-para-ayudarte-en-lo-que-necesites', orden = 114 WHERE id = 207; -- Estoy para ayudarte en lo que necesites
UPDATE palabras SET nahuatl = NULL, slug = 'estuviste-cerca-vuelve-a-intentarlo', orden = 115 WHERE id = 208; -- Estuviste cerca vuelve a intentarlo
UPDATE palabras SET nahuatl = NULL, slug = 'excelente-comencemos', orden = 116 WHERE id = 209; -- Excelente comencemos
UPDATE palabras SET nahuatl = NULL, slug = 'excelente-muy-bien', orden = 117 WHERE id = 210; -- Excelente muy bien
UPDATE palabras SET nahuatl = NULL, slug = 'fallar-es-parte-del-proceso', orden = 118 WHERE id = 211; -- Fallar es parte del proceso
UPDATE palabras SET nahuatl = NULL, slug = 'felicidades-completaste-el-repaso-general', orden = 119 WHERE id = 212; -- Felicidades completaste el repaso general
UPDATE palabras SET nahuatl = NULL, slug = 'final-tani', orden = 120 WHERE id = 213; -- Final Tani
UPDATE palabras SET nahuatl = NULL, slug = 'has-progresado', orden = 121 WHERE id = 214; -- Has progresado
UPDATE palabras SET nahuatl = NULL, slug = 'me-encanta-ensenarte', orden = 122 WHERE id = 215; -- Me encanta enseñarte
UPDATE palabras SET nahuatl = NULL, slug = 'no-te-preocupes-intentalo-nuevamente', orden = 123 WHERE id = 216; -- No te preocupes inténtalo nuevamente
UPDATE palabras SET nahuatl = NULL, slug = 'que-te-gustaria-aprender-hoy', orden = 124 WHERE id = 217; -- Que te gustaria aprender hoy
UPDATE palabras SET nahuatl = NULL, slug = 'racha-completa', orden = 125 WHERE id = 218; -- Racha completa
UPDATE palabras SET nahuatl = NULL, slug = 'recuerda-como-lo-aprendimos', orden = 126 WHERE id = 219; -- Recuerda como lo aprendimos

-- 5. Índices
CREATE UNIQUE INDEX IF NOT EXISTS uq_categorias_slug ON categorias (categoria_padre_id, slug);
CREATE UNIQUE INDEX IF NOT EXISTS uq_palabras_slug   ON palabras (categoria_id, slug);
CREATE INDEX        IF NOT EXISTS idx_palabras_cat   ON palabras (categoria_id, orden);

-- 6. Las inserciones con id explícito no avanzan las secuencias SERIAL
SELECT setval(pg_get_serial_sequence('categorias', 'id'), (SELECT MAX(id) FROM categorias));
SELECT setval(pg_get_serial_sequence('palabras', 'id'), (SELECT MAX(id) FROM palabras));

-- 7. Permisos del usuario de la aplicación (si ya existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tanextli_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO tanextli_app;
        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO tanextli_app;
    END IF;
END $$;

COMMIT;
