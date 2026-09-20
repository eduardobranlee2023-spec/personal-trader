-- 1. Create the new enum
CREATE TYPE access_status_new_enum AS ENUM ('pendiente', 'activa', 'vencida', 'cancelada', 'revocada');

-- 2. Add new columns
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_payment_confirmed_at TIMESTAMPTZ;

-- 3. Alter the access_status column type with data migration
ALTER TABLE public.profiles
  ALTER COLUMN access_status DROP DEFAULT,
  ALTER COLUMN access_status TYPE access_status_new_enum 
    USING (
      CASE access_status::text
        WHEN 'activo' THEN 'activa'
        WHEN 'revocado' THEN 'revocada'
        ELSE 'pendiente'
      END
    )::access_status_new_enum,
  ALTER COLUMN access_status SET DEFAULT 'pendiente'::access_status_new_enum;

-- 4. Drop the old enum and rename the new one
DROP TYPE access_status_enum;
ALTER TYPE access_status_new_enum RENAME TO access_status_enum;

-- 5. Update has_active_access function
CREATE OR REPLACE FUNCTION public.has_active_access(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status access_status_enum;
  v_expires_at timestamptz;
BEGIN
  SELECT access_status, subscription_expires_at INTO v_status, v_expires_at
  FROM public.profiles
  WHERE id = user_id;
  
  RETURN v_status = 'activa' AND v_expires_at > now();
END;
$$;

-- 6. Update existing admins
UPDATE public.profiles 
SET 
  access_status = 'activa', 
  subscription_expires_at = '2099-12-31 23:59:59Z'
WHERE role = 'admin';

-- 7. Update handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Si el email es el del administrador, conceder acceso activo y rol admin automáticamente
  IF NEW.email = 'eduardobranlee2023@gmail.com' THEN
    INSERT INTO public.profiles (id, email, full_name, role, access_status, access_granted_at, subscription_expires_at)
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'full_name',
      'admin',
      'activa',
      now(),
      '2099-12-31 23:59:59Z'
    );
  ELSE
    -- Para el resto, se crea como usuario normal pendiente de pago
    INSERT INTO public.profiles (id, email, full_name, role, access_status)
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'full_name',
      'user',
      'pendiente'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 8. Optional: pg_cron setup for expiring memberships
-- Para ejecutar esto se requiere tener pg_cron habilitado en supabase (se hace desde el dashboard usualmente)
-- Ejemplo de como se programaría un cron job que se ejecuta diariamente a la medianoche:
/*
SELECT cron.schedule(
  'update-expired-memberships',
  '0 0 * * *', -- Cada día a medianoche
  $$
    UPDATE public.profiles
    SET access_status = 'vencida'
    WHERE access_status = 'activa' AND subscription_expires_at <= now();
  $$
);
*/
