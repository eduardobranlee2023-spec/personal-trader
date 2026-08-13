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
import { useTheme } from '../contexts/ThemeContext';
import { useAccountCosts } from '../hooks/useAccountCosts';
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

const COLORS = ['var(--blu)', 'var(--acc)', 'var(--amb)', 'var(--red)', '#8B5CF6', '#EC4899', '#06B6D4'];

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatCard: React.FC<{ label: string; value: string; sub?: string; accent?: boolean; negative?: boolean; icon?: React.ReactNode }> = ({
  label, value, sub, accent, negative, icon
}) => (
  <div className="stat-card">
    {icon && <div className="sc-top">{icon}</div>}
    <div className="sc-lbl">{label}</div>
    <div className={`sc-val ${accent ? 'accent' : negative ? 'negative' : ''}`}>{value}</div>
    {sub && <div className="sc-sub">{sub}</div>}
  </div>
);

const TradeChip: React.FC<{ label: string; trade: Trade | null }> = ({ label, trade }) => {
  if (!trade) return (
    <div className="stat-card">
      <div className="sc-lbl mb-2">{label}</div>
      <div className="sc-sub">Sin datos</div>
    </div>
  );
  const pos = (trade.result_amount ?? 0) > 0;
  return (
    <div className="stat-card">
      <div className="sc-lbl mb-2">{label}</div>
      <div className="fund-name">{trade.asset}</div>
      <div className={`sc-val ${pos ? 'accent' : 'negative'} mt-1`}>
        {pos ? '+' : ''}{fmtUSD(trade.result_amount ?? 0)}
      </div>
      <div className="sc-sub">
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
    <div className="stat-card">
      <div className="sc-lbl mb-1">{label}</div>
      <div className={`sc-val ${isPos ? 'accent' : 'negative'} flex items-center gap-2`}>
        {isPos ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
        {fmtUSD(current)}
        {pct && <span className="sc-sub">({isPos ? '+' : ''}{pct}% vs anterior)</span>}
      </div>
      <div className="mt-3 h-24">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barSize={32}>
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 8 }}
              formatter={(v) => [fmtUSD(Number(v ?? 0)), 'P&L']}
            />
            <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.pnl >= 0 ? 'var(--acc)' : 'var(--red)'} />
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
    <div className="chart-box p-5">
      <div className="chart-head"><span className="ch-t"><b>{title}</b></span></div>
      <div className="sc-sub py-4 text-center">Sin datos</div>
    </div>
  );
  return (
    <div className="chart-box">
      <div className="chart-head"><span className="ch-t"><b>{title}</b></span></div>
      <div className="p-5">
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 32 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" width={80} tick={{ fill: 'var(--mut2)', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 8 }}
              formatter={(v: any, name: any) => [
                name === 'trades' ? `${v} ops` : name === 'winRate' ? `${v}%` : fmtUSD(Number(v ?? 0)),
                name === 'trades' ? 'Operaciones' : name === 'winRate' ? 'Win Rate' : 'P&L'
              ]}
            />
            <Bar dataKey="trades" fill="var(--acc)" radius={[0, 4, 4, 0]}>
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
              <span className={d.winRate >= 50 ? 'text-acc' : 'text-loss'}>{d.winRate}% WR</span>
              <span className={d.pnl >= 0 ? 'text-acc' : 'text-loss'}>{fmtUSD(d.pnl)}</span>
            </div>
          </div>
        ))}
      </div>
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
    <div className="panel-card rounded-xl p-3 text-xs">
      <div className="sc-sub mb-1">{label}</div>
      <div className="sc-val">{fmtUSD(bal)}</div>
      {pnl != null && (
        <div className={`sc-sub ${pnl >= 0 ? 'text-acc' : 'text-loss'}`}>
          {pnl >= 0 ? '+' : ''}{fmtUSD(pnl)} ese día
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const StatsPage: React.FC = () => {
  const { accounts, selectedAccountId } = useAccounts();
  const { costByAccount } = useAccountCosts();
  const [period, setPeriod] = useState<Period>('1M');
  const [strategyFilter, setStrategyFilter] = useState('');

  const { trades, isLoading } = useTrades({
    accountId: selectedAccountId,
    strategyId: strategyFilter || undefined,
  });
  const { strategies } = useStrategies();

  const { preferences } = useTheme();
  const accent = preferences.accent_color;
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
          <h1 className="page-title flex items-center gap-2.5">
            <BarChart2 className="w-6 h-6 text-primary" /> Estadísticas
          </h1>
          <p className="page-sub mt-2 flex items-center gap-3">
            {stats.periodTrades.length} operaciones en el período seleccionado
            <span className={`tag ${isPos ? 'tag-win' : 'tag-loss'}`}>
              {isPos ? 'RENTABLE' : 'NO RENTABLE'}
            </span>
          </p>
        </div>

        <div className="seg">
          {PERIODS.map(p => (
            <button key={p} type="button" onClick={() => setPeriod(p)}
              className={period === p ? 'on-acc' : ''}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        <div className="field">
          <select value={strategyFilter} onChange={e => setStrategyFilter(e.target.value)} className="input">
            <option value="">Todas las estrategias</option>
            {strategies.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {stats.periodTrades.length === 0 ? (
        <div className="panel-card border-dashed flex flex-col items-center justify-center py-24 gap-3 text-textMuted">
          <BarChart2 className="w-10 h-10 opacity-30" />
          <p className="text-sm">Sin operaciones en este período. Probá con un rango más amplio.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── Row 1: Key metrics ─────────────────────────────────────────── */}
          <div className="stat-grid grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="P&L del período"
              value={`${isPos ? '+' : ''}${fmtUSD(stats.totalPnl)}`}
              sub={`${fmtPct(stats.totalPnlPct)} del capital`}
              accent={isPos}
              negative={!isPos}
              icon={isPos ? <TrendingUp className="w-5 h-5 text-acc" /> : <TrendingDown className="w-5 h-5 text-loss" />}
            />
            <StatCard
              label="Win Rate"
              value={`${stats.winRate}%`}
              sub={`${stats.totalWins}G · ${stats.totalLosses}P · ${stats.totalBreakeven}BE`}
              accent={stats.winRate >= 50}
              negative={stats.winRate < 50}
              icon={<Target className="w-5 h-5" />}
            />
            <StatCard
              label="RR Promedio"
              value={stats.avgRR ? `1:${stats.avgRR.toFixed(2)}` : '—'}
              sub={stats.avgRRWins ? `Ganadas: 1:${stats.avgRRWins.toFixed(2)}` : undefined}
              icon={<Zap className="w-5 h-5" />}
            />
            <div className="stat-card">
              <div className="sc-top">
                {stats.currentStreak.type === 'ganando'
                  ? <Flame className="w-5 h-5 text-acc" />
                  : stats.currentStreak.type === 'perdiendo'
                  ? <AlertTriangle className="w-5 h-5 text-loss" />
                  : <Zap className="w-5 h-5" />}
              </div>
              <div className="sc-lbl">Racha actual</div>
              <div className={`sc-val ${
                stats.currentStreak.type === 'ganando' ? 'accent' :
                stats.currentStreak.type === 'perdiendo' ? 'negative' : ''
              }`}>
                {stats.currentStreak.count > 0 ? `${stats.currentStreak.count} ${stats.currentStreak.type}` : '—'}
              </div>
              <div className="sc-sub capitalize">{stats.currentStreak.type}</div>
            </div>
          </div>

          <div className="chart-box">
            <div className="chart-head"><span className="ch-t"><b>Evolución del Balance</b></span></div>
            <div className="p-5 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.balancePoints} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={accent} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                  <XAxis dataKey="date" tick={{ fill: 'var(--mut2)', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: 'var(--mut2)', fontSize: 11 }} tickLine={false} axisLine={false}
                    tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<BalanceTooltip />} />
                  <Area type="monotone" dataKey="balance" stroke={accent} strokeWidth={2}
                    fill="url(#balGrad)" dot={false} activeDot={{ r: 4, fill: accent }} />
                  <Area type="monotone" dataKey="pnl" stroke="transparent" fill="transparent" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
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
              <div className="ptable-wrap">
                <table className="ptable">
                  <thead>
                    <tr>
                      <th>Cuenta</th>
                      <th>Broker</th>
                      <th>Trades</th>
                      <th>Win Rate</th>
                      <th>RR Prom.</th>
                      <th style={{ textAlign: 'right' }}>Costo</th>
                      <th style={{ textAlign: 'right' }}>Ganancia</th>
                      <th style={{ textAlign: 'right' }}>% Recuperado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.accountBreakdown
                      .filter(a => a.tradeCount > 0)
                      .sort((a, b) => b.pnl - a.pnl)
                      .map(({ account, pnl, winRate, avgRR, tradeCount }) => {
                        const isFunded = account.account_type === 'fondeada';
                        const costData = costByAccount.get(account.id);
                        const cost = costData?.totalCost ?? 0;
                        const hasCost = isFunded && cost > 0;
                        const recoveredPct = hasCost ? (pnl / cost) * 100 : null;
                        const isPaid = recoveredPct !== null && recoveredPct >= 100;
                        
                        return (
                          <tr key={account.id}>
                            <td className="sym">{account.name}</td>
                            <td>{account.broker_or_prop_firm || '—'}</td>
                            <td>{tradeCount}</td>
                            <td className={winRate >= 50 ? 'pos' : 'neg'}>
                              {winRate}%
                            </td>
                            <td>{avgRR ? `1:${avgRR.toFixed(2)}` : '—'}</td>
                            <td style={{ textAlign: 'right' }}>
                              {hasCost ? fmtUSD(cost) : '—'}
                            </td>
                            <td className={`${pnl >= 0 ? 'pos' : 'neg'}`} style={{ textAlign: 'right' }}>
                              {pnl >= 0 ? '+' : ''}{fmtUSD(pnl)}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              {recoveredPct !== null ? (
                                <span className={`tag ${isPaid ? 'tag-win' : 'tag-warn'}`}>
                                  {isPaid ? 'Pagada' : `${recoveredPct.toFixed(1)}%`}
                                </span>
                              ) : (
                                <span className="text-textMuted">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
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
