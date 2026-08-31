import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

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

interface ProcessedWithdrawal {
  trading_account_id: string;
  amount: number;
  commission_percentage: number | null;
}

/** Calcula el monto neto de un retiro después de la comisión de la prop firm */
const getNetAmount = (w: ProcessedWithdrawal): number => {
  const pct = w.commission_percentage ?? 0;
  return w.amount * (1 - pct / 100);
};

export function useFundedInvestments() {
  const { user } = useAuth();
  const [investments, setInvestments] = useState<FundedInvestment[]>([]);
  const [processedWithdrawals, setProcessedWithdrawals] = useState<ProcessedWithdrawal[]>([]);
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
        .select('trading_account_id, amount, commission_percentage')
        .eq('user_id', user.id)
        .eq('status', 'procesado'),
    ]);

    if (!investmentsResult.error && investmentsResult.data) {
      setInvestments(investmentsResult.data as FundedInvestment[]);
    }
    if (!withdrawalsResult.error && withdrawalsResult.data) {
      setProcessedWithdrawals(withdrawalsResult.data as ProcessedWithdrawal[]);
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

    // totalRecovered = suma de net_amount de retiros procesados vinculados a cuentas fondeadas
    // net_amount = amount × (1 − commission_percentage/100)
    const totalRecovered = processedWithdrawals
      .filter(withdrawal => fundedAccountIds.has(withdrawal.trading_account_id))
      .reduce((sum, withdrawal) => sum + getNetAmount(withdrawal), 0);

    // netAvailable: no aplica comisión por operación — se proyecta sobre el PnL bruto de las cuentas
    // (la comisión real ya está descontada en totalRecovered via los retiros)
    const netAvailable = totalRecovered;

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
