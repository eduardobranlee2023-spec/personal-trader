import { useMemo } from 'react';
import type { Trade } from './useTrades';
import type { TradingAccount } from '../contexts/AccountContext';

// ─── Types ───────────────────────────────────────────────────────────────────

export type Period = '1W' | '1M' | '3M' | '1Y' | 'ALL';

export interface BalancePoint { date: string; balance: number; pnl: number; }

export interface DistributionItem { name: string; trades: number; wins: number; losses: number; pnl: number; winRate: number; }

export interface StatsResult {
  // Period trades
  periodTrades: Trade[];
  allTrades: Trade[];
  // Balance evolution
  balancePoints: BalancePoint[];
  // Summary
  totalPnl: number;
  totalPnlPct: number;
  winRate: number;
  totalWins: number;
  totalLosses: number;
  totalBreakeven: number;
  // RR
  avgRR: number | null;
  avgRRWins: number | null;
  // Best / worst
  bestTrade: Trade | null;
  worstTrade: Trade | null;
  // Streak
  currentStreak: { type: 'ganando' | 'perdiendo' | 'neutro'; count: number };
  // Period comparison
  currentMonthPnl: number;
  prevMonthPnl: number;
  currentQuarterPnl: number;
  prevQuarterPnl: number;
  // Distributions
  byAsset: DistributionItem[];
  bySession: DistributionItem[];
  byTimeframe: DistributionItem[];
  byZone: DistributionItem[];
  byStrategy: DistributionItem[];
  // Account comparison
  accountBreakdown: { account: TradingAccount; pnl: number; winRate: number; avgRR: number | null; tradeCount: number }[];
  // Period comparisons (week/year)
  currentWeekPnl: number;
  prevWeekPnl: number;
  currentYearPnl: number;
  prevYearPnl: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const parseRR = (rr: string | null): number | null => {
  if (!rr) return null;
  const parts = rr.split(':');
  if (parts.length !== 2) return null;
  const val = parseFloat(parts[1]);
  return isNaN(val) ? null : val;
};

const getStartDate = (period: Period): Date => {
  const now = new Date();
  switch (period) {
    case '1W': return new Date(now.setDate(now.getDate() - 7));
    case '1M': return new Date(new Date().setMonth(new Date().getMonth() - 1));
    case '3M': return new Date(new Date().setMonth(new Date().getMonth() - 3));
    case '1Y': return new Date(new Date().setFullYear(new Date().getFullYear() - 1));
    case 'ALL': return new Date('2000-01-01');
  }
};

const buildDistribution = (trades: Trade[], keyFn: (t: Trade) => string | null): DistributionItem[] => {
  const map = new Map<string, { trades: number; wins: number; losses: number; pnl: number }>();
  for (const t of trades) {
    const key = keyFn(t) || '(sin dato)';
    if (!map.has(key)) map.set(key, { trades: 0, wins: 0, losses: 0, pnl: 0 });
    const entry = map.get(key)!;
    entry.trades++;
    entry.pnl += t.result_amount ?? 0;
    if (t.status === 'ganada') entry.wins++;
    else if (t.status === 'perdida') entry.losses++;
  }
  return Array.from(map.entries())
    .map(([name, v]) => ({ name, ...v, winRate: v.trades > 0 ? Math.round((v.wins / v.trades) * 100) : 0 }))
    .sort((a, b) => b.trades - a.trades)
    .slice(0, 10);
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useStats(
  trades: Trade[],
  accounts: TradingAccount[],
  selectedAccountId: string,
  period: Period,
  ALL_ACCOUNTS_ID: string
): StatsResult {
  return useMemo(() => {
    const isAll = selectedAccountId === ALL_ACCOUNTS_ID;
    const startDate = getStartDate(period);
    const startStr = startDate.toISOString().split('T')[0];

    // Period filter
    const periodTrades = trades.filter(t => t.trade_date >= startStr);

    // ── Balance evolution ────────────────────────────────────────────────────
    const initialBalance = isAll
      ? accounts.reduce((s, a) => s + (a.initial_balance ?? 0), 0)
      : accounts.find(a => a.id === selectedAccountId)?.initial_balance ?? 0;

    const sorted = [...trades].sort((a, b) => a.trade_date.localeCompare(b.trade_date));
    let running = initialBalance;
    const balancePoints: BalancePoint[] = [{ date: 'Inicio', balance: initialBalance, pnl: 0 }];
    
    for (const t of sorted) {
      if (period !== 'ALL' && t.trade_date < startStr) {
        // Still apply to running balance but don't add point
        running += t.result_amount ?? 0;
        continue;
      }
      running += t.result_amount ?? 0;
      const last = balancePoints[balancePoints.length - 1];
      // Merge same-date points
      if (last && last.date === t.trade_date) {
        last.balance = running;
        last.pnl += t.result_amount ?? 0;
      } else {
        balancePoints.push({ date: t.trade_date, balance: running, pnl: t.result_amount ?? 0 });
      }
    }

    // ── Period stats ─────────────────────────────────────────────────────────
    const totalPnl = periodTrades.reduce((s, t) => s + (t.result_amount ?? 0), 0);
    const totalPnlPct = initialBalance > 0 ? (totalPnl / initialBalance) * 100 : 0;
    const wins = periodTrades.filter(t => t.status === 'ganada');
    const losses = periodTrades.filter(t => t.status === 'perdida');
    const resolved = periodTrades.filter(t => t.status === 'ganada' || t.status === 'perdida');
    const winRate = resolved.length > 0 ? Math.round((wins.length / resolved.length) * 100) : 0;

    // ── RR ──────────────────────────────────────────────────────────────────
    const rrs = periodTrades.map(t => parseRR(t.risk_reward)).filter(v => v !== null) as number[];
    const rrWins = wins.map(t => parseRR(t.risk_reward)).filter(v => v !== null) as number[];
    const avgRR = rrs.length > 0 ? rrs.reduce((s, v) => s + v, 0) / rrs.length : null;
    const avgRRWins = rrWins.length > 0 ? rrWins.reduce((s, v) => s + v, 0) / rrWins.length : null;

    // ── Best / Worst ─────────────────────────────────────────────────────────
    const withResult = periodTrades.filter(t => t.result_amount != null);
    const bestTrade = withResult.length > 0 ? withResult.reduce((best, t) => (t.result_amount! > best.result_amount! ? t : best)) : null;
    const worstTrade = withResult.length > 0 ? withResult.reduce((worst, t) => (t.result_amount! < worst.result_amount! ? t : worst)) : null;

    // ── Streak ───────────────────────────────────────────────────────────────
    const reverseSorted = [...trades].sort((a, b) => b.trade_date.localeCompare(a.trade_date));
    let streakCount = 0;
    let streakType: 'ganando' | 'perdiendo' | 'neutro' = 'neutro';
    for (const t of reverseSorted) {
      if (t.status === 'ganada') {
        if (streakType === 'neutro') streakType = 'ganando';
        if (streakType !== 'ganando') break;
        streakCount++;
      } else if (t.status === 'perdida') {
        if (streakType === 'neutro') streakType = 'perdiendo';
        if (streakType !== 'perdiendo') break;
        streakCount++;
      } else break;
    }

    // ── Period comparisons ────────────────────────────────────────────────────
    const now = new Date();
    const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthStart = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}-01`;
    const prevMonthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const thisQuarter = Math.floor(now.getMonth() / 3);
    const thisQStart = `${now.getFullYear()}-${String(thisQuarter * 3 + 1).padStart(2, '0')}-01`;
    const prevQDate = new Date(now.getFullYear(), thisQuarter * 3 - 3, 1);
    const prevQStart = `${prevQDate.getFullYear()}-${String(prevQDate.getMonth() + 1).padStart(2, '0')}-01`;

    const currentMonthPnl = trades.filter(t => t.trade_date >= thisMonthStart).reduce((s, t) => s + (t.result_amount ?? 0), 0);
    const prevMonthPnl = trades.filter(t => t.trade_date >= prevMonthStart && t.trade_date < prevMonthEnd).reduce((s, t) => s + (t.result_amount ?? 0), 0);
    const currentQuarterPnl = trades.filter(t => t.trade_date >= thisQStart).reduce((s, t) => s + (t.result_amount ?? 0), 0);
    const prevQuarterPnl = trades.filter(t => t.trade_date >= prevQStart && t.trade_date < thisQStart).reduce((s, t) => s + (t.result_amount ?? 0), 0);

    // Week comparison
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const thisWeekStartDate = new Date(now);
    thisWeekStartDate.setDate(now.getDate() - mondayOffset);
    const thisWeekStart = thisWeekStartDate.toISOString().split('T')[0];
    const prevWeekStartDate = new Date(thisWeekStartDate);
    prevWeekStartDate.setDate(thisWeekStartDate.getDate() - 7);
    const prevWeekStart = prevWeekStartDate.toISOString().split('T')[0];
    const nextWeekStartDate = new Date(thisWeekStartDate);
    nextWeekStartDate.setDate(thisWeekStartDate.getDate() + 7);
    const nextWeekStart = nextWeekStartDate.toISOString().split('T')[0];
    const currentWeekPnl = trades.filter(t => t.trade_date >= thisWeekStart && t.trade_date < nextWeekStart).reduce((s, t) => s + (t.result_amount ?? 0), 0);
    const prevWeekPnl = trades.filter(t => t.trade_date >= prevWeekStart && t.trade_date < thisWeekStart).reduce((s, t) => s + (t.result_amount ?? 0), 0);

    // Year comparison
    const thisYearStart = `${now.getFullYear()}-01-01`;
    const nextYearStart = `${now.getFullYear() + 1}-01-01`;
    const prevYearStart = `${now.getFullYear() - 1}-01-01`;
    const currentYearPnl = trades.filter(t => t.trade_date >= thisYearStart && t.trade_date < nextYearStart).reduce((s, t) => s + (t.result_amount ?? 0), 0);
    const prevYearPnl = trades.filter(t => t.trade_date >= prevYearStart && t.trade_date < thisYearStart).reduce((s, t) => s + (t.result_amount ?? 0), 0);

    // ── Distributions ────────────────────────────────────────────────────────
    const byAsset = buildDistribution(periodTrades, t => t.asset);
    const bySession = buildDistribution(periodTrades, t => t.session);
    const byTimeframe = buildDistribution(periodTrades, t => t.timeframe);
    const byZone = buildDistribution(periodTrades, t => t.zone);
    const byStrategy = buildDistribution(periodTrades, t => t.strategy_id ?? null);

    // ── Account breakdown ─────────────────────────────────────────────────────
    const accountBreakdown = accounts.map(acc => {
      const accTrades = periodTrades.filter(t => t.trading_account_id === acc.id);
      const accPnl = accTrades.reduce((s, t) => s + (t.result_amount ?? 0), 0);
      const accResolved = accTrades.filter(t => t.status === 'ganada' || t.status === 'perdida');
      const accWins = accTrades.filter(t => t.status === 'ganada').length;
      const accWR = accResolved.length > 0 ? Math.round((accWins / accResolved.length) * 100) : 0;
      const accRRs = accTrades.map(t => parseRR(t.risk_reward)).filter(v => v !== null) as number[];
      const accAvgRR = accRRs.length > 0 ? accRRs.reduce((s, v) => s + v, 0) / accRRs.length : null;
      return { account: acc, pnl: accPnl, winRate: accWR, avgRR: accAvgRR, tradeCount: accTrades.length };
    });

    return {
      periodTrades, allTrades: trades,
      balancePoints,
      totalPnl, totalPnlPct, winRate,
      totalWins: wins.length, totalLosses: losses.length, totalBreakeven: periodTrades.filter(t => t.status === 'breakeven').length,
      avgRR, avgRRWins,
      bestTrade, worstTrade,
      currentStreak: { type: streakType, count: streakCount },
      currentMonthPnl, prevMonthPnl, currentQuarterPnl, prevQuarterPnl,
      currentWeekPnl, prevWeekPnl, currentYearPnl, prevYearPnl,
      byAsset, bySession, byTimeframe, byZone, byStrategy,
      accountBreakdown,
    };
  }, [trades, accounts, selectedAccountId, period, ALL_ACCOUNTS_ID]);
}
