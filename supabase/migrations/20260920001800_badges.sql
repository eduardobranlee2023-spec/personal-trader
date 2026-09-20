-- Badge Definitions Table (catalog of possible badges)
CREATE TABLE public.badge_definitions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon_name TEXT NOT NULL DEFAULT 'Award',
    accent_color TEXT NOT NULL DEFAULT '#00e08a',
    linked_goal_type TEXT
);

-- User Badges Table (badges earned by users)
CREATE TABLE public.user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_definition_id TEXT NOT NULL REFERENCES public.badge_definitions(id),
    goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
    earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- RLS for badge_definitions (public read)
ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view badge definitions" ON public.badge_definitions
    FOR SELECT USING (true);

-- RLS for user_badges
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own badges" ON public.user_badges
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own badges" ON public.user_badges
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Seed badge definitions
INSERT INTO public.badge_definitions (id, name, description, icon_name, accent_color, linked_goal_type) VALUES
('capital_total',    'Capital Alcanzado',      'Alcanzaste tu objetivo de capital total.',     'TrendingUp',    '#00e08a', 'capital_total'),
('ganancia_periodo', 'Ganancia Lograda',       'Superaste tu meta de P&L en el período.',      'DollarSign',    '#00c4f4', 'ganancia_periodo'),
('winrate',          'Maestro del Win Rate',   'Tu win rate superó el objetivo establecido.',  'Target',        '#f59e0b', 'winrate'),
('personalizada',    'Objetivo Personal',      'Completaste un objetivo personalizado.',        'Star',          '#a855f7', 'personalizada'),
('generic',          'Meta Completada',        'Completaste una meta de trading.',              'Award',         '#00e08a', NULL);
