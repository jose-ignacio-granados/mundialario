MUNDIALARIO: FEATURE SPECIFICATION CANVAS (MVP)
1. Concepto Central y Flujo de Usuario
Mundialario es una plataforma de predicciones deportivas enfocada en la simplicidad y la competencia entre amigos mediante Ligas. No hay dependencias de terceros; la administración es manual para garantizar el lanzamiento rápido del MVP.

El Usuario: Entra, se une a una liga con un código, ve los juegos del día y envía sus predicciones de goles antes del corte.

El Admin (Sistema): Ingresa los partidos del día en la BD. Al final de la jornada, ingresa los resultados reales y dispara el cálculo de puntos masivo.

El Corte Diario (Deadline): A las 12:00 PM (Hora Venezuela / UTC-4) se bloquea la posibilidad de ingresar o modificar predicciones para TODOS los partidos de ese día (match_date).

2. Algoritmo de Puntuación Sumativa
Sistema diseñado para premiar el "Pleno", pero dando recompensas parciales por lecturas correctas del partido. Máximo 5 puntos por juego.

+2 Pts (Tendencia): Acertar el ganador o si es empate.

+1 Pt (Diferencia Exacta): Acertar la diferencia de goles. Regla de dependencia: Solo se otorga si se acertó la Tendencia previamente.

+1 Pt (Goles Local): Acertar los goles exactos del Equipo A (Independiente del resultado final).

+1 Pt (Goles Visita): Acertar los goles exactos del Equipo B (Independiente del resultado final).

Ejemplo de cálculo: Usuario predice 2-0. Partido queda 3-1. Gana Tendencia (+2) + Diferencia (+1) = 3 Puntos.

3. Entidades de Datos Principales
Estructura relacional optimizada para Supabase (PostgreSQL).

Users: id (formato: USR-XXX), nombre, email.

Leagues: id (formato: LGA-XXX), nombre, código de invitación (6 caracteres alfanuméricos).

League_Members: Tabla pivote usuario-liga (PK compuesta).

Matches: id (formato: MTCH-XXX), match_date (tipo DATE), nombre equipo_a, nombre equipo_b, resultados reales (score_a, score_b), flag is_calculated (BOOLEAN).

Predictions: id (serial), referencia a usuario y partido, pronóstico (pred_a, pred_b), points obtenidos (INT). Constraint UNIQUE para usuario+partido.

4. Funcionalidades del MVP (Scope)
Autenticación: Registro/Login simple (Magic Link o Google via Supabase).

Gestión de Ligas: Crear liga nueva y Unirse a liga existente mediante input de código corto.

Dashboard de Predicciones:

Visualización de partidos filtrados por el día actual (match_date == HOY).

Inputs numéricos para pred_a y pred_b.

Bloqueo condicional estricto: Si la hora actual del servidor es > 12:00 PM (UTC-4), los inputs se deshabilitan.

Tabla de Posiciones (Ranking): Vista por liga ordenando a los usuarios según la suma de la columna points de sus predicciones finalizadas.

5. Restricciones Técnicas y UI
Frontend: Next.js (App Router), React, Tailwind CSS.

Seguridad (Server Actions): La mutación de "guardar predicción" DEBE validar en el servidor que la hora actual sea anterior a las 12:00 PM (UTC-4) de la fecha del partido. Nunca confiar en el bloqueo del frontend.

Cálculo Automático: Implementación de un Stored Procedure (Función RPC) en Supabase que, al recibir un match_id, ejecute la matemática de puntos sobre todas las predicciones asociadas y actualice la columna points en bloque.

Tema Visual: Light Mode estricto. Fondos claros, estética limpia, utilizando los colores vibrantes del Mundial 2026 (Rojo, Verde Lima, Morado, Naranja) para botones, bordes de tarjetas y estados de validación.