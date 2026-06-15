-- 1. Add auth_id (UUID) to users table to link auth.users.id with custom USR-XXX profile
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE;

-- 2. Add kickoff_time column to matches table to validate predictions properly
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS kickoff_time TIMESTAMPTZ;

-- 3. Create a function to generate a random custom user ID (Format: USR-XXXXXX)
CREATE OR REPLACE FUNCTION public.generate_custom_user_id()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := 'USR-';
  i INT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    result := 'USR-';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    -- Check if it already exists to guarantee uniqueness
    SELECT EXISTS(SELECT 1 FROM public.users WHERE id = result) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create a function to handle new auth users and sync them to public.users (saving auth_id)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_id TEXT;
    v_name TEXT;
BEGIN
    -- Generar ID personalizado
    v_id := public.generate_custom_user_id();

    -- Obtener nombre del usuario (metadata de Supabase Auth o fallback al email)
    v_name := COALESCE(
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'name',
        split_part(new.email, '@', 1)
    );

    -- Insertar en public.users vinculando el new.id en auth_id
    INSERT INTO public.users (id, name, email, auth_id, created_at)
    VALUES (v_id, v_name, new.email, new.id, COALESCE(new.created_at, NOW()))
    ON CONFLICT (email) DO UPDATE 
    SET auth_id = EXCLUDED.auth_id; -- Actualizar auth_id en caso de pre-existencia

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create trigger to automatically call handle_new_user when an auth user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Create function to validate predictions kickoff time
CREATE OR REPLACE FUNCTION public.validate_prediction_time()
RETURNS TRIGGER AS $$
DECLARE
    v_kickoff TIMESTAMPTZ;
BEGIN
    -- Obtener el kickoff_time del partido
    SELECT kickoff_time INTO v_kickoff
    FROM public.matches
    WHERE id = NEW.match_id;

    IF v_kickoff IS NOT NULL AND NOW() > v_kickoff THEN
        RAISE EXCEPTION 'No se pueden guardar o modificar predicciones una vez que el partido ha comenzado (kickoff: %)', v_kickoff;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Trigger on predictions table to restrict inserts/updates
DROP TRIGGER IF EXISTS on_prediction_insert_update ON public.predictions;
CREATE TRIGGER on_prediction_insert_update
    BEFORE INSERT OR UPDATE ON public.predictions
    FOR EACH ROW EXECUTE FUNCTION public.validate_prediction_time();
