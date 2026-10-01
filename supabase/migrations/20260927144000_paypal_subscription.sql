-- Add paypal_subscription_id to profiles
ALTER TABLE public.profiles
ADD COLUMN paypal_subscription_id text;
