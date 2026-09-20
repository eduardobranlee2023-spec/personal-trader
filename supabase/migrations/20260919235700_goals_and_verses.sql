-- Create Enums
CREATE TYPE public.goal_target_type AS ENUM ('capital_total', 'ganancia_periodo', 'winrate', 'personalizada');
CREATE TYPE public.goal_status AS ENUM ('en_progreso', 'completada', 'vencida');

-- Create Goals Table
CREATE TABLE public.goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    target_type public.goal_target_type NOT NULL,
    target_value NUMERIC NOT NULL,
    trading_account_id UUID REFERENCES public.trading_accounts(id) ON DELETE SET NULL,
    deadline DATE,
    status public.goal_status NOT NULL DEFAULT 'en_progreso',
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- RLS for Goals
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own goals" ON public.goals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals" ON public.goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals" ON public.goals
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals" ON public.goals
    FOR DELETE USING (auth.uid() = user_id);

-- Create Bible Verses Table
CREATE TABLE public.bible_verses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic TEXT NOT NULL,
    reference TEXT NOT NULL,
    text_es TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- RLS for Bible Verses
ALTER TABLE public.bible_verses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view bible verses" ON public.bible_verses
    FOR SELECT USING (true);

-- Allow inserts via service role or authenticated users for population script
CREATE POLICY "Authenticated users can insert bible verses" ON public.bible_verses
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');
