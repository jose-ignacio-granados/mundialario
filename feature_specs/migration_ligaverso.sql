-- 1. Agregar columna is_public a la tabla leagues para soportar LigaVerso
ALTER TABLE public.leagues ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;
