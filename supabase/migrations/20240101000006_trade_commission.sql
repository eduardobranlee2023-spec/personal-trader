-- ============================================================================
-- TRADE COMMISSION — porcentaje retenido por la prop firm
-- ============================================================================

ALTER TABLE public.trades
  ADD COLUMN commission_percentage INTEGER NULL DEFAULT NULL;

ALTER TABLE public.trades
  ADD CONSTRAINT trades_commission_percentage_range
  CHECK (commission_percentage IS NULL OR (commission_percentage >= 0 AND commission_percentage <= 100));