import React, { useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
import TradeForm from '../components/trades/TradeForm';
import { useTrades } from '../hooks/useTrades';
import { useAccounts } from '../contexts/AccountContext';
import { supabase } from '../lib/supabase';
import type { Trade } from '../hooks/useTrades';
import {
  Plus, BarChart2, TrendingUp, TrendingDown, Clock, Filter,
  Pencil, ExternalLink, Trash2
} from 'lucide-react';

const statusBadge: Record<string, { bg: string; text: string; dot: string }> = {
  'ganada':   { bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  'perdida':  { bg: 'bg-red-500/10 border-red-500/20',         text: 'text-red-400',     dot: 'bg-red-400' },
  'breakeven':{ bg: 'bg-amber-500/10 border-amber-500/20',     text: 'text-amber-400',   dot: 'bg-amber-400' },
  'en curso': { bg: 'bg-blue-500/10 border-blue-500/20',       text: 'text-blue-400',    dot: 'bg-blue-400' },
};

const TradesPage: React.FC = () => {
  const { selectedAccountId, refresh: refreshAccounts } = useAccounts();
  const [showForm, setShowForm] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [assetFilter, setAssetFilter] = useState('');
  const [dirFilter, setDirFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { trades, assets, isLoading, refresh } = useTrades({
    accountId: selectedAccountId,
    asset: assetFilter || undefined,
    direction: dirFilter || undefined,
    status: statusFilter || undefined,
  });

  const openNew = () => { setEditingTrade(null); setShowForm(true); };
  const openEdit = (t: Trade) => { setEditingTrade(t); setShowForm(true); };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar esta operación?')) return;
    setDeletingId(id);
    await supabase.from('trades').delete().eq('id', id);
    setDeletingId(null);
    refresh();
    refreshAccounts();
  };

  const handleSaved = () => {
    refresh();
    refreshAccounts();
  };

  const fmt = (val: number | null) => {
    if (val == null) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  const hasFilters = assetFilter || dirFilter || statusFilter;

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text flex items-center gap-2">
            <BarChart2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            Operaciones
          </h1>
          <p className="text-textMuted text-sm mt-0.5">
            {isLoading ? '...' : `${trades.length} operación${trades.length !== 1 ? 'es' : ''} registrada${trades.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={openNew}
          className="btn-primary flex items-center gap-2 shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Nuevo trade
        </button>
      </div>

      {/* Filters */}
      <div className="glass rounded-xl border border-white/10 p-3 sm:p-4 mb-5 flex flex-wrap gap-2 sm:gap-3 items-center">
        <div className="flex items-center gap-1.5 text-xs text-textMuted font-medium">
          <Filter className="w-3.5 h-3.5" /> Filtros
        </div>
        <select
          value={assetFilter}
          onChange={e => setAssetFilter(e.target.value)}
          className="bg-white/5 border border-white/10 text-text rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary/50 flex-1 min-w-[100px]"
        >
          <option value="">Todos los activos</option>
          {assets.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select
          value={dirFilter}
          onChange={e => setDirFilter(e.target.value)}
          className="bg-white/5 border border-white/10 text-text rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary/50"
        >
          <option value="">Dirección</option>
          <option value="compra">Compra</option>
          <option value="venta">Venta</option>
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-white/5 border border-white/10 text-text rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary/50"
        >
          <option value="">Estado</option>
          <option value="ganada">Ganada</option>
          <option value="perdida">Perdida</option>
          <option value="breakeven">Breakeven</option>
          <option value="en curso">En curso</option>
        </select>
        {hasFilters && (
          <button
            onClick={() => { setAssetFilter(''); setDirFilter(''); setStatusFilter(''); }}
            className="text-xs text-primary hover:underline ml-auto"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20 text-textMuted gap-2">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Cargando operaciones...
        </div>
      )}

      {/* Empty state */}
      {!isLoading && trades.length === 0 && (
        <div className="glass rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center py-20 gap-3 text-textMuted">
          <BarChart2 className="w-10 h-10 opacity-20" />
          <p className="text-sm">
            {hasFilters ? 'Sin resultados para los filtros aplicados.' : 'Aún no registraste ninguna operación.'}
          </p>
          {!hasFilters && (
            <button onClick={openNew} className="btn-primary mt-2 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Registrar primer trade
            </button>
          )}
        </div>
      )}

      {/* Mobile: Cards */}
      {!isLoading && trades.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden md:block glass rounded-2xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-textMuted bg-white/2">
                    <th className="p-4 font-medium">Fecha</th>
                    <th className="p-4 font-medium">Activo</th>
                    <th className="p-4 font-medium">Dir.</th>
                    <th className="p-4 font-medium">TF / Sesión</th>
                    <th className="p-4 font-medium">RR</th>
                    <th className="p-4 font-medium">Resultado</th>
                    <th className="p-4 font-medium">Estado</th>
                    <th className="p-4 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {trades.map(trade => {
                    const badge = statusBadge[trade.status] || statusBadge['en curso'];
                    return (
                      <tr key={trade.id} className="hover:bg-white/3 transition group">
                        <td className="p-4 text-xs text-textMuted font-mono whitespace-nowrap">{trade.trade_date}</td>
                        <td className="p-4">
                          <div className="font-semibold text-text text-sm">{trade.asset}</div>
                          {trade.zone && <div className="text-xs text-textMuted mt-0.5 truncate max-w-[100px]">{trade.zone}</div>}
                        </td>
                        <td className="p-4">
                          <div className={`flex items-center gap-1 text-xs font-semibold ${trade.direction === 'compra' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {trade.direction === 'compra'
                              ? <TrendingUp className="w-3.5 h-3.5" />
                              : <TrendingDown className="w-3.5 h-3.5" />}
                            <span className="capitalize hidden lg:block">{trade.direction}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm text-text font-mono">{trade.timeframe}</div>
                          <div className="text-xs text-textMuted flex items-center gap-1 mt-0.5 capitalize">
                            <Clock className="w-3 h-3" /> {trade.session}
                          </div>
                        </td>
                        <td className="p-4 text-xs font-mono text-textMuted">{trade.risk_reward || '—'}</td>
                        <td className="p-4">
                          <div className={`text-sm font-bold font-mono ${
                            (trade.result_amount ?? 0) > 0 ? 'text-emerald-400' :
                            (trade.result_amount ?? 0) < 0 ? 'text-red-400' : 'text-text'
                          }`}>
                            {trade.result_amount != null
                              ? <>{trade.result_amount > 0 ? '+' : ''}{fmt(trade.result_amount)}</>
                              : '—'}
                          </div>
                          {trade.result_percentage != null && (
                            <div className={`text-xs mt-0.5 font-mono ${trade.result_percentage > 0 ? 'text-emerald-400/70' : trade.result_percentage < 0 ? 'text-red-400/70' : 'text-textMuted'}`}>
                              {trade.result_percentage > 0 ? '+' : ''}{trade.result_percentage.toFixed(2)}%
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wide ${badge.bg} ${badge.text}`}>
                            {trade.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                            {trade.tradingview_link && (
                              <a href={trade.tradingview_link} target="_blank" rel="noreferrer"
                                className="p-1.5 text-textMuted hover:text-primary bg-white/5 rounded-lg transition" title="TradingView">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button onClick={() => openEdit(trade)}
                              className="p-1.5 text-textMuted hover:text-primary bg-white/5 rounded-lg transition">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(trade.id)}
                              disabled={deletingId === trade.id}
                              className="p-1.5 text-textMuted hover:text-red-400 bg-white/5 rounded-lg transition disabled:opacity-50">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {trades.map(trade => {
              const badge = statusBadge[trade.status] || statusBadge['en curso'];
              const isWin = (trade.result_amount ?? 0) > 0;
              const isLoss = (trade.result_amount ?? 0) < 0;
              return (
                <div key={trade.id} className={`glass rounded-2xl border p-4 ${
                  isWin ? 'border-emerald-500/20' : isLoss ? 'border-red-500/20' : 'border-white/10'
                }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-1 h-10 rounded-full ${badge.dot}`} />
                      <div>
                        <div className="font-bold text-text text-base">{trade.asset}</div>
                        <div className="text-xs text-textMuted">{trade.trade_date}</div>
                      </div>
                    </div>
                    <div className={`font-bold font-mono text-lg ${
                      isWin ? 'text-emerald-400' : isLoss ? 'text-red-400' : 'text-text'
                    }`}>
                      {trade.result_amount != null
                        ? <>{trade.result_amount > 0 ? '+' : ''}{fmt(trade.result_amount)}</>
                        : '—'}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={`flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full ${
                      trade.direction === 'compra' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {trade.direction === 'compra' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {trade.direction}
                    </span>
                    <span className="text-textMuted bg-white/5 px-2 py-0.5 rounded-full font-mono">{trade.timeframe}</span>
                    <span className="text-textMuted capitalize">{trade.session}</span>
                    {trade.risk_reward && <span className="text-textMuted font-mono">RR: {trade.risk_reward}</span>}
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ml-auto ${badge.bg} ${badge.text}`}>
                      {trade.status}
                    </span>
                  </div>

                  {trade.zone && (
                    <div className="mt-2 text-xs text-textMuted border-t border-white/5 pt-2">Setup: {trade.zone}</div>
                  )}

                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                    {trade.tradingview_link && (
                      <a href={trade.tradingview_link} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 text-xs text-primary">
                        <ExternalLink className="w-3 h-3" /> TradingView
                      </a>
                    )}
                    <button onClick={() => openEdit(trade)}
                      className="flex items-center gap-1 text-xs text-textMuted hover:text-text ml-auto">
                      <Pencil className="w-3 h-3" /> Editar
                    </button>
                    <button onClick={() => handleDelete(trade.id)}
                      disabled={deletingId === trade.id}
                      className="flex items-center gap-1 text-xs text-red-400/70 hover:text-red-400 disabled:opacity-50">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {showForm && (
        <TradeForm
          trade={editingTrade}
          knownAssets={assets}
          onClose={() => setShowForm(false)}
          onSaved={handleSaved}
        />
      )}
    </AppLayout>
  );
};

export default TradesPage;
