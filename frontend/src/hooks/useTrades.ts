import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ALL_ACCOUNTS_ID } from '../contexts/AccountContext';


export type TradeSession = 'asia' | 'londres' | 'nyc' | 'overlap';
export type TradeDirection = 'compra' | 'venta';
export type TradeStatus = 'ganada' | 'perdida' | 'breakeven' | 'en curso';

export interface Trade {
  id: string;
  user_id: string;
  trading_account_id: string;
  strategy_id: string | null;
  trade_date: string;
  asset: string;
  session: TradeSession;
  timeframe: string;
  zone: string | null;
  direction: TradeDirection;
  entry_reason: string | null;
  tradingview_link: string | null;
  investment_amount: number;
  result_amount: number | null;
  result_percentage: number | null;
  risk_reward: string | null;
  status: TradeStatus;
  notes: string | null;
  created_at: string;
}

export function useTrades(filters: { accountId?: string; asset?: string; direction?: string; status?: string; strategyId?: string } = {}) {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [assets, setAssets] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrades = async () => {
    if (!user) return;
    setIsLoading(true);
    let query = supabase.from('trades').select('*').eq('user_id', user.id).order('trade_date', { ascending: false }).order('created_at', { ascending: false });

    if (filters.accountId && filters.accountId !== ALL_ACCOUNTS_ID) {
      query = query.eq('trading_account_id', filters.accountId);
    }
    if (filters.asset) query = query.eq('asset', filters.asset);
    if (filters.direction) query = query.eq('direction', filters.direction);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.strategyId) query = query.eq('strategy_id', filters.strategyId);

    const { data, error: err } = await query;
    if (err) {
      setError(err.message);
    } else {
      setTrades(data as Trade[]);
      
      // Extract unique assets for autocomplete
      const uniqueAssets = Array.from(new Set(data?.map(t => t.asset) || []));
      setAssets(uniqueAssets);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTrades();
  }, [user, filters.accountId, filters.asset, filters.direction, filters.status, filters.strategyId]);

  return { trades, assets, isLoading, error, refresh: fetchTrades };
}

export interface Strategy {
  id: string;
  name: string;
  description: string | null;
}

export function useStrategies() {
  const { user } = useAuth();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStrategies = async () => {
    if (!user) return;
    setIsLoading(true);
    const { data } = await supabase.from('strategies').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) setStrategies(data as Strategy[]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchStrategies();
  }, [user]);

  return { strategies, isLoading, refresh: fetchStrategies };
}
