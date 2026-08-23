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
  const [processedWithdrawals, setProcessedWithdrawals] = useState<{
    trading_account_id: string;
    amount: number;
  }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInvestments = async () => {
    if (!user) return;
    setIsLoading(true);
    const [investmentsResult, withdrawalsResult] = await Promise.all([
      supabase
        .from('funded_investments')
        .select('*')
        .eq('user_id', user.id)
        .order('investment_date', { ascending: false }),
      supabase
        .from('withdrawals')
        .select('trading_account_id, amount')
        .eq('user_id', user.id)
        .eq('status', 'procesado'),
    ]);

    if (!investmentsResult.error && investmentsResult.data) {
      setInvestments(investmentsResult.data as FundedInvestment[]);
    }
    if (!withdrawalsResult.error && withdrawalsResult.data) {
      setProcessedWithdrawals(withdrawalsResult.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchInvestments();
  }, [user]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalInvested = investments.reduce((sum, inv) => sum + Number(inv.amount_invested), 0);
    const fundedAccountIds = new Set(
      investments
        .map(inv => inv.trading_account_id)
        .filter((accountId): accountId is string => Boolean(accountId))
    );
    const totalRecovered = processedWithdrawals
      .filter(withdrawal => fundedAccountIds.has(withdrawal.trading_account_id))
      .reduce((sum, withdrawal) => sum + Number(withdrawal.amount), 0);
    const netAvailable = trades
      .filter(trade => fundedAccountIds.has(trade.trading_account_id))
      .reduce((sum, trade) => {
        const result = Number(trade.result_amount ?? 0);
        if (result <= 0) return sum + result;
        const commission = Number(trade.commission_percentage ?? 0);
        return sum + result * (1 - commission / 100);
      }, 0);
    const netRoi = totalInvested > 0 ? (totalRecovered / totalInvested) * 100 : null;

    return {
      totalInvested,
      totalRecovered,
      netAvailable,
      netRoi,
    };
  }, [investments, processedWithdrawals]);

  return { investments, metrics, isLoading, refresh: fetchInvestments };
}
