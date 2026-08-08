import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Trade } from './useTrades';

export type InvestmentStatus = 'pendiente' | 'aprobada' | 'rechazada' | 'reintentando';

export interface FundedInvestment {
  id: string;
  user_id: string;
  trading_account_id: string | null;
  provider: string;
  amount_invested: number;
  investment_date: string;
  status: InvestmentStatus;
  notes: string | null;
  created_at: string;
}

export function useFundedInvestments(trades: Trade[] = []) {
  const { user } = useAuth();
  const [investments, setInvestments] = useState<FundedInvestment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInvestments = async () => {
    if (!user) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from('funded_investments')
      .select('*')
      .eq('user_id', user.id)
      .order('investment_date', { ascending: false });

    if (!error && data) {
      setInvestments(data as FundedInvestment[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchInvestments();
  }, [user]);

  // Calculate metrics
  const metrics = useMemo(() => {
    let totalInvested = 0;
    let totalRecovered = 0;

    // Calculate PnL per trading account
    const pnlByAccount = new Map<string, number>();
    for (const trade of trades) {
      if (!trade.trading_account_id) continue;
      const current = pnlByAccount.get(trade.trading_account_id) || 0;
      pnlByAccount.set(trade.trading_account_id, current + (trade.result_amount || 0));
    }

    for (const inv of investments) {
      totalInvested += Number(inv.amount_invested);
      if (inv.trading_account_id && inv.status === 'aprobada') {
        const accountPnl = pnlByAccount.get(inv.trading_account_id) || 0;
        // Solo sumamos ganancias (si está negativo no resta al total recuperado históricamente)
        // O dependiendo del ROI general, se puede sumar el PnL neto.
        // Asumimos que recuperado es el PnL positivo que logró generar.
        if (accountPnl > 0) {
          totalRecovered += accountPnl;
        }
      }
    }

    const netRoi = totalInvested > 0 ? ((totalRecovered - totalInvested) / totalInvested) * 100 : 0;

    return {
      totalInvested,
      totalRecovered,
      netRoi,
    };
  }, [investments, trades]);

  return { investments, metrics, isLoading, refresh: fetchInvestments };
}
