import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import AccountForm from '../components/accounts/AccountForm';
import { useAccounts } from '../contexts/AccountContext';
import type { TradingAccount, AccountStatus, FundedPhase } from '../contexts/AccountContext';
import { useAccountCosts } from '../hooks/useAccountCosts';
import type { AccountCostData } from '../hooks/useAccountCosts';
import {
  Plus, Wallet, TrendingUp, TrendingDown, BarChart2,
  Pencil, ChevronRight, AlertCircle, BadgeDollarSign, CheckCircle2
} from 'lucide-react';

// ─── helpers ────────────────────────────────────────────────────────────────

const fmt = (n: number, currency = 'USD') =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);

const fmtUSD = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

const pct = (pnl: number, initial: number) => {
  if (!initial) return null;
  return ((pnl / initial) * 100).toFixed(2);
};

const statusBadge: Record<AccountStatus, { label: string; tag: string }> = {
  activa:   { label: 'Activa',   tag: 'tag tag-win' },
  pausada:  { label: 'Pausada',  tag: 'tag tag-warn' },
  quemada:  { label: 'Quemada',  tag: 'tag tag-loss' },
  pasada:   { label: 'Pasada ✓', tag: 'tag tag-info' },
};

const phaseBadge: Record<NonNullable<FundedPhase>, { label: string; tag: string }> = {
  fase_1:    { label: 'Fase 1',    tag: 'tag tag-warn' },
  fase_2:    { label: 'Fase 2',    tag: 'tag tag-info' },
  verificada: { label: 'Verificada', tag: 'tag tag-win' },
};

// ─── Global Stats Banner ─────────────────────────────────────────────────────

const GlobalStatsBanner: React.FC = () => {
  const { globalStats, accounts } = useAccounts();
  const { totalInitialBalance, totalCurrentBalance, totalPnl, totalWins, totalLosses, totalTrades } = globalStats;
  const winRate = totalTrades > 0 ? ((totalWins / (totalWins + totalLosses)) * 100).toFixed(1) : null;
  const isPositive = totalPnl >= 0;

  return (
    <div className="stat-card mb-6">
      <div className="sc-top mb-5">
        <span className="tag tag-solid" style={{ width: 8, height: 8, padding: 0, minWidth: 8 }} />
        <span className="sc-lbl">Rendimiento global — {accounts.length} cuenta{accounts.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="stat-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Stat label="Capital inicial" value={fmt(totalInitialBalance)} />
        <Stat label="Capital actual" value={fmt(totalCurrentBalance)} highlight />
        <Stat
          label="P&L total"
          value={`${isPositive ? '+' : ''}${fmt(totalPnl)}`}
          accent={isPositive}
          negative={!isPositive}
          sub={totalInitialBalance ? `${isPositive ? '+' : ''}${pct(totalPnl, totalInitialBalance)}%` : undefined}
        />
        <Stat label="Operaciones" value={String(totalTrades)} sub={`${totalWins}G / ${totalLosses}P`} />
        <Stat label="Win Rate" value={winRate ? `${winRate}%` : '—'} accent={!!winRate && parseFloat(winRate) >= 50} negative={!!winRate && parseFloat(winRate) < 50} />
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string; sub?: string; accent?: boolean; negative?: boolean; highlight?: boolean }> = ({
  label, value, sub, accent, negative, highlight
}) => (
  <div className={`mini-stat ${highlight ? 'border-acc-soft' : ''}`}>
    <div className="sc-lbl">{label}</div>
    <div className={`sc-val ${highlight || accent ? 'accent' : negative ? 'negative' : ''}`} title={value}>{value}</div>
    {sub && <div className="sc-sub">{sub}</div>}
  </div>
);

// ─── Cost & Recovery Section ──────────────────────────────────────────────────

const CostRecoverySection: React.FC<{
  account: TradingAccount;
  costData: AccountCostData | undefined;
  onRegisterCost: () => void;
}> = ({ account, costData, onRegisterCost }) => {
  const pnl = account.total_pnl ?? 0;
  const withdrawn = account.total_withdrawn ?? 0;

  // No hay inversiones registradas → botón para registrar
  if (!costData || costData.totalCost === 0) {
    return (
      <div className="border-t border-[var(--line)] pt-3">
        <button
          onClick={onRegisterCost}
          className="btn btn-ghost btn-sm w-full"
        >
          <BadgeDollarSign className="w-3.5 h-3.5" />
          + Registrar costo de esta cuenta
        </button>
      </div>
    );
  }

  const totalCost = costData.totalCost;
  const recoveredPct = (pnl / totalCost) * 100;
  const isPaid = recoveredPct >= 100;
  const remaining = Math.max(totalCost - pnl, 0);
  const barWidth = Math.min(Math.max(recoveredPct, 0), 100);

  return (
    <div className="border-t border-[var(--line)] pt-3 space-y-2.5">
      <div className="sc-lbl">Costo y recuperación</div>

      <div className="fund-stats" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
        <div className="fund-card p-2.5">
          <div className="fs-t">Costo invertido</div>
          <div className="fs-v text-loss">{fmtUSD(totalCost)}</div>
        </div>
        <div className="fund-card p-2.5">
          <div className="fs-t">Ganancia generada</div>
          <div className={`fs-v ${pnl >= 0 ? 'text-acc' : 'text-loss'}`}>
            {pnl >= 0 ? '+' : ''}{fmtUSD(pnl)}
          </div>
        </div>
      </div>

      <div>
        <div className="fund-row">
          <span>% Recuperado</span>
          <b className={isPaid ? 'text-acc' : 'text-warn'}>{Math.max(recoveredPct, 0).toFixed(1)}%</b>
        </div>
        <div className={`bar ${isPaid ? '' : 'warn'}`}>
          <i style={{ width: `${barWidth}%` }} />
        </div>
      </div>

      {isPaid ? (
        <div className="tag tag-win flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          ✓ Cuenta pagada — inversión recuperada
        </div>
      ) : (
        <div className="sc-sub text-warn">
          Faltan <span className="font-semibold text-warn">{fmtUSD(remaining)}</span> para recuperar la inversión
        </div>
      )}

      {withdrawn > 0 && (
        <div className="sc-sub flex items-center gap-1.5">
          <BadgeDollarSign className="w-3 h-3 text-primary" />
          Retirado de esta cuenta: <span className="text-primary font-semibold">{fmtUSD(withdrawn)}</span>
        </div>
      )}
    </div>
  );
};

// ─── Account Card ─────────────────────────────────────────────────────────────

const AccountCard: React.FC<{
  account: TradingAccount;
  onEdit: (a: TradingAccount) => void;
  onViewTrades: (accountId: string) => void;
  costData: AccountCostData | undefined;
  onRegisterCost: (accountId: string) => void;
}> = ({ account, onEdit, onViewTrades, costData, onRegisterCost }) => {
  const badge = statusBadge[account.status];
  const pnl = account.total_pnl ?? 0;
  const isPositive = pnl >= 0;
  const p = pct(pnl, account.initial_balance ?? 0);

  return (
    <div className="fund-card flex flex-col gap-4 group">
      <div className="fund-head">
        <div className="min-w-0">
          <div className="fund-name truncate">{account.name}</div>
          {account.broker_or_prop_firm && (
            <div className="fund-sub truncate">{account.broker_or_prop_firm}</div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={badge.tag}>{badge.label}</span>
          <button
            onClick={() => onEdit(account)}
            className="btn-icon opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ width: 32, height: 32 }}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className={`tag ${account.account_type === 'fondeada' ? 'tag-info' : 'tag-neutral'}`}>
          {account.account_type === 'fondeada' ? 'Fondeada' : 'Personal'}
        </span>
        {account.account_type === 'fondeada' && account.funded_phase && (() => {
          const ph = phaseBadge[account.funded_phase];
          return <span className={ph.tag}>{ph.label}</span>;
        })()}
        <span className="sc-sub">{account.currency}</span>
      </div>

      <div className="fund-stats" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
        <div>
          <div className="fs-t">Balance inicial</div>
          <div className="fs-v">
            {account.initial_balance != null ? fmt(account.initial_balance, account.currency) : '—'}
          </div>
        </div>
        <div>
          <div className="fs-t">Balance actual</div>
          <div className="fs-v">
            {account.current_balance != null ? fmt(account.current_balance, account.currency) : '—'}
          </div>
        </div>
      </div>

      {account.initial_balance != null && (
        <div>
          <div className="fund-row">
            <div className="flex items-center gap-1.5">
              {isPositive
                ? <TrendingUp className="w-3.5 h-3.5 text-acc" />
                : <TrendingDown className="w-3.5 h-3.5 text-loss" />
              }
              <span className={isPositive ? 'text-acc' : 'text-loss'}>
                {isPositive ? '+' : ''}{fmt(pnl, account.currency)}
              </span>
              {p && <span className="sc-sub">({isPositive ? '+' : ''}{p}%)</span>}
            </div>
            <span className="sc-sub flex items-center gap-1">
              <BarChart2 className="w-3 h-3" />
              {account.trade_count ?? 0} ops · {account.total_wins ?? 0}G/{account.total_losses ?? 0}P
            </span>
          </div>
          <div className="ratio-bar">
            <i className={isPositive ? 'w' : 'l'} style={{ width: `${Math.min(Math.abs(parseFloat(p ?? '0')), 100)}%` }} />
          </div>
        </div>
      )}

      {/* Cost & Recovery — solo para cuentas fondeadas */}
      {account.account_type === 'fondeada' && (
        <CostRecoverySection
          account={account}
          costData={costData}
          onRegisterCost={() => onRegisterCost(account.id)}
        />
      )}

      {/* Footer: go to trades */}
      <button
        type="button"
        onClick={() => onViewTrades(account.id)}
        className="btn btn-ghost btn-sm w-full justify-between pt-1 border-t border-[var(--line)] group/btn"
      >
        <span>Ver operaciones de esta cuenta</span>
        <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
      </button>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const AccountsPage: React.FC = () => {
  const { accounts, isLoading, refresh, setSelectedAccountId } = useAccounts();
  const { costByAccount } = useAccountCosts();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<TradingAccount | null>(null);
  const [filterStatus, setFilterStatus] = useState<AccountStatus | 'todas'>('todas');

  const openNew = () => { setEditingAccount(null); setShowForm(true); };
  const openEdit = (a: TradingAccount) => { setEditingAccount(a); setShowForm(true); };
  const handleSaved = () => { refresh(); };

  const handleRegisterCost = (accountId: string) => {
    navigate(`/funding?account=${accountId}`);
  };

  const handleViewTrades = (accountId: string) => {
    setSelectedAccountId(accountId);
    navigate('/trades');
  };

  const filtered = filterStatus === 'todas'
    ? accounts
    : accounts.filter(a => a.status === filterStatus);

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title flex items-center gap-2.5">
            <Wallet className="w-6 h-6 text-primary" />
            Mis Cuentas
          </h1>
          <p className="page-sub mt-1">Gestioná y monitoreá todas tus cuentas de trading.</p>
        </div>

        <button
          id="accounts-new"
          onClick={openNew}
          className="btn btn-primary btn-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nueva cuenta
        </button>
      </div>

      {/* Global stats */}
      {accounts.length > 0 && <GlobalStatsBanner />}

      {/* Filter tabs */}
      {accounts.length > 0 && (
        <div className="seg mb-5 overflow-x-auto">
          {(['todas', 'activa', 'pausada', 'quemada', 'pasada'] as const).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setFilterStatus(s)}
              className={filterStatus === s ? 'on-acc' : ''}
            >
              {s === 'todas' ? 'Todas' : statusBadge[s as AccountStatus].label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <span className="spinner" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="panel-card border-dashed flex flex-col items-center justify-center py-20 gap-4">
          <div className="brand-mark opacity-60">
            <Wallet className="w-8 h-8" />
          </div>
          <div className="text-center">
            <p className="page-title mb-1">Todavía no tenés cuentas</p>
            <p className="page-sub">Creá tu primera cuenta para empezar a registrar operaciones.</p>
          </div>
          <button
            onClick={openNew}
            className="btn btn-primary btn-sm"
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
              onViewTrades={handleViewTrades}
              costData={costByAccount.get(acc.id)}
              onRegisterCost={handleRegisterCost}
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
