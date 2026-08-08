-- ==============================================================================
-- 1. MODIFICAR TIPOS Y TABLA PROFILES
-- ==============================================================================

-- Crear nuevo tipo para el estado de acceso (pago único)
CREATE TYPE access_status_enum AS ENUM ('pendiente', 'activo', 'revocado');

-- Modificar tabla perfiles
ALTER TABLE public.profiles 
  DROP COLUMN IF EXISTS subscription_status,
  DROP COLUMN IF EXISTS subscription_expires_at,
  ADD COLUMN access_status access_status_enum NOT NULL DEFAULT 'pendiente',
  ADD COLUMN access_granted_at TIMESTAMPTZ,
  ADD COLUMN access_granted_by UUID REFERENCES auth.users(id);

-- ==============================================================================
-- 2. TRIGGER DE AUTENTICACIÓN
-- ==============================================================================

-- Función para manejar nuevos usuarios que se registran por auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Si el email es el del administrador, conceder acceso activo y rol admin automáticamente
  IF NEW.email = 'eduardobranlee2023@gmail.com' THEN
    INSERT INTO public.profiles (id, email, full_name, role, access_status, access_granted_at)
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'full_name',
      'admin',
      'activo',
      now()
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

-- Trigger para ejecutar la función tras crear usuario en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==============================================================================
-- 3. FUNCIÓN DE UTILIDAD: HAS_ACTIVE_ACCESS
-- ==============================================================================

-- Función que revisa si el usuario tiene status activo (o es admin)
CREATE OR REPLACE FUNCTION public.has_active_access(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status access_status_enum;
  v_role user_role_enum;
BEGIN
  SELECT access_status, role INTO v_status, v_role
  FROM public.profiles
  WHERE id = user_id;
  
  -- Es admin o está activo
  RETURN v_status = 'activo' OR v_role = 'admin';
END;
$$;

-- ==============================================================================
-- 4. POLÍTICAS DE RLS (ROW LEVEL SECURITY)
-- ==============================================================================

-- A) PROFILES
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update profiles" 
ON public.profiles FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  )
);


-- B) TRADING ACCOUNTS
DROP POLICY IF EXISTS "Users can view their own accounts if active" ON public.trading_accounts;
DROP POLICY IF EXISTS "Users can insert their own accounts if active" ON public.trading_accounts;
DROP POLICY IF EXISTS "Users can update their own accounts if active" ON public.trading_accounts;

CREATE POLICY "Users can view their own accounts if active" 
ON public.trading_accounts FOR SELECT 
USING (auth.uid() = user_id AND public.has_active_access(auth.uid()));

CREATE POLICY "Users can insert their own accounts if active" 
ON public.trading_accounts FOR INSERT 
WITH CHECK (auth.uid() = user_id AND public.has_active_access(auth.uid()));

CREATE POLICY "Users can update their own accounts if active" 
ON public.trading_accounts FOR UPDATE 
USING (auth.uid() = user_id AND public.has_active_access(auth.uid()));

-- C) FUNDED INVESTMENTS
DROP POLICY IF EXISTS "Users can view their own investments if active" ON public.funded_investments;
DROP POLICY IF EXISTS "Users can insert their own investments if active" ON public.funded_investments;
DROP POLICY IF EXISTS "Users can update their own investments if active" ON public.funded_investments;

CREATE POLICY "Users can view their own investments if active" 
ON public.funded_investments FOR SELECT 
USING (auth.uid() = user_id AND public.has_active_access(auth.uid()));

CREATE POLICY "Users can insert their own investments if active" 
ON public.funded_investments FOR INSERT 
WITH CHECK (auth.uid() = user_id AND public.has_active_access(auth.uid()));

CREATE POLICY "Users can update their own investments if active" 
ON public.funded_investments FOR UPDATE 
USING (auth.uid() = user_id AND public.has_active_access(auth.uid()));

-- D) STRATEGIES
DROP POLICY IF EXISTS "Users can view their own strategies if active" ON public.strategies;
DROP POLICY IF EXISTS "Users can insert their own strategies if active" ON public.strategies;
DROP POLICY IF EXISTS "Users can update their own strategies if active" ON public.strategies;

CREATE POLICY "Users can view their own strategies if active" 
ON public.strategies FOR SELECT 
USING (auth.uid() = user_id AND public.has_active_access(auth.uid()));

CREATE POLICY "Users can insert their own strategies if active" 
ON public.strategies FOR INSERT 
WITH CHECK (auth.uid() = user_id AND public.has_active_access(auth.uid()));

CREATE POLICY "Users can update their own strategies if active" 
ON public.strategies FOR UPDATE 
USING (auth.uid() = user_id AND public.has_active_access(auth.uid()));

-- E) TRADES
DROP POLICY IF EXISTS "Users can view their own trades if active" ON public.trades;
DROP POLICY IF EXISTS "Users can insert their own trades if active" ON public.trades;
DROP POLICY IF EXISTS "Users can update their own trades if active" ON public.trades;

CREATE POLICY "Users can view their own trades if active" 
ON public.trades FOR SELECT 
USING (auth.uid() = user_id AND public.has_active_access(auth.uid()));

CREATE POLICY "Users can insert their own trades if active" 
ON public.trades FOR INSERT 
WITH CHECK (auth.uid() = user_id AND public.has_active_access(auth.uid()));

CREATE POLICY "Users can update their own trades if active" 
ON public.trades FOR UPDATE 
USING (auth.uid() = user_id AND public.has_active_access(auth.uid()));


-- ==============================================================================
-- 5. UPGRADE MANUAL DEL ADMIN (POR SI YA EXISTÍA LA CUENTA EN AUTH)
-- ==============================================================================
UPDATE public.profiles 
SET 
  role = 'admin', 
  access_status = 'activo', 
  access_granted_at = now() 
WHERE email = 'eduardobranlee2023@gmail.com';
