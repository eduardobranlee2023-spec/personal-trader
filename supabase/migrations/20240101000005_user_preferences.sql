-- ==============================================================================
-- USER PREFERENCES — tema visual personalizable (Design Lab)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  accent_color TEXT NOT NULL DEFAULT '#00e08a',
  bg_color TEXT NOT NULL DEFAULT '#05080c',
  panel_color TEXT NOT NULL DEFAULT '#0a0f16',
  card_color TEXT NOT NULL DEFAULT '#0c1219',
  radius INTEGER NOT NULL DEFAULT 12,
  card_padding INTEGER NOT NULL DEFAULT 20,
  glow_intensity INTEGER NOT NULL DEFAULT 35,
  show_grid BOOLEAN NOT NULL DEFAULT true,
  show_noise BOOLEAN NOT NULL DEFAULT true,
  font_family TEXT NOT NULL DEFAULT 'Space Grotesk',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_preferences_glow_range CHECK (glow_intensity >= 0 AND glow_intensity <= 70)
);

-- Columnas aditivas si la tabla existía de una versión anterior
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS accent_color TEXT NOT NULL DEFAULT '#00e08a';
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS bg_color TEXT NOT NULL DEFAULT '#05080c';
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS panel_color TEXT NOT NULL DEFAULT '#0a0f16';
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS card_color TEXT NOT NULL DEFAULT '#0c1219';
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS radius INTEGER NOT NULL DEFAULT 12;
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS card_padding INTEGER NOT NULL DEFAULT 20;
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS glow_intensity INTEGER NOT NULL DEFAULT 35;
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS show_grid BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS show_noise BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS font_family TEXT NOT NULL DEFAULT 'Space Grotesk';

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;

CREATE POLICY "Users can view own preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id AND public.has_active_access(auth.uid()));

CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.has_active_access(auth.uid()));

CREATE POLICY "Users can update own preferences"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id AND public.has_active_access(auth.uid()));
