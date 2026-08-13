import React from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../contexts/AuthContext';
import { useAccounts, ALL_ACCOUNTS_ID } from '../contexts/AccountContext';
import { TrendingUp, TrendingDown, BarChart2, Wallet, BookOpen, CalendarDays, ArrowRight, BadgeDollarSign } from 'lucide-react';
import Reveal from '../components/ui/Reveal';

const fmt = (n: number, currency = 'USD') =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);

const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const { accounts, globalStats, selectedAccountId, selectedAccount } = useAccounts();
  const navigate = useNavigate();

  const isAll = selectedAccountId === ALL_ACCOUNTS_ID;
  const stats = isAll ? globalStats : {
    totalInitialBalance: selectedAccount?.initial_balance ?? 0,
    totalCurrentBalance: selectedAccount?.current_balance ?? 0,
    totalPnl: selectedAccount?.total_pnl ?? 0,
    totalWins: selectedAccount?.total_wins ?? 0,
    totalLosses: selectedAccount?.total_losses ?? 0,
    totalTrades: selectedAccount?.trade_count ?? 0,
    totalWithdrawals: selectedAccount?.total_withdrawn ?? 0,
    monthlyWithdrawals: (selectedAccount as { monthly_withdrawn?: number })?.monthly_withdrawn ?? 0,
  };

  const isPositive = stats.totalPnl >= 0;
  const winRate = (stats.totalWins + stats.totalLosses) > 0
    ? ((stats.totalWins / (stats.totalWins + stats.totalLosses)) * 100).toFixed(1)
    : null;
  const pctChange = stats.totalInitialBalance > 0
    ? ((stats.totalPnl / stats.totalInitialBalance) * 100).toFixed(2)
    : null;
  const winRateNum = winRate ? parseFloat(winRate) : 0;

  return (
    <AppLayout>
      <Reveal>
        <div className="mb-8">
          <h1 className="page-title">
            Hola, {profile?.full_name?.split(' ')[0] || 'Trader'} 👋
          </h1>
          <p className="page-sub flex items-center gap-3 flex-wrap">
            {isAll
              ? `Viendo todas las cuentas combinadas (${accounts.length})`
              : `Cuenta activa: ${selectedAccount?.name}`
            }
            <span className={isPositive ? 'tag tag-win' : 'tag tag-loss'}>
              {isPositive ? 'RENTABLE' : 'NO RENTABLE'}
            </span>
          </p>
        </div>
      </Reveal>

      <Reveal delay={80}>
        <div className="stat-grid grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
        <div className="stat-card col-span-2 lg:col-span-1">
          <div className="sc-top">
            <span className="sc-lbl">Capital actual</span>
          </div>
          <div className="sc-val accent">{fmt(stats.totalCurrentBalance)}</div>
          <div className="sc-sub">Inicial: {fmt(stats.totalInitialBalance)}</div>
        </div>

        <div className={`stat-card ${isPositive ? 'glow-green' : 'glow-red'}`}>
          <div className="sc-top">
            <span className="sc-lbl flex items-center gap-1">
              {isPositive ? <TrendingUp className="w-3.5 h-3.5 text-acc" /> : <TrendingDown className="w-3.5 h-3.5 text-loss" />}
              P&L total
            </span>
            {pctChange && (
              <span className={isPositive ? 'tag tag-win' : 'tag tag-loss'}>
                {isPositive ? '+' : ''}{pctChange}%
              </span>
            )}
          </div>
          <div className={`sc-val ${isPositive ? 'accent' : 'negative'}`}>
            {isPositive ? '+' : ''}{fmt(stats.totalPnl)}
          </div>
        </div>

        <div className="stat-card">
          <div className="sc-top">
            <span className="sc-lbl flex items-center gap-1">
              <BadgeDollarSign className="w-3.5 h-3.5" /> Retiros (Mes)
            </span>
          </div>
          <div className="sc-val accent">{fmt(stats.monthlyWithdrawals || 0)}</div>
          <div className="sc-sub">Total histórico: {fmt(stats.totalWithdrawals || 0)}</div>
        </div>

        <div className="stat-card">
          <div className="sc-top"><span className="sc-lbl">Operaciones</span></div>
          <div className="sc-val">{stats.totalTrades}</div>
          <div className="sc-sub">{stats.totalWins}G / {stats.totalLosses}P</div>
          {(stats.totalWins + stats.totalLosses) > 0 && (
            <div className="ratio-bar">
              <i className="w" style={{ width: `${(stats.totalWins / (stats.totalWins + stats.totalLosses)) * 100}%` }} />
              <i className="l" style={{ width: `${(stats.totalLosses / (stats.totalWins + stats.totalLosses)) * 100}%` }} />
            </div>
          )}
        </div>

        <div className="stat-card">
          <div className="sc-top"><span className="sc-lbl">Win Rate</span></div>
          <div className={`sc-val ${winRateNum >= 50 ? 'accent' : 'negative'}`}>
            {winRate ? `${winRate}%` : '—'}
          </div>
          <div className="sc-sub">Racha actual: —</div>
        </div>
        </div>
      </Reveal>

      <Reveal delay={160}>
        <h2 className="sc-lbl mb-4">Módulos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Wallet, label: 'Mis Cuentas', desc: `${accounts.length} cuenta${accounts.length !== 1 ? 's' : ''} registrada${accounts.length !== 1 ? 's' : ''}`, path: '/accounts' },
            { icon: BarChart2, label: 'Operaciones', desc: 'Registrá y revisá tus trades', path: '/trades' },
            { icon: BookOpen, label: 'Estrategias', desc: 'Tus setups y playbooks', path: '/strategies' },
            { icon: CalendarDays, label: 'Calendario', desc: 'Vista mensual de operativas', path: '/calendar' },
            { icon: BadgeDollarSign, label: 'Fondeos', desc: 'Inversiones en evaluaciones', path: '/funding' },
          ].map(({ icon: Icon, label, desc, path }, i) => (
            <Reveal key={path} delay={200 + i * 60}>
              <button
                onClick={() => navigate(path)}
                className="stat-card text-left group flex flex-col gap-3 cursor-pointer w-full h-full"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-xl border border-acc-soft bg-acc-soft transition group-hover:bg-primary/20">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-text text-sm mb-0.5">{label}</div>
                  <div className="text-xs text-textMuted">{desc}</div>
                </div>
                <div className="flex items-center gap-1 text-xs text-primary mt-auto">
                  Abrir <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            </Reveal>
          ))}
        </div>
      </Reveal>
    </AppLayout>
  );
};

export default Dashboard;
