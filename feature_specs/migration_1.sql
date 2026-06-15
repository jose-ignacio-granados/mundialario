-- Create users table
CREATE TABLE users (
    id TEXT PRIMARY KEY, -- Format: USR-XXX
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create leagues table
CREATE TABLE leagues (
    id TEXT PRIMARY KEY, -- Format: LGA-XXX
    name TEXT NOT NULL,
    invite_code TEXT UNIQUE NOT NULL, -- 6 alphanumeric chars
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create league_members table
CREATE TABLE league_members (
    league_id TEXT REFERENCES leagues(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (league_id, user_id)
);

-- Create matches table
CREATE TABLE matches (
    id TEXT PRIMARY KEY, -- Format: MTCH-XXX
    match_date DATE NOT NULL,
    team_a TEXT NOT NULL,
    team_b TEXT NOT NULL,
    score_a INT DEFAULT NULL,
    score_b INT DEFAULT NULL,
    is_calculated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create predictions table
CREATE TABLE predictions (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    pred_a INT NOT NULL,
    pred_b INT NOT NULL,
    points INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_match UNIQUE (user_id, match_id)
);

-- Create stored procedure for calculating match points
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
    -- 1. Leer score_a y score_b de la tabla matches
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

    -- 2. Iterar sobre todas las predicciones para ese p_match_id
    FOR r IN 
        SELECT id, pred_a, pred_b 
        FROM predictions 
        WHERE match_id = p_match_id
    LOOP
        v_points := 0;
        v_pred_diff := r.pred_a - r.pred_b;
        v_pred_result := CASE 
            WHEN v_pred_diff > 0 THEN 'A'
            WHEN v_pred_diff < 0 THEN 'B'
            ELSE 'TIE'
        END;

        -- Tendencia (+2 pts)
        IF v_real_result = v_pred_result THEN
            v_points := v_points + 2;
            -- Diferencia Exacta (+1 pt)
            IF v_real_diff = v_pred_diff THEN
                v_points := v_points + 1;
            END IF;
        END IF;

        -- Goles Equipo A (+1 pt)
        IF r.pred_a = v_score_a THEN
            v_points := v_points + 1;
        END IF;

        -- Goles Equipo B (+1 pt)
        IF r.pred_b = v_score_b THEN
            v_points := v_points + 1;
        END IF;

        -- Actualizar el campo points en predictions
        UPDATE predictions
        SET points = v_points
        WHERE id = r.id;
    END LOOP;

    -- 3. Marcar partido como calculado
    UPDATE matches
    SET is_calculated = TRUE
    WHERE id = p_match_id;
END;
$$ LANGUAGE plpgsql;
