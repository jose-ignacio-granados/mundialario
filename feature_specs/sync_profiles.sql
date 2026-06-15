-- 1. Sincronizar todos los usuarios existentes en auth.users que no tengan un perfil en public.users
INSERT INTO public.users (id, name, email, auth_id, created_at)
SELECT 
    public.generate_custom_user_id(),
    COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
    u.email,
    u.id,
    u.created_at
FROM auth.users u
LEFT JOIN public.users p ON p.auth_id = u.id
WHERE p.auth_id IS NULL 
ON CONFLICT (email) DO NOTHING;

-- 2. Asegurarse de que el usuario administrador tenga is_admin = TRUE
-- Reemplaza 'tu_correo_de_admin@ejemplo.com' por tu email de inicio de sesión real
UPDATE public.users 
SET is_admin = TRUE 
WHERE email = 'tu_correo_de_admin@ejemplo.com';
