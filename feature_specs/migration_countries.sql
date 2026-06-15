-- 1. Crear función para generar IDs personalizados de país (Format: CTR-XXXXXX)
CREATE OR REPLACE FUNCTION public.generate_custom_country_id()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := 'CTR-';
  i INT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    result := 'CTR-';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    -- Verificar unicidad
    SELECT EXISTS(SELECT 1 FROM public.countries WHERE id = result) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Crear tabla de países
CREATE TABLE IF NOT EXISTS public.countries (
    id TEXT PRIMARY KEY DEFAULT public.generate_custom_country_id(),
    name TEXT UNIQUE NOT NULL,
    flag_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Insertar algunos países por defecto con banderas representativas si deseas inicializar datos
-- (Se pueden crear dinámicamente desde el panel del superadmin)




INSERT INTO public.countries (name, flag_url) 
VALUES 
  ('Alemania', 'https://flagcdn.com/w160/de.png'),
  ('Argelia', 'https://flagcdn.com/w160/dz.png'),
  ('Argentina', 'https://flagcdn.com/w160/ar.png'),
  ('Australia', 'https://flagcdn.com/w160/au.png'),
  ('Austria', 'https://flagcdn.com/w160/at.png'),
  ('Bélgica', 'https://flagcdn.com/w160/be.png'),
  ('Bosnia y Herzegovina', 'https://flagcdn.com/w160/ba.png'),
  ('Brasil', 'https://flagcdn.com/w160/br.png'),
  ('Cabo Verde', 'https://flagcdn.com/w160/cv.png'),
  ('Canadá', 'https://flagcdn.com/w160/ca.png'),
  ('Colombia', 'https://flagcdn.com/w160/co.png'),
  ('Corea del Sur', 'https://flagcdn.com/w160/kr.png'),
  ('Costa de Marfil', 'https://flagcdn.com/w160/ci.png'),
  ('Croacia', 'https://flagcdn.com/w160/hr.png'),
  ('Curaçao', 'https://flagcdn.com/w160/cw.png'),
  ('Chequia', 'https://flagcdn.com/w160/cz.png'),
  ('Ecuador', 'https://flagcdn.com/w160/ec.png'),
  ('Egipto', 'https://flagcdn.com/w160/eg.png'),
  ('Escocia', 'https://flagcdn.com/w160/gb-sct.png'),
  ('España', 'https://flagcdn.com/w160/es.png'),
  ('Estados Unidos', 'https://flagcdn.com/w160/us.png'),
  ('Francia', 'https://flagcdn.com/w160/fr.png'),
  ('Ghana', 'https://flagcdn.com/w160/gh.png'),
  ('Haití', 'https://flagcdn.com/w160/ht.png'),
  ('Inglaterra', 'https://flagcdn.com/w160/gb-eng.png'),
  ('Irán', 'https://flagcdn.com/w160/ir.png'),
  ('Irak', 'https://flagcdn.com/w160/iq.png'),
  ('Japón', 'https://flagcdn.com/w160/jp.png'),
  ('Jordania', 'https://flagcdn.com/w160/jo.png'),
  ('Marruecos', 'https://flagcdn.com/w160/ma.png'),
  ('México', 'https://flagcdn.com/w160/mx.png'),
  ('Noruega', 'https://flagcdn.com/w160/no.png'),
  ('Nueva Zelanda', 'https://flagcdn.com/w160/nz.png'),
  ('Países Bajos', 'https://flagcdn.com/w160/nl.png'),
  ('Paraguay', 'https://flagcdn.com/w160/py.png'),
  ('Portugal', 'https://flagcdn.com/w160/pt.png'),
  ('Catar', 'https://flagcdn.com/w160/qa.png'),
  ('República Democrática del Congo', 'https://flagcdn.com/w160/cd.png'),
  ('Arabia Saudita', 'https://flagcdn.com/w160/sa.png'),
  ('Senegal', 'https://flagcdn.com/w160/sn.png'),
  ('Sudáfrica', 'https://flagcdn.com/w160/za.png'),
  ('Suecia', 'https://flagcdn.com/w160/se.png'),
  ('Suiza', 'https://flagcdn.com/w160/ch.png'),
  ('Túnez', 'https://flagcdn.com/w160/tn.png'),
  ('Turquía', 'https://flagcdn.com/w160/tr.png'),
  ('Uzbekistán', 'https://flagcdn.com/w160/uz.png'),
  ('Uruguay', 'https://flagcdn.com/w160/uy.png'),
  ('Yemen', 'https://flagcdn.com/w160/ye.png')
ON CONFLICT (name) DO NOTHING;
