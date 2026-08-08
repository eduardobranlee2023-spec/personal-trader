-- ==============================================================================
-- POLÍTICAS DELETE FALTANTES
-- Sin estas políticas, RLS bloquea todas las eliminaciones
-- ==============================================================================

-- TRADING ACCOUNTS
CREATE POLICY "Users can delete their own accounts if active"
ON public.trading_accounts FOR DELETE
USING (auth.uid() = user_id AND public.has_active_access(auth.uid()));

-- TRADES
CREATE POLICY "Users can delete their own trades if active"
ON public.trades FOR DELETE
USING (auth.uid() = user_id AND public.has_active_access(auth.uid()));

-- STRATEGIES
CREATE POLICY "Users can delete their own strategies if active"
ON public.strategies FOR DELETE
USING (auth.uid() = user_id AND public.has_active_access(auth.uid()));

-- FUNDED INVESTMENTS
CREATE POLICY "Users can delete their own investments if active"
ON public.funded_investments FOR DELETE
USING (auth.uid() = user_id AND public.has_active_access(auth.uid()));

-- ==============================================================================
-- FIX RECURSIÓN INFINITA EN PROFILES (si aún no lo aplicaste)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING ( public.is_admin() );

CREATE POLICY "Admins can update profiles"
ON public.profiles FOR UPDATE
USING ( public.is_admin() );
