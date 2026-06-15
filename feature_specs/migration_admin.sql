-- Agregar columna is_admin a la tabla users si no existe
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Query de ejemplo para convertir un usuario en superadministrador:
-- UPDATE public.users SET is_admin = TRUE WHERE email = 'tu_correo_de_admin@ejemplo.com';
