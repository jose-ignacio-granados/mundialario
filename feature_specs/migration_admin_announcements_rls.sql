-- Habilitar a los administradores a realizar operaciones en cualquier liga en la tabla league_posts
DROP POLICY IF EXISTS "Admins can insert posts in any league" ON public.league_posts;
CREATE POLICY "Admins can insert posts in any league" ON public.league_posts
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE public.users.auth_id = auth.uid()
            AND public.users.is_admin = true
        )
    );

DROP POLICY IF EXISTS "Admins can view posts in any league" ON public.league_posts;
CREATE POLICY "Admins can view posts in any league" ON public.league_posts
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE public.users.auth_id = auth.uid()
            AND public.users.is_admin = true
        )
    );

DROP POLICY IF EXISTS "Admins can delete posts in any league" ON public.league_posts;
CREATE POLICY "Admins can delete posts in any league" ON public.league_posts
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE public.users.auth_id = auth.uid()
            AND public.users.is_admin = true
        )
    );
