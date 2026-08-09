-- ==============================================================================
-- ENUMS
-- ==============================================================================

CREATE TYPE withdrawal_method_enum AS ENUM ('billetera_virtual', 'transferencia_bancaria', 'cripto', 'otro');
CREATE TYPE withdrawal_status_enum AS ENUM ('pendiente', 'procesado', 'rechazado');

-- ==============================================================================
-- TABLES
-- ==============================================================================

-- 6. withdrawals
CREATE TABLE public.withdrawals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trading_account_id UUID NOT NULL REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
  withdrawal_date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  method withdrawal_method_enum NOT NULL,
  method_details TEXT,
  status withdrawal_status_enum NOT NULL DEFAULT 'procesado',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own withdrawals"
  ON public.withdrawals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own withdrawals"
  ON public.withdrawals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own withdrawals"
  ON public.withdrawals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own withdrawals"
  ON public.withdrawals FOR DELETE
  USING (auth.uid() = user_id);
