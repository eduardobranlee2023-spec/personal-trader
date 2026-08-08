import React, { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell
} from 'recharts';
import AppLayout from '../components/layout/AppLayout';
import { useTrades, useStrategies } from '../hooks/useTrades';

import type { Period } from '../hooks/useStats';
import { useStats } from '../hooks/useStats';
import { useAccounts, ALL_ACCOUNTS_ID } from '../contexts/AccountContext';
import type { Trade } from '../hooks/useTrades';
import {
  TrendingUp, TrendingDown, Flame, AlertTriangle,
  BarChart2, Target, Zap, ArrowUpRight, ArrowDownRight
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtUSD = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

const fmtPct = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;

const PERIODS: Period[] = ['1W', '1M', '3M', '1Y', 'ALL'];
const PERIOD_LABELS: Record<Period, string> = { '1W': '1 Sem', '1M': '1 Mes', '3M': '3 Meses', '1Y': '1 Año', 'ALL': 'Todo' };

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatCard: React.FC<{ label: string; value: string; sub?: string; color?: string; icon?: React.ReactNode }> = ({
  label, value, sub, color = 'text-text', icon
}) => (
  <div className="glass rounded-2xl border border-white/10 p-5">
    {icon && <div className="mb-3 opacity-60">{icon}</div>}
    <div className="text-xs text-textMuted mb-1">{label}</div>
    <div className={`text-2xl font-bold ${color}`}>{value}</div>
    {sub && <div className="text-xs text-textMuted mt-1">{sub}</div>}
  </div>
);

const TradeChip: React.FC<{ label: string; trade: Trade | null }> = ({ label, trade }) => {
  if (!trade) return (
    <div className="glass rounded-2xl border border-white/10 p-5">
      <div className="text-xs text-textMuted mb-2">{label}</div>
      <div className="text-textMuted text-sm">Sin datos</div>
    </div>
  );
  const pos = (trade.result_amount ?? 0) > 0;
  return (
    <div className={`glass rounded-2xl border p-5 ${pos ? 'border-accent/20' : 'border-red-400/20'}`}>
      <div className="text-xs text-textMuted mb-2">{label}</div>
      <div className="font-bold text-text text-base">{trade.asset}</div>
      <div className={`text-lg font-bold mt-1 ${pos ? 'text-accent' : 'text-red-400'}`}>
        {pos ? '+' : ''}{fmtUSD(trade.result_amount ?? 0)}
      </div>
      <div className="text-xs text-textMuted mt-1">
        {trade.direction} · {trade.timeframe} · {trade.session} · {trade.trade_date}
      </div>
    </div>
  );
};

const PeriodCompare: React.FC<{ label: string; current: number; prev: number }> = ({ label, current, prev }) => {
  const diff = current - prev;
  const isPos = diff >= 0;
  const pct = prev !== 0 ? ((diff / Math.abs(prev)) * 100).toFixed(1) : null;
  const data = [
    { name: 'Anterior', pnl: prev },
    { name: 'Actual', pnl: current },
  ];
  return (
    <div className="glass rounded-2xl border border-white/10 p-5">
      <div className="text-xs text-textMuted mb-1">{label}</div>
      <div className={`text-xl font-bold ${isPos ? 'text-accent' : 'text-red-400'} flex items-center gap-2`}>
        {isPos ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
        {fmtUSD(current)}
        {pct && <span className="text-sm font-medium">({isPos ? '+' : ''}{pct}% vs anterior)</span>}
      </div>
      <div className="mt-3 h-24">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barSize={32}>
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
              formatter={(v: any) => [fmtUSD(Number(v ?? 0)), 'P&L']}
            />
            <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.pnl >= 0 ? '#10B981' : '#EF4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const DistChart: React.FC<{ title: string; data: { name: string; trades: number; winRate: number; pnl: number }[] }> = ({ title, data }) => {
  if (data.length === 0) return (
    <div className="glass rounded-2xl border border-white/10 p-5">
      <div className="text-sm font-semibold text-text mb-4">{title}</div>
      <div className="text-textMuted text-xs py-4 text-center">Sin datos</div>
    </div>
  );
  return (
    <div className="glass rounded-2xl border border-white/10 p-5">
      <div className="text-sm font-semibold text-text mb-4">{title}</div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 32 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" width={80} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
              formatter={(v: any, name: any) => [
                name === 'trades' ? `${v} ops` : name === 'winRate' ? `${v}%` : fmtUSD(Number(v ?? 0)),
                name === 'trades' ? 'Operaciones' : name === 'winRate' ? 'Win Rate' : 'P&L'
              ]}
            />
            <Bar dataKey="trades" fill="#3B82F6" radius={[0, 4, 4, 0]}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Win rate legend */}
      <div className="mt-3 space-y-1">
        {data.slice(0, 5).map((d, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="text-textMuted truncate max-w-[100px]">{d.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className={d.winRate >= 50 ? 'text-accent' : 'text-red-400'}>{d.winRate}% WR</span>
              <span className={d.pnl >= 0 ? 'text-accent' : 'text-red-400'}>{fmtUSD(d.pnl)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Custom Tooltip for Area Chart ───────────────────────────────────────────

const BalanceTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const bal = payload[0]?.value;
  const pnl = payload[1]?.value;
  return (
    <div className="glass rounded-xl border border-white/10 p-3 text-xs">
      <div className="text-textMuted mb-1">{label}</div>
      <div className="font-bold text-text">{fmtUSD(bal)}</div>
      {pnl != null && (
        <div className={`mt-0.5 ${pnl >= 0 ? 'text-accent' : 'text-red-400'}`}>
          {pnl >= 0 ? '+' : ''}{fmtUSD(pnl)} ese día
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const StatsPage: React.FC = () => {
  const { accounts, selectedAccountId } = useAccounts();
  const [period, setPeriod] = useState<Period>('1M');
  const [strategyFilter, setStrategyFilter] = useState('');

  const { trades, isLoading } = useTrades({
    accountId: selectedAccountId,
    strategyId: strategyFilter || undefined,
  });
  const { strategies } = useStrategies();

  const stats = useStats(trades, accounts, selectedAccountId, period, ALL_ACCOUNTS_ID);
  const isAll = selectedAccountId === ALL_ACCOUNTS_ID;
  const isPos = stats.totalPnl >= 0;

  if (isLoading) return (
    <AppLayout>
      <div className="flex items-center justify-center py-32 text-textMuted">
        Cargando estadísticas...
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text flex items-center gap-2.5">
            <BarChart2 className="w-6 h-6 text-primary" /> Estadísticas
          </h1>
          <p className="text-textMuted text-sm mt-1">
            {stats.periodTrades.length} operaciones en el período seleccionado
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center glass rounded-xl border border-white/10 p-1 gap-0.5">
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${period === p ? 'bg-primary text-white' : 'text-textMuted hover:text-text'}`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        {/* Strategy Selector */}
        <div className="flex items-center glass rounded-xl border border-white/10 p-1 gap-0.5 ml-2">
          <select value={strategyFilter} onChange={e => setStrategyFilter(e.target.value)}
            className="bg-white/5 border border-white/10 text-text rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/60">
            <option value="">Todas las estrategias</option>
            {strategies.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {stats.periodTrades.length === 0 ? (
        <div className="glass rounded-2xl border border-white/10 border-dashed flex flex-col items-center justify-center py-24 gap-3 text-textMuted">
          <BarChart2 className="w-10 h-10 opacity-30" />
          <p className="text-sm">Sin operaciones en este período. Probá con un rango más amplio.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── Row 1: Key metrics ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="P&L del período"
              value={`${isPos ? '+' : ''}${fmtUSD(stats.totalPnl)}`}
              sub={`${fmtPct(stats.totalPnlPct)} del capital`}
              color={isPos ? 'text-accent' : 'text-red-400'}
              icon={isPos ? <TrendingUp className="w-5 h-5 text-accent" /> : <TrendingDown className="w-5 h-5 text-red-400" />}
            />
            <StatCard
              label="Win Rate"
              value={`${stats.winRate}%`}
              sub={`${stats.totalWins}G · ${stats.totalLosses}P · ${stats.totalBreakeven}BE`}
              color={stats.winRate >= 50 ? 'text-accent' : 'text-red-400'}
              icon={<Target className="w-5 h-5" />}
            />
            <StatCard
              label="RR Promedio"
              value={stats.avgRR ? `1:${stats.avgRR.toFixed(2)}` : '—'}
              sub={stats.avgRRWins ? `Ganadas: 1:${stats.avgRRWins.toFixed(2)}` : undefined}
              icon={<Zap className="w-5 h-5" />}
            />
            <div className={`glass rounded-2xl border p-5 ${
              stats.currentStreak.type === 'ganando' ? 'border-accent/20' :
              stats.currentStreak.type === 'perdiendo' ? 'border-red-400/20' : 'border-white/10'
            }`}>
              <div className="mb-3 opacity-60">
                {stats.currentStreak.type === 'ganando'
                  ? <Flame className="w-5 h-5 text-accent" />
                  : stats.currentStreak.type === 'perdiendo'
                  ? <AlertTriangle className="w-5 h-5 text-red-400" />
                  : <Zap className="w-5 h-5" />}
              </div>
              <div className="text-xs text-textMuted mb-1">Racha actual</div>
              <div className={`text-2xl font-bold ${
                stats.currentStreak.type === 'ganando' ? 'text-accent' :
                stats.currentStreak.type === 'perdiendo' ? 'text-red-400' : 'text-text'
              }`}>
                {stats.currentStreak.count > 0 ? `${stats.currentStreak.count} ${stats.currentStreak.type}` : '—'}
              </div>
              <div className="text-xs text-textMuted mt-1 capitalize">{stats.currentStreak.type}</div>
            </div>
          </div>

          {/* ── Balance Evolution Chart ────────────────────────────────────── */}
          <div className="glass rounded-2xl border border-white/10 p-5">
            <div className="text-sm font-semibold text-text mb-4">Evolución del Balance</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.balancePoints} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} axisLine={false}
                    tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<BalanceTooltip />} />
                  <Area type="monotone" dataKey="balance" stroke="#3B82F6" strokeWidth={2}
                    fill="url(#balGrad)" dot={false} activeDot={{ r: 4, fill: '#3B82F6' }} />
                  <Area type="monotone" dataKey="pnl" stroke="transparent" fill="transparent" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Best / Worst + Comparisons ─────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <TradeChip label="🏆 Mejor operativa" trade={stats.bestTrade} />
            <TradeChip label="💔 Peor operativa" trade={stats.worstTrade} />
            <PeriodCompare label="Esta semana vs anterior" current={stats.currentWeekPnl} prev={stats.prevWeekPnl} />
            <PeriodCompare label="Este año vs anterior" current={stats.currentYearPnl} prev={stats.prevYearPnl} />
          </div>

          {/* ── Distributions ─────────────────────────────────────────────── */}
          <div>
            <h2 className="text-sm font-semibold text-textMuted uppercase mb-4">¿En qué contexto rendís mejor?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              <DistChart title="Por Activo" data={stats.byAsset} />
              <DistChart title="Por Sesión" data={stats.bySession} />
              <DistChart title="Por Temporalidad" data={stats.byTimeframe} />
              <DistChart title="Por Zona / Setup" data={stats.byZone} />
              <DistChart title="Por Estrategia" data={stats.byStrategy} />
            </div>
          </div>

          {/* ── Account Breakdown (only when All selected) ─────────────────── */}
          {isAll && stats.accountBreakdown.some(a => a.tradeCount > 0) && (
            <div>
              <h2 className="text-sm font-semibold text-textMuted uppercase mb-4">Comparativo por Cuenta</h2>
              <div className="glass rounded-2xl border border-white/10 overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/10 text-xs text-textMuted bg-white/2">
                      <th className="p-4 font-medium">Cuenta</th>
                      <th className="p-4 font-medium">Broker</th>
                      <th className="p-4 font-medium">Trades</th>
                      <th className="p-4 font-medium">P&L</th>
                      <th className="p-4 font-medium">Win Rate</th>
                      <th className="p-4 font-medium">RR Prom.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {stats.accountBreakdown
                      .filter(a => a.tradeCount > 0)
                      .sort((a, b) => b.pnl - a.pnl)
                      .map(({ account, pnl, winRate, avgRR, tradeCount }) => (
                        <tr key={account.id} className="hover:bg-white/3 transition text-sm">
                          <td className="p-4 font-medium text-text">{account.name}</td>
                          <td className="p-4 text-textMuted">{account.broker_or_prop_firm || '—'}</td>
                          <td className="p-4 text-text">{tradeCount}</td>
                          <td className={`p-4 font-semibold ${pnl >= 0 ? 'text-accent' : 'text-red-400'}`}>
                            {pnl >= 0 ? '+' : ''}{fmtUSD(pnl)}
                          </td>
                          <td className={`p-4 font-semibold ${winRate >= 50 ? 'text-accent' : 'text-red-400'}`}>
                            {winRate}%
                          </td>
                          <td className="p-4 text-text">{avgRR ? `1:${avgRR.toFixed(2)}` : '—'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
};

export default StatsPage;
