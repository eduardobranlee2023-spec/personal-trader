import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export type AccountStatus = 'activa' | 'pausada' | 'quemada' | 'pasada';
export type AccountType = 'personal' | 'fondeada';
export type FundedPhase = 'fase_1' | 'fase_2' | 'verificada' | null;

export type TradingAccount = {
  id: string;
  user_id: string;
  name: string;
  broker_or_prop_firm: string | null;
  account_type: AccountType;
  currency: string;
  initial_balance: number | null;
  status: AccountStatus;
  funded_phase: FundedPhase;
  created_at: string;
  // computed
  current_balance?: number;
  total_pnl?: number;
  total_wins?: number;
  total_losses?: number;
  trade_count?: number;
  total_withdrawn?: number;
};

export type AccountStats = {
  totalInitialBalance: number;
  totalCurrentBalance: number;
  totalPnl: number;
  totalWins: number;
  totalLosses: number;
  totalTrades: number;
  totalWithdrawals: number;
  monthlyWithdrawals: number;
};

export const ALL_ACCOUNTS_ID = '__ALL__';

interface AccountContextType {
  accounts: TradingAccount[];
  selectedAccountId: string;
  setSelectedAccountId: (id: string) => void;
  selectedAccount: TradingAccount | null;
  globalStats: AccountStats;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const AccountContext = createContext<AccountContextType>({
  accounts: [],
  selectedAccountId: ALL_ACCOUNTS_ID,
  setSelectedAccountId: () => {},
  selectedAccount: null,
  globalStats: { totalInitialBalance: 0, totalCurrentBalance: 0, totalPnl: 0, totalWins: 0, totalLosses: 0, totalTrades: 0, totalWithdrawals: 0, monthlyWithdrawals: 0 },
  isLoading: true,
  refresh: async () => {},
});

export const useAccounts = () => useContext(AccountContext);

export const AccountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(ALL_ACCOUNTS_ID);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAccounts = useCallback(async () => {
    if (!user) { setIsLoading(false); return; }
    setIsLoading(true);

    // Fetch accounts
    const { data: accs, error: accsErr } = await supabase
      .from('trading_accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (accsErr || !accs) { setIsLoading(false); return; }

    // Fetch all trades
    const { data: trades } = await supabase
      .from('trades')
      .select('trading_account_id, result_amount, status')
      .eq('user_id', user.id);

    // Fetch all withdrawals
    const { data: withdrawals } = await supabase
      .from('withdrawals')
      .select('trading_account_id, amount, status, withdrawal_date')
      .eq('user_id', user.id);

    const enriched: TradingAccount[] = accs.map(acc => {
      const accTrades = (trades || []).filter(t => t.trading_account_id === acc.id);
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const accWithdrawals = (withdrawals || []).filter(w => w.trading_account_id === acc.id && w.status === 'procesado');
      const monthlyWithdrawals = accWithdrawals.filter(w => {
        const d = new Date(w.withdrawal_date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
      
      const total_pnl = accTrades.reduce((sum, t) => sum + (t.result_amount ?? 0), 0);
      const current_balance = (acc.initial_balance ?? 0) + total_pnl;
      const total_wins = accTrades.filter(t => t.status === 'ganada').length;
      const total_losses = accTrades.filter(t => t.status === 'perdida').length;
      const total_withdrawn = accWithdrawals.reduce((sum, w) => sum + (w.amount ?? 0), 0);
      const monthly_withdrawn = monthlyWithdrawals.reduce((sum, w) => sum + (w.amount ?? 0), 0);

      return {
        ...acc,
        total_pnl,
        current_balance,
        total_wins,
        total_losses,
        trade_count: accTrades.length,
        total_withdrawn,
        monthly_withdrawn,
      };
    });

    setAccounts(enriched);
    setIsLoading(false);
  }, [user]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const globalStats: AccountStats & { monthlyWithdrawals: number } = {
    totalInitialBalance: accounts.reduce((s, a) => s + (a.initial_balance ?? 0), 0),
    totalCurrentBalance: accounts.reduce((s, a) => s + (a.current_balance ?? a.initial_balance ?? 0), 0),
    totalPnl: accounts.reduce((s, a) => s + (a.total_pnl ?? 0), 0),
    totalWins: accounts.reduce((s, a) => s + (a.total_wins ?? 0), 0),
    totalLosses: accounts.reduce((s, a) => s + (a.total_losses ?? 0), 0),
    totalTrades: accounts.reduce((s, a) => s + (a.trade_count ?? 0), 0),
    totalWithdrawals: accounts.reduce((s, a) => s + (a.total_withdrawn ?? 0), 0),
    monthlyWithdrawals: accounts.reduce((s, a) => s + ((a as any).monthly_withdrawn ?? 0), 0),
  };

  const selectedAccount = accounts.find(a => a.id === selectedAccountId) ?? null;

  return (
    <AccountContext.Provider value={{
      accounts,
      selectedAccountId,
      setSelectedAccountId,
      selectedAccount,
      globalStats,
      isLoading,
      refresh: fetchAccounts,
    }}>
      {children}
    </AccountContext.Provider>
  );
};
