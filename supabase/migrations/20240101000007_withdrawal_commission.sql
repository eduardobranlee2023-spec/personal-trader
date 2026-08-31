-- ============================================================================
-- WITHDRAWAL COMMISSION — porcentaje retenido por la prop firm al momento del retiro
-- ============================================================================
-- El campo amount en withdrawals representa el monto BRUTO solicitado.
-- net_amount = amount × (1 − commission_percentage/100)
-- Si commission_percentage es NULL → tratarlo como 0% → net_amount = amount

ALTER TABLE public.withdrawals
  ADD COLUMN commission_percentage INTEGER NULL DEFAULT NULL;

ALTER TABLE public.withdrawals
  ADD CONSTRAINT withdrawals_commission_percentage_range
  CHECK (commission_percentage IS NULL OR (commission_percentage >= 0 AND commission_percentage <= 100));
