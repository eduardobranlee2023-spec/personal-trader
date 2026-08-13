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

const statusTag: Record<string, string> = {
  ganada: 'tag tag-win',
  perdida: 'tag tag-loss',
  breakeven: 'tag tag-neutral',
  'en curso': 'tag tag-info',
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-primary" />
            Operaciones
          </h1>
          <p className="page-sub">
            {isLoading ? '...' : `${trades.length} operación${trades.length !== 1 ? 'es' : ''} registrada${trades.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button onClick={openNew} className="btn btn-primary btn-sm shrink-0 self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          Nuevo trade
        </button>
      </div>

      <div className="panel-card mb-5 flex flex-wrap gap-2 sm:gap-3 items-center">
        <div className="flex items-center gap-1.5 sc-lbl">
          <Filter className="w-3.5 h-3.5" /> Filtros
        </div>
        <select value={assetFilter} onChange={e => setAssetFilter(e.target.value)} className="input btn-sm" style={{ width: 'auto', minWidth: 120, padding: '8px 12px', fontSize: 12 }}>
          <option value="">Todos los activos</option>
          {assets.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={dirFilter} onChange={e => setDirFilter(e.target.value)} className="input" style={{ width: 'auto', padding: '8px 12px', fontSize: 12 }}>
          <option value="">Dirección</option>
          <option value="compra">Compra</option>
          <option value="venta">Venta</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input" style={{ width: 'auto', padding: '8px 12px', fontSize: 12 }}>
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

      {isLoading && (
        <div className="flex items-center justify-center py-20 text-textMuted gap-2">
          <span className="spin" style={{ width: 20, height: 20, borderWidth: 2 }} />
          Cargando operaciones...
        </div>
      )}

      {!isLoading && trades.length === 0 && (
        <div className="panel-card border-dashed flex flex-col items-center justify-center py-20 gap-3 text-textMuted">
          <BarChart2 className="w-10 h-10 opacity-20" />
          <p className="text-sm">
            {hasFilters ? 'Sin resultados para los filtros aplicados.' : 'Aún no registraste ninguna operación.'}
          </p>
          {!hasFilters && (
            <button onClick={openNew} className="btn btn-primary btn-sm mt-2">
              <Plus className="w-4 h-4" /> Registrar primer trade
            </button>
          )}
        </div>
      )}

      {!isLoading && trades.length > 0 && (
        <>
          <div className="hidden md:block ptable-wrap">
            <table className="ptable">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Activo</th>
                  <th>Dir.</th>
                  <th>TF / Sesión</th>
                  <th>RR</th>
                  <th>Resultado</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {trades.map(trade => (
                  <tr key={trade.id} className="group">
                    <td className="mono">{trade.trade_date}</td>
                    <td>
                      <div className="sym">{trade.asset}</div>
                      {trade.zone && <div className="sc-sub" style={{ marginTop: 2 }}>{trade.zone}</div>}
                    </td>
                    <td>
                      <span className={trade.direction === 'compra' ? 'tag tag-win' : 'tag tag-loss'}>
                        {trade.direction === 'compra' ? <TrendingUp className="w-3 h-3 inline" /> : <TrendingDown className="w-3 h-3 inline" />}
                        {' '}{trade.direction}
                      </span>
                    </td>
                    <td>
                      <div className="sym">{trade.timeframe}</div>
                      <div className="sc-sub flex items-center gap-1 capitalize" style={{ marginTop: 2 }}>
                        <Clock className="w-3 h-3" /> {trade.session}
                      </div>
                    </td>
                    <td className="mono">{trade.risk_reward || '—'}</td>
                    <td>
                      <div className={
                        (trade.result_amount ?? 0) > 0 ? 'pos' :
                        (trade.result_amount ?? 0) < 0 ? 'neg' : 'mono'
                      }>
                        {trade.result_amount != null
                          ? <>{trade.result_amount > 0 ? '+' : ''}{fmt(trade.result_amount)}</>
                          : '—'}
                      </div>
                      {trade.result_percentage != null && (
                        <div className="sc-sub">
                          {trade.result_percentage > 0 ? '+' : ''}{trade.result_percentage.toFixed(2)}%
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={statusTag[trade.status] || statusTag['en curso']}>
                        {trade.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                        {trade.tradingview_link && (
                          <a href={trade.tradingview_link} target="_blank" rel="noreferrer" className="btn-icon" style={{ width: 32, height: 32 }} title="TradingView">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button onClick={() => openEdit(trade)} className="btn-icon" style={{ width: 32, height: 32 }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(trade.id)}
                          disabled={deletingId === trade.id}
                          className="btn-icon"
                          style={{ width: 32, height: 32 }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {trades.map(trade => {
              const isWin = (trade.result_amount ?? 0) > 0;
              const isLoss = (trade.result_amount ?? 0) < 0;
              return (
                <div key={trade.id} className={`fund-card ${isWin ? 'border-acc-soft' : isLoss ? 'border-[rgba(var(--red-rgb),0.35)]' : ''}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="fund-name">{trade.asset}</div>
                      <div className="fund-sub">{trade.trade_date}</div>
                    </div>
                    <div className={`sc-val ${isWin ? 'accent' : isLoss ? 'negative' : ''}`} style={{ fontSize: '1.1rem' }}>
                      {trade.result_amount != null
                        ? <>{trade.result_amount > 0 ? '+' : ''}{fmt(trade.result_amount)}</>
                        : '—'}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className={trade.direction === 'compra' ? 'tag tag-win' : 'tag tag-loss'}>
                      {trade.direction === 'compra' ? <TrendingUp className="w-3 h-3 inline" /> : <TrendingDown className="w-3 h-3 inline" />}
                      {' '}{trade.direction}
                    </span>
                    <span className="tag tag-neutral mono">{trade.timeframe}</span>
                    <span className="sc-sub capitalize">{trade.session}</span>
                    {trade.risk_reward && <span className="mono sc-sub">RR: {trade.risk_reward}</span>}
                    <span className={`${statusTag[trade.status] || statusTag['en curso']} ml-auto`}>
                      {trade.status}
                    </span>
                  </div>

                  {trade.zone && (
                    <div className="sc-sub mt-2 pt-2 border-t border-white/5">Setup: {trade.zone}</div>
                  )}

                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                    {trade.tradingview_link && (
                      <a href={trade.tradingview_link} target="_blank" rel="noreferrer" className="text-xs text-primary flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> TradingView
                      </a>
                    )}
                    <button onClick={() => openEdit(trade)} className="btn btn-ghost btn-sm ml-auto">
                      <Pencil className="w-3 h-3" /> Editar
                    </button>
                    <button onClick={() => handleDelete(trade.id)} disabled={deletingId === trade.id} className="btn btn-danger btn-sm">
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
