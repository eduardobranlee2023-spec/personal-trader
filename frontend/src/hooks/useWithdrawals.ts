import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useAccounts, ALL_ACCOUNTS_ID, TradingAccount } from '../contexts/AccountContext';

export type WithdrawalMethod = 'billetera_virtual' | 'transferencia_bancaria' | 'cripto' | 'otro';
export type WithdrawalStatus = 'pendiente' | 'procesado' | 'rechazado';

export interface Withdrawal {
  id: string;
  user_id: string;
  trading_account_id: string;
  withdrawal_date: string;
  amount: number;
  method: WithdrawalMethod;
  method_details: string | null;
  status: WithdrawalStatus;
  notes: string | null;
  created_at: string;
}

export interface WithdrawalMetrics {
  totalWithdrawn: number;
  netProfit: number;
  withdrawnPct: number | null; // null represents N/A
  reinvestedPct: number | null;
  averageWithdrawal: number;
  frequencyDays: number | null;
  totalWithdrawalsCount: number;
  methodDistribution: Record<WithdrawalMethod, number>;
  byAccount: { account: TradingAccount; netProfit: number; totalWithdrawn: number; withdrawnPct: number | null }[];
}

export function useWithdrawals() {
  const { user } = useAuth();
  const { selectedAccountId, accounts, globalStats, selectedAccount } = useAccounts();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWithdrawals = useCallback(async () => {
    if (!user) { setIsLoading(false); return; }
    setIsLoading(true);

    let query = supabase
      .from('withdrawals')
      .select('*')
      .eq('user_id', user.id)
      .order('withdrawal_date', { ascending: false });

    if (selectedAccountId !== ALL_ACCOUNTS_ID) {
      query = query.eq('trading_account_id', selectedAccountId);
    }

    const { data, error } = await query;
    if (!error && data) {
      setWithdrawals(data as Withdrawal[]);
    }
    setIsLoading(false);
  }, [user, selectedAccountId]);

  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  // Compute Metrics
  const computeMetrics = (): WithdrawalMetrics => {
    const isAll = selectedAccountId === ALL_ACCOUNTS_ID;
    
    const processedWithdrawals = withdrawals.filter(w => w.status === 'procesado');
    const totalWithdrawn = processedWithdrawals.reduce((sum, w) => sum + w.amount, 0);
    const totalWithdrawalsCount = processedWithdrawals.length;
    
    let netProfit = 0;
    if (isAll) {
      netProfit = globalStats.totalPnl;
    } else if (selectedAccount) {
      netProfit = selectedAccount.total_pnl ?? 0;
    }

    const withdrawnPct = netProfit > 0 ? (totalWithdrawn / netProfit) * 100 : null;
    const reinvestedPct = withdrawnPct !== null ? Math.max(0, 100 - withdrawnPct) : null;
    const averageWithdrawal = totalWithdrawalsCount > 0 ? totalWithdrawn / totalWithdrawalsCount : 0;

    // Frequency
    let frequencyDays: number | null = null;
    if (totalWithdrawalsCount > 1) {
      const dates = processedWithdrawals.map(w => new Date(w.withdrawal_date).getTime()).sort((a, b) => a - b);
      const diffMs = dates[dates.length - 1] - dates[0];
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      frequencyDays = diffDays / (totalWithdrawalsCount - 1);
    }

    // Method Distribution
    const methodDistribution: Record<WithdrawalMethod, number> = {
      billetera_virtual: 0,
      transferencia_bancaria: 0,
      cripto: 0,
      otro: 0
    };
    processedWithdrawals.forEach(w => {
      methodDistribution[w.method] += w.amount; // Distribute by amount instead of count for better visualization
    });

    // By Account breakdown (only relevant for ALL)
    const byAccount = accounts.map(acc => {
      const accNet = acc.total_pnl ?? 0;
      const accWithdrawn = acc.total_withdrawn ?? 0;
      return {
        account: acc,
        netProfit: accNet,
        totalWithdrawn: accWithdrawn,
        withdrawnPct: accNet > 0 ? (accWithdrawn / accNet) * 100 : null
      };
    }).filter(a => a.totalWithdrawn > 0 || a.netProfit > 0).sort((a, b) => b.totalWithdrawn - a.totalWithdrawn);

    return {
      totalWithdrawn,
      netProfit,
      withdrawnPct,
      reinvestedPct,
      averageWithdrawal,
      frequencyDays,
      totalWithdrawalsCount,
      methodDistribution,
      byAccount
    };
  };

  const metrics = computeMetrics();

  return { withdrawals, metrics, isLoading, refresh: fetchWithdrawals };
}
