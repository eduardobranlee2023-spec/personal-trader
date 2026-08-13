import React, { useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { useStrategies, useTrades } from '../hooks/useTrades';
import type { Strategy } from '../hooks/useTrades';
import { useStats } from '../hooks/useStats';
import { useAccounts, ALL_ACCOUNTS_ID } from '../contexts/AccountContext';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowUpDown, Plus, Edit2, Trash2, X, Target, BarChart2 } from 'lucide-react';

import { AlertCircle } from 'lucide-react';

const fmtUSD = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

const StrategiesPage: React.FC = () => {
  const { user } = useAuth();
  const { strategies, isLoading, refresh } = useStrategies();
  const { accounts, selectedAccountId } = useAccounts();
  
  // We fetch all trades to calculate stats per strategy
  const { trades } = useTrades({ accountId: selectedAccountId });
  const stats = useStats(trades, accounts, selectedAccountId, 'ALL', ALL_ACCOUNTS_ID);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const openNew = () => {
    setEditingStrategy(null);
    setFormData({ name: '', description: '' });
    setFormError('');
    setIsFormOpen(true);
  };

  const openEdit = (s: Strategy) => {
    setEditingStrategy(s);
    setFormData({ name: s.name, description: s.description || '' });
    setFormError('');
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingStrategy(null);
    setFormError('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!formData.name.trim()) { setFormError('El nombre es obligatorio.'); return; }
    setIsSaving(true);
    setFormError('');
    try {
      const { error } = editingStrategy
        ? await supabase.from('strategies').update({ name: formData.name, description: formData.description }).eq('id', editingStrategy.id)
        : await supabase.from('strategies').insert({ user_id: user.id, name: formData.name, description: formData.description });
      if (error) { setFormError(error.message); return; }
      refresh();
      closeForm();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar esta estrategia?')) return;
    try {
      await supabase.from('strategies').delete().eq('id', id);
      refresh();
    } catch (err) {
      console.error('Error deleting strategy', err);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-32 text-textMuted">Cargando estrategias...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title flex items-center gap-2.5">
            <ArrowUpDown className="w-6 h-6 text-primary" /> Mis Estrategias
          </h1>
          <p className="page-sub mt-1">
            Administrá tus estrategias y analizá su rendimiento.
          </p>
        </div>
        <button
          onClick={openNew}
          className="btn btn-primary btn-sm"
        >
          <Plus className="w-4 h-4" />
          Nueva Estrategia
        </button>
      </div>

      {strategies.length === 0 ? (
        <div className="panel-card border-dashed flex flex-col items-center justify-center py-24 gap-3 text-textMuted">
          <ArrowUpDown className="w-10 h-10 opacity-30" />
          <p className="text-sm">Aún no creaste ninguna estrategia.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {strategies.map((strategy) => {
            // Find stats for this specific strategy
            const stratStats = stats.byStrategy.find(s => s.name === strategy.name);
            const tradesCount = stratStats?.trades || 0;
            const winRate = stratStats?.winRate || 0;
            const pnl = stratStats?.pnl || 0;
            
            // Calculate avg RR specifically for this strategy if possible
            // Note: useStats groups byStrategy but doesn't expose avg RR. We can compute it manually here:
            const strategyTrades = trades.filter(t => t.strategy_id === strategy.id);
            let avgRR = 0;
            let sumRR = 0;
            let countRR = 0;
            strategyTrades.forEach(t => {
              if (t.risk_reward && !isNaN(parseFloat(t.risk_reward))) {
                sumRR += parseFloat(t.risk_reward);
                countRR++;
              }
            });
            if (countRR > 0) avgRR = sumRR / countRR;

            return (
              <div key={strategy.id} className="fund-card flex flex-col">
                <div className="fund-head border-b border-[var(--line)] pb-4 mb-0">
                  <div>
                    <div className="fund-name">{strategy.name}</div>
                    {strategy.description && (
                      <p className="fund-sub line-clamp-2 mt-1">{strategy.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => openEdit(strategy)}
                      className="btn-icon btn-sm"
                      style={{ width: 36, height: 36 }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(strategy.id)}
                      className="btn btn-danger btn-sm btn-icon"
                      style={{ width: 36, height: 36, padding: 0 }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="fund-stats mt-4">
                  <div>
                    <div className="fs-t flex items-center gap-1.5"><BarChart2 className="w-3.5 h-3.5"/> Operaciones</div>
                    <div className="fs-v">{tradesCount}</div>
                  </div>
                  <div>
                    <div className="fs-t flex items-center gap-1.5"><Target className="w-3.5 h-3.5"/> Win Rate</div>
                    <div className={`fs-v ${winRate >= 50 ? 'text-acc' : 'text-loss'}`}>{winRate}%</div>
                  </div>
                  <div>
                    <div className="fs-t">P&L</div>
                    <div className={`fs-v ${pnl >= 0 ? 'text-acc' : 'text-loss'}`}>
                      {pnl >= 0 ? '+' : ''}{fmtUSD(pnl)}
                    </div>
                  </div>
                  <div>
                    <div className="fs-t">RR Promedio</div>
                    <div className="fs-v">{avgRR > 0 ? `1:${avgRR.toFixed(2)}` : '—'}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      {isFormOpen && (
        <div className="modal" onClick={closeForm}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{editingStrategy ? 'Editar Estrategia' : 'Nueva Estrategia'}</h3>
              <button type="button" onClick={closeForm} className="btn-icon">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form id="strategy-form" onSubmit={handleSave} className="modal-body space-y-4">
              {formError && (
                <div className="alert alert-err">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}
              <div className="field">
                <label>Nombre de la estrategia *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="Ej: Smart Money Concepts, Breakout..."
                />
              </div>
              <div className="field">
                <label>Descripción (opcional)</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="input"
                  placeholder="Reglas, confirmaciones, notas..."
                />
              </div>
            </form>
            <div className="modal-foot">
              <button
                type="submit"
                form="strategy-form"
                disabled={isSaving}
                className="btn btn-primary w-full"
              >
                {isSaving ? 'Guardando...' : (editingStrategy ? 'Actualizar Estrategia' : 'Crear Estrategia')}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default StrategiesPage;
