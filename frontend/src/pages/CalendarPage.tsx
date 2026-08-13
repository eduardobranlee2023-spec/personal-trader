import React, { useState, useMemo } from 'react';
import AppLayout from '../components/layout/AppLayout';
import TradeForm from '../components/trades/TradeForm';
import { useTrades, useStrategies } from '../hooks/useTrades';
import { useAccounts } from '../contexts/AccountContext';
import type { Trade } from '../hooks/useTrades';
import { CalendarDays, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Target, Info, Pencil, List } from 'lucide-react';

const fmtCurrency = (val: number | null) => {
  if (val == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
};

const CalendarPage: React.FC = () => {
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

  // -- Calendar Logic --
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sunday, 1 = Monday...
  
  // Adjust so Monday is the first day of the week
  const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

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
              const isToday = dateStr === new Date().toISOString().split('T')[0];
              
              const stats = calcDayStats(dayTrades);
              let dayClass = 'cal-day clickable';
              if (dayTrades.length > 0) {
                if (stats.totalPnl > 0) dayClass += ' up';
                else if (stats.totalPnl < 0) dayClass += ' dn';
              }
              if (isToday) dayClass += ' today';
              if (isSelected) dayClass += ' selected';

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(dateStr)}
                  className={dayClass}
                >
                  <span className="cd-n">{day}</span>
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
              <div className="flex items-center gap-2 mb-1">
                <CalendarDays className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-text text-lg">
                  {new Date(selectedDay + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
              </div>

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
            <div className="panel-card border-dashed h-full min-h-[300px] flex flex-col items-center justify-center p-6 text-center text-textMuted">
              <CalendarDays className="w-8 h-8 opacity-40 mb-3" />
              <p className="text-sm">Seleccioná un día en el calendario para ver el detalle de tus operativas.</p>
            </div>
          )}
        </div>
      </div>

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
