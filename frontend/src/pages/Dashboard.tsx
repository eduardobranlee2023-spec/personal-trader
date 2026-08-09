import React from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../contexts/AuthContext';
import { useAccounts, ALL_ACCOUNTS_ID } from '../contexts/AccountContext';
import { TrendingUp, TrendingDown, BarChart2, Wallet, BookOpen, CalendarDays, ArrowRight, BadgeDollarSign } from 'lucide-react';

const fmt = (n: number, currency = 'USD') =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);

const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const { accounts, globalStats, selectedAccountId, selectedAccount } = useAccounts();
  const navigate = useNavigate();

  // Determine which stats to show
  const isAll = selectedAccountId === ALL_ACCOUNTS_ID;
  const stats = isAll ? globalStats : {
    totalInitialBalance: selectedAccount?.initial_balance ?? 0,
    totalCurrentBalance: selectedAccount?.current_balance ?? 0,
    totalPnl: selectedAccount?.total_pnl ?? 0,
    totalWins: selectedAccount?.total_wins ?? 0,
    totalLosses: selectedAccount?.total_losses ?? 0,
    totalTrades: selectedAccount?.trade_count ?? 0,
    totalWithdrawals: selectedAccount?.total_withdrawn ?? 0,
    monthlyWithdrawals: (selectedAccount as any)?.monthly_withdrawn ?? 0,
  };

  const isPositive = stats.totalPnl >= 0;
  const winRate = (stats.totalWins + stats.totalLosses) > 0
    ? ((stats.totalWins / (stats.totalWins + stats.totalLosses)) * 100).toFixed(1)
    : null;
  const pctChange = stats.totalInitialBalance > 0
    ? ((stats.totalPnl / stats.totalInitialBalance) * 100).toFixed(2)
    : null;

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text">
          Hola, {profile?.full_name?.split(' ')[0] || 'Trader'} 👋
        </h1>
        <p className="text-textMuted mt-2 text-sm flex items-center gap-3">
          {isAll
            ? `Viendo todas las cuentas combinadas (${accounts.length})`
            : `Cuenta activa: ${selectedAccount?.name}`
          }
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider ${
            isPositive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
          }`}>
            {isPositive ? 'RENTABLE' : 'NO RENTABLE'}
          </span>
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {/* Balance */}
        <div className="glass rounded-2xl border border-white/10 p-5 col-span-2 lg:col-span-1 card-hover">
          <div className="text-xs text-textMuted mb-2">Capital actual</div>
          <div className="text-2xl font-bold text-text font-mono">{fmt(stats.totalCurrentBalance)}</div>
          <div className="text-xs text-textMuted mt-1 font-mono">Inicial: {fmt(stats.totalInitialBalance)}</div>
        </div>

        {/* PnL */}
        <div className={`glass rounded-2xl border p-5 card-hover ${isPositive ? 'border-emerald-400/20 glow-green' : 'border-red-400/20 glow-red'}`}>
          <div className="text-xs text-textMuted mb-2 flex items-center gap-1">
            {isPositive ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> : <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
            P&L total
          </div>
          <div className={`text-2xl font-bold font-mono ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{fmt(stats.totalPnl)}
          </div>
          {pctChange && (
            <div className={`text-xs mt-1 font-mono ${isPositive ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
              {isPositive ? '+' : ''}{pctChange}%
            </div>
          )}
        </div>

        {/* Withdrawals */}
        <div className="glass rounded-2xl border border-white/10 p-5 card-hover">
          <div className="text-xs text-textMuted mb-2 flex items-center gap-1">
            <BadgeDollarSign className="w-3.5 h-3.5 text-primary" /> Retiros (Mes)
          </div>
          <div className="text-2xl font-bold text-primary font-mono">{fmt(stats.monthlyWithdrawals || 0)}</div>
          <div className="text-xs text-textMuted mt-1 font-mono">Total histórico: {fmt(stats.totalWithdrawals || 0)}</div>
        </div>

        {/* Trades */}
        <div className="glass rounded-2xl border border-white/10 p-5 card-hover">
          <div className="text-xs text-textMuted mb-2">Operaciones</div>
          <div className="text-2xl font-bold text-text font-mono">{stats.totalTrades}</div>
          <div className="text-xs text-textMuted mt-1 font-mono">{stats.totalWins}G / {stats.totalLosses}P</div>
        </div>

        {/* Win Rate */}
        <div className="glass rounded-2xl border border-white/10 p-5 card-hover">
          <div className="text-xs text-textMuted mb-2">Win Rate</div>
          <div className={`text-2xl font-bold font-mono ${winRate && parseFloat(winRate) >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
            {winRate ? `${winRate}%` : '—'}
          </div>
          <div className="text-xs text-textMuted mt-1">Racha actual: —</div>
        </div>
      </div>

      {/* Quick access modules */}
      <h2 className="text-base font-semibold text-textMuted mb-4">Módulos</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Wallet, label: 'Mis Cuentas', desc: `${accounts.length} cuenta${accounts.length !== 1 ? 's' : ''} registrada${accounts.length !== 1 ? 's' : ''}`, path: '/accounts', ready: true },
          { icon: BarChart2, label: 'Operaciones', desc: 'Registrá y revisá tus trades', path: '/trades', ready: true },
          { icon: BookOpen, label: 'Estrategias', desc: 'Tus setups y playbooks', path: '/strategies', ready: true },
          { icon: CalendarDays, label: 'Calendario', desc: 'Vista mensual de operativas', path: '/calendar', ready: true },
          { icon: BadgeDollarSign, label: 'Fondeos', desc: 'Inversiones en evaluaciones', path: '/funding', ready: true },
        ].map(({ icon: Icon, label, desc, path, ready }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            disabled={!ready}
            className={`glass rounded-2xl border p-5 text-left transition-all duration-200 group flex flex-col gap-3 ${
              ready
                ? 'border-white/10 hover:border-primary/30 cursor-pointer'
                : 'border-white/5 opacity-50 cursor-not-allowed'
            }`}
          >
            <div className={`flex items-center justify-center w-10 h-10 rounded-xl border transition ${
              ready
                ? 'bg-primary/10 border-primary/20 group-hover:bg-primary/20'
                : 'bg-white/5 border-white/10'
            }`}>
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="font-semibold text-text text-sm mb-0.5">{label}</div>
              <div className="text-xs text-textMuted">{desc}</div>
            </div>
            {ready ? (
              <div className="flex items-center gap-1 text-xs text-primary mt-auto">
                Abrir <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            ) : (
              <div className="text-xs text-textMuted italic mt-auto">Próximamente</div>
            )}
          </button>
        ))}
      </div>
    </AppLayout>
  );
};

export default Dashboard;
