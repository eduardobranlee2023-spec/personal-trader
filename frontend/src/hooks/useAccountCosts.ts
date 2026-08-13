import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface AccountCostData {
  totalCost: number;       // suma de amount_invested vinculados a esta cuenta
  investmentCount: number; // cuántas inversiones tiene
}

/** Devuelve un Map<accountId, AccountCostData> con los costos de funded_investments por cuenta. */
export function useAccountCosts() {
  const { user } = useAuth();
  const [rawInvestments, setRawInvestments] = useState<
    { trading_account_id: string | null; amount_invested: number }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCosts = async () => {
    if (!user) { setIsLoading(false); return; }
    setIsLoading(true);
    const { data, error } = await supabase
      .from('funded_investments')
      .select('trading_account_id, amount_invested')
      .eq('user_id', user.id);

    if (!error && data) {
      setRawInvestments(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCosts();
  }, [user]);

  /** Map<accountId, { totalCost, investmentCount }> */
  const costByAccount = useMemo(() => {
    const map = new Map<string, AccountCostData>();
    for (const inv of rawInvestments) {
      if (!inv.trading_account_id) continue;
      const existing = map.get(inv.trading_account_id) ?? { totalCost: 0, investmentCount: 0 };
      map.set(inv.trading_account_id, {
        totalCost: existing.totalCost + Number(inv.amount_invested),
        investmentCount: existing.investmentCount + 1,
      });
    }
    return map;
  }, [rawInvestments]);

  return { costByAccount, isLoading, refresh: fetchCosts };
}
