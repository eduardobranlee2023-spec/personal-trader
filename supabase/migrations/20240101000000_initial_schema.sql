-- ==============================================================================
-- ENUMS
-- ==============================================================================

CREATE TYPE subscription_status_enum AS ENUM ('active', 'inactive', 'trial', 'expired');
CREATE TYPE user_role_enum AS ENUM ('user', 'admin');
CREATE TYPE account_type_enum AS ENUM ('personal', 'fondeada');
CREATE TYPE account_status_enum AS ENUM ('activa', 'pausada', 'quemada', 'pasada');
CREATE TYPE investment_status_enum AS ENUM ('pendiente', 'aprobada', 'rechazada', 'reintentando');
CREATE TYPE trade_session_enum AS ENUM ('asia', 'londres', 'nyc', 'overlap');
CREATE TYPE trade_direction_enum AS ENUM ('compra', 'venta');
CREATE TYPE trade_status_enum AS ENUM ('ganada', 'perdida', 'breakeven', 'en curso');

-- ==============================================================================
-- TABLES
-- ==============================================================================

-- 1. profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  subscription_status subscription_status_enum NOT NULL DEFAULT 'inactive',
  subscription_expires_at TIMESTAMPTZ,
  role user_role_enum NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- TODO: Definir RLS Policies para profiles


-- 2. trading_accounts
CREATE TABLE public.trading_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  broker_or_prop_firm TEXT,
  account_type account_type_enum NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  initial_balance NUMERIC,
  status account_status_enum NOT NULL DEFAULT 'activa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.trading_accounts ENABLE ROW LEVEL SECURITY;
-- TODO: Definir RLS Policies para trading_accounts


-- 3. funded_investments
CREATE TABLE public.funded_investments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trading_account_id UUID REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  amount_invested NUMERIC NOT NULL,
  investment_date DATE NOT NULL,
  status investment_status_enum NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.funded_investments ENABLE ROW LEVEL SECURITY;
-- TODO: Definir RLS Policies para funded_investments


-- 4. strategies
CREATE TABLE public.strategies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
-- TODO: Definir RLS Policies para strategies


-- 5. trades
CREATE TABLE public.trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trading_account_id UUID NOT NULL REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
  strategy_id UUID REFERENCES public.strategies(id) ON DELETE CASCADE,
  trade_date DATE NOT NULL,
  asset TEXT NOT NULL,
  session trade_session_enum NOT NULL,
  timeframe TEXT NOT NULL,
  zone TEXT,
  direction trade_direction_enum NOT NULL,
  entry_reason TEXT,
  tradingview_link TEXT,
  investment_amount NUMERIC NOT NULL,
  result_amount NUMERIC,
  result_percentage NUMERIC,
  risk_reward TEXT,
  status trade_status_enum NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
-- TODO: Definir RLS Policies para trades
