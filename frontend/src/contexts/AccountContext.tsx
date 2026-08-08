import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export type AccountStatus = 'activa' | 'pausada' | 'quemada' | 'pasada';
export type AccountType = 'personal' | 'fondeada';

export type TradingAccount = {
  id: string;
  user_id: string;
  name: string;
  broker_or_prop_firm: string | null;
  account_type: AccountType;
  currency: string;
  initial_balance: number | null;
  status: AccountStatus;
  created_at: string;
  // computed
  current_balance?: number;
  total_pnl?: number;
  total_wins?: number;
  total_losses?: number;
  trade_count?: number;
};

export type AccountStats = {
  totalInitialBalance: number;
  totalCurrentBalance: number;
  totalPnl: number;
  totalWins: number;
  totalLosses: number;
  totalTrades: number;
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
  globalStats: { totalInitialBalance: 0, totalCurrentBalance: 0, totalPnl: 0, totalWins: 0, totalLosses: 0, totalTrades: 0 },
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

    // Fetch accounts with aggregated trade data via a joined query
    const { data: accs, error: accsErr } = await supabase
      .from('trading_accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (accsErr || !accs) { setIsLoading(false); return; }

    // Fetch all trades for this user to compute per-account balances
    const { data: trades } = await supabase
      .from('trades')
      .select('trading_account_id, result_amount, status')
      .eq('user_id', user.id);

    const enriched: TradingAccount[] = accs.map(acc => {
      const accTrades = (trades || []).filter(t => t.trading_account_id === acc.id);
      const total_pnl = accTrades.reduce((sum, t) => sum + (t.result_amount ?? 0), 0);
      const current_balance = (acc.initial_balance ?? 0) + total_pnl;
      const total_wins = accTrades.filter(t => t.status === 'ganada').length;
      const total_losses = accTrades.filter(t => t.status === 'perdida').length;
      return {
        ...acc,
        total_pnl,
        current_balance,
        total_wins,
        total_losses,
        trade_count: accTrades.length,
      };
    });

    setAccounts(enriched);
    setIsLoading(false);
  }, [user]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const globalStats: AccountStats = {
    totalInitialBalance: accounts.reduce((s, a) => s + (a.initial_balance ?? 0), 0),
    totalCurrentBalance: accounts.reduce((s, a) => s + (a.current_balance ?? a.initial_balance ?? 0), 0),
    totalPnl: accounts.reduce((s, a) => s + (a.total_pnl ?? 0), 0),
    totalWins: accounts.reduce((s, a) => s + (a.total_wins ?? 0), 0),
    totalLosses: accounts.reduce((s, a) => s + (a.total_losses ?? 0), 0),
    totalTrades: accounts.reduce((s, a) => s + (a.trade_count ?? 0), 0),
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
