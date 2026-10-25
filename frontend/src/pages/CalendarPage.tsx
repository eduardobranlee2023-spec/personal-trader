import React, { useState, useMemo, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import TradeForm from '../components/trades/TradeForm';
import { useTrades, useStrategies } from '../hooks/useTrades';
import { useAccounts } from '../contexts/AccountContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Trade } from '../hooks/useTrades';
import { Ban, CalendarDays, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Target, Info, Pencil, List } from 'lucide-react';

const fmtCurrency = (val: number | null) => {
  if (val == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
};

const CalendarPage: React.FC = () => {
  const { user } = useAuth();
  const { selectedAccountId, refresh: refreshAccounts } = useAccounts();
  const [strategyFilter, setStrategyFilter] = useState('');
  const { trades, refresh: refreshTrades } = useTrades({ 
    accountId: selectedAccountId,
    strategyId: strategyFilter || undefined
  });
  const { strategies } = useStrategies();

  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // Set to 1st of month
    return d;
  });

  const [selectedDay, setSelectedDay] = useState<string | null>(null); // 'YYYY-MM-DD'
  const [showForm, setShowForm] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [nonOperationalDays, setNonOperationalDays] = useState<Set<string>>(() => new Set());
  const [isLoadingNonOperationalDays, setIsLoadingNonOperationalDays] = useState(true);
  const [isSavingNonOperationalDay, setIsSavingNonOperationalDay] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [streakType, setStreakType] = useState<'ganadora' | 'perdedora'>('ganadora');
  const [streakPeriod, setStreakPeriod] = useState<'mes' | 'semana'>('mes');
  const [selectedWeek, setSelectedWeek] = useState(0);

  // -- Calendar Logic --
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sunday, 1 = Monday...
  
  // Adjust so Monday is the first day of the week
  const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  const weeksCount = Math.ceil((daysInMonth + startOffset) / 7);
  const today = new Date();
  const todayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  useEffect(() => {
    if (selectedWeek >= weeksCount) setSelectedWeek(weeksCount - 1);
  }, [selectedWeek, weeksCount]);

  useEffect(() => {
    let isCurrent = true;

    const fetchNonOperationalDays = async () => {
      if (!user) {
        setNonOperationalDays(new Set());
        setIsLoadingNonOperationalDays(false);
        return;
      }

      setIsLoadingNonOperationalDays(true);
      setCalendarError(null);
      setNonOperationalDays(new Set());
      const firstDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
      const { data, error } = await supabase
        .from('calendar_non_operational_days')
        .select('trade_date')
        .eq('user_id', user.id)
        .gte('trade_date', firstDate)
        .lte('trade_date', lastDate);

      if (!isCurrent) return;
      if (error) {
        setCalendarError(`No se pudieron cargar los días no operativos: ${error.message}`);
      } else {
        setNonOperationalDays(new Set(data.map(day => day.trade_date)));
      }
      setIsLoadingNonOperationalDays(false);
    };

    void fetchNonOperationalDays();
    return () => { isCurrent = false; };
  }, [user, year, month, daysInMonth]);

  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const goToday = () => {
    const d = new Date();
    d.setDate(1);
    setCurrentDate(d);
  };

  // -- Aggregation by Day --
  const tradesByDay = useMemo(() => {
    const map = new Map<string, Trade[]>();
    for (const t of trades) {
      if (!map.has(t.trade_date)) map.set(t.trade_date, []);
      map.get(t.trade_date)!.push(t);
    }
    return map;
  }, [trades]);

  const monthName = currentDate.toLocaleString('es-AR', { month: 'long', year: 'numeric' });

  // -- Monthly Summary Logic --
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthTrades = useMemo(() => trades.filter(t => t.trade_date.startsWith(monthPrefix)), [trades, monthPrefix]);

  const monthStats = useMemo(() => {
    const totalPnl = monthTrades.reduce((sum, t) => sum + (t.result_amount ?? 0), 0);
    const count = monthTrades.length;
    const pnlByDay = new Map<string, number>();
    for (const trade of monthTrades) {
      if (trade.result_amount == null) continue;
      pnlByDay.set(trade.trade_date, (pnlByDay.get(trade.trade_date) ?? 0) + (trade.result_amount ?? 0));
    }
    const operatingDayResults = Array.from(pnlByDay.entries())
      .filter(([date]) => !nonOperationalDays.has(date))
      .map(([date, pnl]) => ({ date, pnl }));
    const operatingDays = operatingDayResults.length;
    const winningDays = operatingDayResults.filter(day => day.pnl > 0).length;
    const losingDays = operatingDayResults.filter(day => day.pnl < 0).length;
    const winRate = operatingDays > 0 ? (winningDays / operatingDays) * 100 : 0;
    const lossRate = operatingDays > 0 ? (losingDays / operatingDays) * 100 : 0;

    const weeklyPnl = Array(weeksCount).fill(0);
    for (const t of monthTrades) {
      const day = parseInt(t.trade_date.split('-')[2], 10);
      const weekIndex = Math.floor((day + startOffset - 1) / 7);
      if (weekIndex >= 0 && weekIndex < weeksCount) {
        weeklyPnl[weekIndex] += (t.result_amount ?? 0);
      }
    }
    
    return { totalPnl, count, operatingDays, winningDays, losingDays, winRate, lossRate, weeklyPnl, operatingDayResults };
  }, [monthTrades, weeksCount, startOffset, nonOperationalDays]);

  const streakStats = useMemo(() => {
    const periodDays = monthStats.operatingDayResults
      .filter(({ date }) => streakPeriod !== 'semana' || Math.floor((Number(date.slice(-2)) + startOffset - 1) / 7) === selectedWeek)
      .sort((a, b) => a.date.localeCompare(b.date));
    const isStreakDay = (pnl: number) => streakType === 'ganadora' ? pnl > 0 : pnl < 0;
    let currentStreak = 0;
    let longestStreak = 0;

    for (const day of periodDays) {
      if (isStreakDay(day.pnl)) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    return { longestStreak, periodDays: periodDays.length };
  }, [monthStats.operatingDayResults, selectedWeek, startOffset, streakPeriod, streakType]);

  // -- Day Details Logic --
  const selectedDayTrades = selectedDay ? tradesByDay.get(selectedDay) || [] : [];
  
  const calcDayStats = (dayTrades: Trade[]) => {
    const totalPnl = dayTrades.reduce((sum, t) => sum + (t.result_amount ?? 0), 0);
    const totalPct = dayTrades.reduce((sum, t) => sum + (t.result_percentage ?? 0), 0); // Simplified sum of percentages
    
    // Attempt to average RR if they are in "1:X" format
    let totalRR = 0;
    let rrCount = 0;
    for (const t of dayTrades) {
      if (t.risk_reward && t.risk_reward.startsWith('1:')) {
        const val = parseFloat(t.risk_reward.split(':')[1]);
        if (!isNaN(val)) {
          totalRR += val;
          rrCount++;
        }
      }
    }
    const avgRR = rrCount > 0 ? `1:${(totalRR / rrCount).toFixed(1)}` : '—';
    
    return { totalPnl, totalPct, avgRR, count: dayTrades.length };
  };

  const selectedDayStats = calcDayStats(selectedDayTrades);
  const isPositiveDay = selectedDayStats.totalPnl > 0;
  const isNegativeDay = selectedDayStats.totalPnl < 0;
  const isSelectedDayNonOperational = selectedDay ? nonOperationalDays.has(selectedDay) : false;

  const toggleSelectedDayNonOperational = async () => {
    if (!selectedDay || !user || isSavingNonOperationalDay) return;
    setIsSavingNonOperationalDay(true);
    setCalendarError(null);

    const result = isSelectedDayNonOperational
      ? await supabase.from('calendar_non_operational_days')
        .delete()
        .eq('user_id', user.id)
        .eq('trade_date', selectedDay)
      : await supabase.from('calendar_non_operational_days')
        .insert({ user_id: user.id, trade_date: selectedDay });

    if (result.error) {
      setCalendarError(`No se pudo actualizar el día: ${result.error.message}`);
    } else {
      setNonOperationalDays(previous => {
        const next = new Set(previous);
        if (isSelectedDayNonOperational) next.delete(selectedDay);
        else next.add(selectedDay);
        return next;
      });
    }
    setIsSavingNonOperationalDay(false);
  };

  const handleSaved = () => {
    refreshTrades();
    refreshAccounts();
  };

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title flex items-center gap-2.5">
            <CalendarDays className="w-6 h-6 text-primary" />
            Calendario
          </h1>
          <p className="page-sub mt-1">Revisá tu consistencia a lo largo del mes.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:block field">
            <select 
              value={strategyFilter} 
              onChange={e => setStrategyFilter(e.target.value)}
              className="input"
            >
              <option value="">Todas las estrategias</option>
              {strategies.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <button onClick={goToday} className="btn btn-ghost btn-sm">
            Hoy
          </button>
          <div className="seg">
            <button type="button" onClick={prevMonth} className="btn-icon" style={{ width: 36, height: 36, padding: 0 }}><ChevronLeft className="w-5 h-5" /></button>
            <span className="px-3 font-semibold text-sm capitalize">{monthName}</span>
            <button type="button" onClick={nextMonth} className="btn-icon" style={{ width: 36, height: 36, padding: 0 }}><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 panel-card p-5">
          <div className="cal mb-2">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
              <div key={day} className="cal-dow">{day}</div>
            ))}
          </div>
          <div className="cal">
            {Array.from({ length: startOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="cal-day empty" />
            ))}
            
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayTrades = tradesByDay.get(dateStr) || [];
              const isSelected = selectedDay === dateStr;
              const isToday = dateStr === todayDate;
              const isNonOperational = nonOperationalDays.has(dateStr);
              
              const stats = calcDayStats(dayTrades);
              let dayClass = 'cal-day clickable';
              if (dayTrades.length > 0) {
                if (stats.totalPnl > 0) dayClass += ' up';
                else if (stats.totalPnl < 0) dayClass += ' dn';
              }
              if (isNonOperational) dayClass += ' non-operational';
              if (isToday) dayClass += ' today';
              if (isSelected) dayClass += ' selected';

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                  className={dayClass}
                >
                  <span className="cd-n">
                    {day}
                    {dayTrades.length > 0 && <span className="cd-count">T:{dayTrades.length}</span>}
                  </span>
                  {isNonOperational && <span className="cd-status">No operativo</span>}
                  {dayTrades.length > 0 && (
                    <span className="cd-v">
                      {stats.totalPnl > 0 ? '+' : ''}{fmtCurrency(stats.totalPnl)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-1">
          {selectedDay ? (
            <div className="panel-card p-5 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-text text-lg capitalize">
                    {new Date(selectedDay + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h3>
                </div>
                <button onClick={() => setSelectedDay(null)} className="btn btn-ghost btn-sm text-xs px-2 py-1">
                  Volver
                </button>
              </div>

              <button
                type="button"
                onClick={() => void toggleSelectedDayNonOperational()}
                disabled={isSavingNonOperationalDay || isLoadingNonOperationalDays}
                className={`btn btn-sm w-full justify-center mb-3 ${isSelectedDayNonOperational ? 'btn-primary' : 'btn-ghost'}`}
              >
                <Ban className="w-4 h-4" />
                {isSavingNonOperationalDay ? 'Guardando...' : isSelectedDayNonOperational ? 'Marcar como operativo' : 'Día no operativo'}
              </button>
              {isSelectedDayNonOperational && (
                <p className="text-xs text-textMuted mb-3">
                  Se excluye de las tasas y rachas. Las operaciones registradas y su P&L se conservan.
                </p>
              )}

              {selectedDayTrades.length === 0 ? (
                <div className="py-10 text-center text-textMuted text-sm">
                  <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Info className="w-5 h-5 opacity-50" />
                  </div>
                  No hay operaciones registradas en este día.
                </div>
              ) : (
                <div className="mt-5 space-y-5">
                  {/* Summary Card */}
                  <div className={`stat-card ${isPositiveDay ? 'border-[var(--acc)]' : isNegativeDay ? 'border-[var(--red)]' : ''}`}>
                    <div className="sc-lbl mb-2">Resumen del Día</div>
                    <div className="fund-stats" style={{ gridTemplateColumns: '1fr 1fr', borderTop: 'none', paddingTop: 0, marginTop: 0 }}>
                      <div>
                        <div className="fs-t">P&L Diario</div>
                        <div className={`sc-val ${isPositiveDay ? 'accent' : isNegativeDay ? 'negative' : ''}`}>
                          {isPositiveDay ? '+' : ''}{fmtCurrency(selectedDayStats.totalPnl)}
                        </div>
                        <div className="sc-sub">{isPositiveDay ? '+' : ''}{selectedDayStats.totalPct.toFixed(2)}%</div>
                      </div>
                      <div>
                        <div className="fs-t">RR Promedio</div>
                        <div className="sc-val">{selectedDayStats.avgRR}</div>
                        <div className="sc-sub">{selectedDayStats.count} operacion(es)</div>
                      </div>
                    </div>
                  </div>

                  {/* Trades List */}
                  <div>
                    <div className="text-xs text-textMuted mb-3 flex items-center gap-1.5 uppercase font-semibold">
                      <List className="w-3.5 h-3.5" /> Detalle de operativas
                    </div>
                    <div className="space-y-2">
                      {selectedDayTrades.map(trade => (
                        <div key={trade.id} className="fund-card p-3 group">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="sym">{trade.asset}</span>
                              <div className={`flex items-center gap-1 text-[11px] font-medium mt-0.5 ${trade.direction === 'compra' ? 'text-acc' : 'text-loss'}`}>
                                {trade.direction === 'compra' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                <span className="capitalize">{trade.direction}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => { setEditingTrade(trade); setShowForm(true); }}
                              className="btn-icon opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{ width: 28, height: 28 }}
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          </div>
                          
                          <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-[var(--line)]">
                            <span className="sc-sub flex items-center gap-1">
                              <Target className="w-3 h-3" /> {trade.risk_reward || 'RR: —'}
                            </span>
                            <span className={`font-semibold ${
                              (trade.result_amount ?? 0) > 0 ? 'text-acc' : (trade.result_amount ?? 0) < 0 ? 'text-loss' : ''
                            }`}>
                              {trade.result_amount != null ? (trade.result_amount > 0 ? '+' : '') + fmtCurrency(trade.result_amount) : 'En curso'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="panel-card p-5 sticky top-24">
              <div className="flex items-center gap-2 mb-5">
                <CalendarDays className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-text text-lg capitalize">Resumen del Mes</h3>
              </div>
              
              <div className="space-y-6">
                {/* Monthly Stats */}
                <div className="stat-grid grid grid-cols-2 gap-3">
                  <div className="stat-card p-4">
                    <div className="sc-lbl mb-1">P&L Neto</div>
                    <div className={`text-xl font-bold ${monthStats.totalPnl > 0 ? 'text-acc' : monthStats.totalPnl < 0 ? 'text-loss' : 'text-text'}`}>
                      {monthStats.totalPnl > 0 ? '+' : ''}{fmtCurrency(monthStats.totalPnl)}
                    </div>
                  </div>
                  <div className="stat-card p-4">
                    <div className="sc-lbl mb-1">Win Rate (días)</div>
                    <div className="text-xl font-bold text-acc">{monthStats.winRate.toFixed(1)}%</div>
                    <div className="sc-sub">{monthStats.winningDays} de {monthStats.operatingDays} días operativos</div>
                  </div>
                  <div className="stat-card p-4">
                    <div className="sc-lbl mb-1">Lost Rate (días)</div>
                    <div className="text-xl font-bold text-loss">{monthStats.lossRate.toFixed(1)}%</div>
                    <div className="sc-sub">{monthStats.losingDays} de {monthStats.operatingDays} días operativos</div>
                  </div>
                  <div className="stat-card p-4 col-span-2 flex items-center justify-between">
                    <span className="sc-lbl">Operaciones del mes</span>
                    <span className="text-lg font-semibold text-text">
                      {monthStats.count} {monthStats.count === 1 ? 'trade' : 'trades'}
                    </span>
                  </div>
                </div>

                <div className="stat-card p-4">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div>
                      <div className="sc-lbl">Racha de operativas</div>
                      <div className="font-semibold text-text mt-1">
                        {streakType === 'ganadora' ? 'Ganadora' : 'Perdedora'}: {streakStats.longestStreak} {streakStats.longestStreak === 1 ? 'día' : 'días'}
                      </div>
                    </div>
                    <div className="seg" style={{ width: 'auto' }}>
                      <button type="button" className={streakType === 'ganadora' ? 'on-acc' : ''} onClick={() => setStreakType('ganadora')}>Ganadora</button>
                      <button type="button" className={streakType === 'perdedora' ? 'on-sell' : ''} onClick={() => setStreakType('perdedora')}>Perdedora</button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="seg">
                      <button type="button" className={streakPeriod === 'mes' ? 'on-acc' : ''} onClick={() => setStreakPeriod('mes')}>Mes</button>
                      <button type="button" className={streakPeriod === 'semana' ? 'on-acc' : ''} onClick={() => setStreakPeriod('semana')}>Semana</button>
                    </div>
                    {streakPeriod === 'semana' && (
                      <select
                        value={selectedWeek}
                        onChange={event => setSelectedWeek(Number(event.target.value))}
                        className="input"
                        aria-label="Semana para calcular la racha"
                      >
                        {Array.from({ length: weeksCount }, (_, index) => (
                          <option key={index} value={index}>Semana {index + 1}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <p className="sc-sub">
                    {streakStats.periodDays} días operativos considerados; los días no operativos se omiten.
                  </p>
                </div>

                {/* Weekly Summary */}
                <div>
                  <div className="text-xs text-textMuted mb-3 flex items-center gap-1.5 uppercase font-semibold">
                    <List className="w-3.5 h-3.5" /> P&L por Semana
                  </div>
                  <div className="space-y-2">
                    {monthStats.weeklyPnl.map((pnl, i) => (
                      <div key={i} className="fund-card p-3 flex items-center justify-between">
                        <span className="font-medium text-sm text-text">Semana {i + 1}</span>
                        <span className={`font-semibold text-sm ${pnl > 0 ? 'text-acc' : pnl < 0 ? 'text-loss' : 'text-textMuted'}`}>
                          {pnl > 0 ? '+' : ''}{fmtCurrency(pnl)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-[var(--line)]">
                  <p className="text-xs text-textMuted text-center">
                    Seleccioná un día en el calendario para ver el detalle de sus operativas.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {calendarError && (
        <div className="alert alert-err mt-4" role="alert">
          {calendarError}
        </div>
      )}

      {showForm && (
        <TradeForm
          trade={editingTrade}
          knownAssets={Array.from(new Set(trades.map(t => t.asset)))} // Generate known assets on the fly
          onClose={() => setShowForm(false)}
          onSaved={handleSaved}
        />
      )}
    </AppLayout>
  );
};

export default CalendarPage;
