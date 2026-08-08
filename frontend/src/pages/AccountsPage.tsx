import React, { useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
import AccountForm from '../components/accounts/AccountForm';
import { useAccounts } from '../contexts/AccountContext';
import type { TradingAccount, AccountStatus } from '../contexts/AccountContext';
import {
  Plus, Wallet, TrendingUp, TrendingDown, BarChart2,
  Pencil, ChevronRight, Loader2, AlertCircle
} from 'lucide-react';

// ─── helpers ────────────────────────────────────────────────────────────────

const fmt = (n: number, currency = 'USD') =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);

const pct = (pnl: number, initial: number) => {
  if (!initial) return null;
  return ((pnl / initial) * 100).toFixed(2);
};

const statusBadge: Record<AccountStatus, { label: string; dot: string; text: string; bg: string }> = {
  activa:   { label: 'Activa',   dot: 'bg-accent',    text: 'text-accent',    bg: 'bg-accent/10 border-accent/20' },
  pausada:  { label: 'Pausada',  dot: 'bg-yellow-400', text: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20' },
  quemada:  { label: 'Quemada',  dot: 'bg-red-400',   text: 'text-red-400',   bg: 'bg-red-400/10 border-red-400/20' },
  pasada:   { label: 'Pasada ✓', dot: 'bg-blue-400',  text: 'text-blue-400',  bg: 'bg-blue-400/10 border-blue-400/20' },
};

// ─── Global Stats Banner ─────────────────────────────────────────────────────

const GlobalStatsBanner: React.FC = () => {
  const { globalStats, accounts } = useAccounts();
  const { totalInitialBalance, totalCurrentBalance, totalPnl, totalWins, totalLosses, totalTrades } = globalStats;
  const winRate = totalTrades > 0 ? ((totalWins / (totalWins + totalLosses)) * 100).toFixed(1) : null;
  const isPositive = totalPnl >= 0;

  return (
    <div className="glass rounded-2xl border border-white/10 p-6 mb-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <span className="text-sm font-medium text-textMuted">Rendimiento global — {accounts.length} cuenta{accounts.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Stat label="Capital inicial" value={fmt(totalInitialBalance)} />
        <Stat label="Capital actual" value={fmt(totalCurrentBalance)} highlight />
        <Stat
          label="P&L total"
          value={`${isPositive ? '+' : ''}${fmt(totalPnl)}`}
          color={isPositive ? 'text-accent' : 'text-red-400'}
          sub={totalInitialBalance ? `${isPositive ? '+' : ''}${pct(totalPnl, totalInitialBalance)}%` : undefined}
        />
        <Stat label="Operaciones" value={String(totalTrades)} sub={`${totalWins}G / ${totalLosses}P`} />
        <Stat label="Win Rate" value={winRate ? `${winRate}%` : '—'} color={winRate && parseFloat(winRate) >= 50 ? 'text-accent' : 'text-red-400'} />
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string; sub?: string; color?: string; highlight?: boolean }> = ({
  label, value, sub, color, highlight
}) => (
  <div className={`rounded-xl p-4 ${highlight ? 'bg-primary/10 border border-primary/20' : 'bg-white/3 border border-white/5'}`}>
    <div className="text-xs text-textMuted mb-1">{label}</div>
    <div className={`text-xl font-bold ${color ?? 'text-text'}`}>{value}</div>
    {sub && <div className="text-xs text-textMuted mt-0.5">{sub}</div>}
  </div>
);

// ─── Account Card ─────────────────────────────────────────────────────────────

const AccountCard: React.FC<{ account: TradingAccount; onEdit: (a: TradingAccount) => void }> = ({ account, onEdit }) => {
  const badge = statusBadge[account.status];
  const pnl = account.total_pnl ?? 0;
  const isPositive = pnl >= 0;
  const p = pct(pnl, account.initial_balance ?? 0);

  return (
    <div className="glass rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-200 p-5 flex flex-col gap-4 group">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-text truncate text-base">{account.name}</div>
          {account.broker_or_prop_firm && (
            <div className="text-xs text-textMuted truncate mt-0.5">{account.broker_or_prop_firm}</div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${badge.bg} ${badge.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
            {badge.label}
          </span>
          <button
            onClick={() => onEdit(account)}
            className="opacity-0 group-hover:opacity-100 transition text-textMuted hover:text-primary p-1.5 rounded-lg hover:bg-white/5"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Type pill */}
      <div className="flex items-center gap-2">
        <span className={`text-xs px-2 py-0.5 rounded-full border ${
          account.account_type === 'fondeada'
            ? 'text-purple-400 bg-purple-400/10 border-purple-400/20'
            : 'text-textMuted bg-white/5 border-white/10'
        }`}>
          {account.account_type === 'fondeada' ? 'Fondeada' : 'Personal'}
        </span>
        <span className="text-xs text-textMuted">{account.currency}</span>
      </div>

      {/* Balances */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/3 rounded-xl p-3 border border-white/5">
          <div className="text-xs text-textMuted mb-1">Balance inicial</div>
          <div className="text-sm font-semibold text-text">
            {account.initial_balance != null ? fmt(account.initial_balance, account.currency) : '—'}
          </div>
        </div>
        <div className="bg-primary/5 rounded-xl p-3 border border-primary/10">
          <div className="text-xs text-textMuted mb-1">Balance actual</div>
          <div className="text-sm font-semibold text-text">
            {account.current_balance != null ? fmt(account.current_balance, account.currency) : '—'}
          </div>
        </div>
      </div>

      {/* PnL bar */}
      {account.initial_balance != null && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-xs">
              {isPositive
                ? <TrendingUp className="w-3.5 h-3.5 text-accent" />
                : <TrendingDown className="w-3.5 h-3.5 text-red-400" />
              }
              <span className={`font-semibold ${isPositive ? 'text-accent' : 'text-red-400'}`}>
                {isPositive ? '+' : ''}{fmt(pnl, account.currency)}
              </span>
              {p && <span className="text-textMuted">({isPositive ? '+' : ''}{p}%)</span>}
            </div>
            <div className="flex items-center gap-1 text-xs text-textMuted">
              <BarChart2 className="w-3 h-3" />
              {account.trade_count ?? 0} ops · {account.total_wins ?? 0}G/{account.total_losses ?? 0}P
            </div>
          </div>
          {/* Visual progress bar */}
          <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${isPositive ? 'bg-accent' : 'bg-red-400'}`}
              style={{ width: `${Math.min(Math.abs(parseFloat(p ?? '0')), 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer: go to trades */}
      <button
        className="flex items-center justify-between w-full text-xs text-textMuted hover:text-primary transition pt-1 border-t border-white/5 group/btn"
      >
        <span>Ver operaciones de esta cuenta</span>
        <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
      </button>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const AccountsPage: React.FC = () => {
  const { accounts, isLoading, refresh } = useAccounts();
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<TradingAccount | null>(null);
  const [filterStatus, setFilterStatus] = useState<AccountStatus | 'todas'>('todas');

  const openNew = () => { setEditingAccount(null); setShowForm(true); };
  const openEdit = (a: TradingAccount) => { setEditingAccount(a); setShowForm(true); };
  const handleSaved = () => { refresh(); };

  const filtered = filterStatus === 'todas'
    ? accounts
    : accounts.filter(a => a.status === filterStatus);

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text flex items-center gap-2.5">
            <Wallet className="w-6 h-6 text-primary" />
            Mis Cuentas
          </h1>
          <p className="text-textMuted text-sm mt-1">Gestioná y monitoreá todas tus cuentas de trading.</p>
        </div>

        <button
          id="accounts-new"
          onClick={openNew}
          className="flex items-center gap-2 bg-primary hover:bg-primaryHover text-white font-semibold rounded-xl px-4 py-2.5 text-sm transition-all shadow-lg shadow-primary/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nueva cuenta
        </button>
      </div>

      {/* Global stats */}
      {accounts.length > 0 && <GlobalStatsBanner />}

      {/* Filter tabs */}
      {accounts.length > 0 && (
        <div className="flex items-center gap-1.5 mb-5 overflow-x-auto pb-1">
          {(['todas', 'activa', 'pausada', 'quemada', 'pasada'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-sm shrink-0 transition-all border ${
                filterStatus === s
                  ? 'bg-primary/15 border-primary/30 text-primary'
                  : 'bg-white/3 border-white/5 text-textMuted hover:text-text hover:bg-white/7'
              }`}
            >
              {s === 'todas' ? 'Todas' : statusBadge[s as AccountStatus].label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : accounts.length === 0 ? (
        // Empty state
        <div className="glass rounded-2xl border border-white/10 border-dashed flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center">
            <Wallet className="w-8 h-8 text-primary opacity-60" />
          </div>
          <div className="text-center">
            <p className="text-text font-semibold mb-1">Todavía no tenés cuentas</p>
            <p className="text-textMuted text-sm">Creá tu primera cuenta para empezar a registrar operaciones.</p>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-primary hover:bg-primaryHover text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-all shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            Crear cuenta
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-textMuted">
          <AlertCircle className="w-8 h-8 opacity-40" />
          <p className="text-sm">No hay cuentas con ese estado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(acc => (
            <AccountCard
              key={acc.id}
              account={acc}
              onEdit={openEdit}
            />
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <AccountForm
          account={editingAccount}
          onClose={() => setShowForm(false)}
          onSaved={handleSaved}
        />
      )}
    </AppLayout>
  );
};

export default AccountsPage;
