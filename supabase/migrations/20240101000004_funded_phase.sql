-- ==============================================================================
-- FUNDED PHASE — Agrega granularidad de fase a cuentas fondeadas
-- ==============================================================================

-- 1. Crear el enum de fases
CREATE TYPE funded_phase_enum AS ENUM ('fase_1', 'fase_2', 'verificada');

-- 2. Agregar la columna funded_phase a trading_accounts
--    - Es nullable: solo aplica cuando account_type = 'fondeada'
--    - Las cuentas personales siempre quedan NULL
ALTER TABLE public.trading_accounts
  ADD COLUMN funded_phase funded_phase_enum NULL;
