-- Migration for "Aprender" module (Promotional Showcase)

-- Ensure profiles has the 'plan' column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'basico' CHECK (plan IN ('basico', 'mentor'));

-- Clean up any previous tables from incorrect implementation
DROP FUNCTION IF EXISTS get_secure_course_modules(UUID);
DROP TABLE IF EXISTS public.course_modules CASCADE;
DROP TABLE IF EXISTS public.course_purchases CASCADE;
DROP TABLE IF EXISTS public.courses CASCADE;

-- Create the correct table for promotional listings (we keep the name 'courses' for simplicity but it acts as listings)
CREATE TABLE public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    external_link TEXT,
    category TEXT,
    type TEXT NOT NULL CHECK (type IN ('curso', 'mentoria', 'comunidad')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for courses (promotions)

-- Any user with active access can view active listings
CREATE POLICY "Users with active access can view active courses"
    ON public.courses
    FOR SELECT
    USING (
        (is_active = true AND EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.access_status = 'activa'
        )) OR
        mentor_user_id = auth.uid()
    );

-- Mentors can insert listings if they have the mentor plan
CREATE POLICY "Mentors can create courses"
    ON public.courses
    FOR INSERT
    WITH CHECK (
        mentor_user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.plan = 'mentor'
        )
    );

-- Mentors can update their own listings
CREATE POLICY "Mentors can update their own courses"
    ON public.courses
    FOR UPDATE
    USING (mentor_user_id = auth.uid());

-- Mentors can delete their own listings
CREATE POLICY "Mentors can delete their own courses"
    ON public.courses
    FOR DELETE
    USING (mentor_user_id = auth.uid());
