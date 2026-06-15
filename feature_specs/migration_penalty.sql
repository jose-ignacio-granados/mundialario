-- 1. Agregar columna penalty a la tabla predictions si no existe
ALTER TABLE public.predictions ADD COLUMN IF NOT EXISTS penalty INT DEFAULT 0;

-- 2. Modificar la función calculate_match_points para penalizar con -1 punto
-- a los usuarios que no hicieron una predicción antes de que comience el partido.
CREATE OR REPLACE FUNCTION calculate_match_points(p_match_id TEXT)
RETURNS VOID AS $$
DECLARE
    r RECORD;
    v_score_a INT;
    v_score_b INT;
    v_real_diff INT;
    v_real_result TEXT;
    v_points INT;
    v_pred_diff INT;
    v_pred_result TEXT;
BEGIN
    -- A. Leer score_a y score_b de la tabla matches
    SELECT score_a, score_b INTO v_score_a, v_score_b
    FROM matches
    WHERE id = p_match_id;

    IF v_score_a IS NULL OR v_score_b IS NULL THEN
        RAISE EXCEPTION 'Match score_a or score_b is NULL for match_id: %', p_match_id;
    END IF;

    v_real_diff := v_score_a - v_score_b;
    v_real_result := CASE 
        WHEN v_real_diff > 0 THEN 'A'
        WHEN v_real_diff < 0 THEN 'B'
        ELSE 'TIE'
    END;

    -- B. Para cada usuario que NO tenga una predicción para este partido, insertar una predicción por defecto
    -- con pred_a = -1, pred_b = -1, points = -1 y penalty = 0.
    INSERT INTO public.predictions (user_id, match_id, pred_a, pred_b, points, penalty)
    SELECT id, p_match_id, -1, -1, -1, 0
    FROM public.users u
    WHERE NOT EXISTS (
        SELECT 1 
        FROM public.predictions p 
        WHERE p.user_id = u.id AND p.match_id = p_match_id
    );

    -- C. Iterar sobre todas las predicciones reales para ese p_match_id (excluyendo las de penalización por defecto)
    FOR r IN 
        SELECT id, pred_a, pred_b 
        FROM predictions 
        WHERE match_id = p_match_id AND pred_a >= 0 AND pred_b >= 0
    LOOP
        v_points := 0;
        v_pred_diff := r.pred_a - r.pred_b;
        v_pred_result := CASE 
            WHEN v_pred_diff > 0 THEN 'A'
            WHEN v_pred_diff < 0 THEN 'B'
            ELSE 'TIE'
        END;

        -- 1. Tendencia (+2 pts)
        IF v_real_result = v_pred_result THEN
            v_points := v_points + 2;
            -- 2. Diferencia Exacta (Bonus +1 pt, solo si hay tendencia)
            IF v_real_diff = v_pred_diff THEN
                v_points := v_points + 1;
            END IF;
        END IF;

        -- 3. Goles exactos por equipo (+1 pt cada uno, independiente del resultado)
        IF r.pred_a = v_score_a THEN
            v_points := v_points + 1;
        END IF;

        IF r.pred_b = v_score_b THEN
            v_points := v_points + 1;
        END IF;

        -- Actualizar el campo points en predictions
        UPDATE predictions
        SET points = v_points
        WHERE id = r.id;
    END LOOP;

    -- D. Marcar partido como calculado
    UPDATE matches
    SET is_calculated = TRUE
    WHERE id = p_match_id;
END;
$$ LANGUAGE plpgsql;
