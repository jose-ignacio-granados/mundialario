-- 1. Add announcement columns to league_posts table
ALTER TABLE public.league_posts ADD COLUMN IF NOT EXISTS is_announcement BOOLEAN DEFAULT FALSE;
ALTER TABLE public.league_posts ADD COLUMN IF NOT EXISTS announcement_type TEXT CONSTRAINT check_announcement_type CHECK (announcement_type IN ('match_result', 'matchday_result'));

-- 2. Create post_reactions table for emoji reactions
CREATE TABLE IF NOT EXISTS public.post_reactions (
    post_id TEXT REFERENCES public.league_posts(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id, emoji)
);

-- Enable RLS (Row Level Security) on post_reactions
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

-- Create policies for post_reactions
-- 1. Anyone can view reactions
CREATE POLICY "Anyone can view reactions" ON public.post_reactions
    FOR SELECT USING (true);

-- 2. Authenticated users can insert/delete their own reactions
CREATE POLICY "Users can manage their own reactions" ON public.post_reactions
    FOR ALL USING (
        auth.uid() IN (
            SELECT auth_id FROM public.users WHERE id = user_id
        )
    );
