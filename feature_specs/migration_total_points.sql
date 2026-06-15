-- 0. Agregar columna penalty a la tabla predictions si no existe
ALTER TABLE public.predictions ADD COLUMN IF NOT EXISTS penalty INT DEFAULT 0;

-- 1. Agregar columna total_points a la tabla users si no existe
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_points INT DEFAULT 0;


-- 2. Crear función para mantener actualizado total_points en users
CREATE OR REPLACE FUNCTION public.update_user_total_points()
RETURNS TRIGGER AS $$
DECLARE
    v_diff INT := 0;
    v_user_id TEXT;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        v_diff := COALESCE(NEW.points, 0) - COALESCE(NEW.penalty, 0);
        v_user_id := NEW.user_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        v_diff := (COALESCE(NEW.points, 0) - COALESCE(NEW.penalty, 0)) - (COALESCE(OLD.points, 0) - COALESCE(OLD.penalty, 0));
        v_user_id := NEW.user_id;
    ELSIF (TG_OP = 'DELETE') THEN
        v_diff := -(COALESCE(OLD.points, 0) - COALESCE(OLD.penalty, 0));
        v_user_id := OLD.user_id;
    END IF;

    -- Actualizar total_points en la tabla users
    UPDATE public.users
    SET total_points = COALESCE(total_points, 0) + v_diff
    WHERE id = v_user_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Crear el trigger en la tabla predictions
DROP TRIGGER IF EXISTS trg_update_user_total_points ON public.predictions;
CREATE TRIGGER trg_update_user_total_points
    AFTER INSERT OR UPDATE OR DELETE ON public.predictions
    FOR EACH ROW EXECUTE FUNCTION public.update_user_total_points();

-- 4. Inicializar los valores actuales de total_points en la tabla users en base a los datos existentes
UPDATE public.users u
SET total_points = COALESCE((
    SELECT SUM(points - penalty)
    FROM public.predictions p
    WHERE p.user_id = u.id
), 0);
