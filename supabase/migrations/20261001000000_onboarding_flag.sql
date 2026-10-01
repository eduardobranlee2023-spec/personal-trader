ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_seen_onboarding_tour BOOLEAN NOT NULL DEFAULT false;
