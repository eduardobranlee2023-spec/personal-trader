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
          <h1 className="text-2xl font-bold text-text flex items-center gap-2.5">
            <ArrowUpDown className="w-6 h-6 text-primary" /> Mis Estrategias
          </h1>
          <p className="text-textMuted text-sm mt-1">
            Administrá tus estrategias y analizá su rendimiento.
          </p>
        </div>
        <button
          onClick={openNew}
          className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nueva Estrategia
        </button>
      </div>

      {strategies.length === 0 ? (
        <div className="glass rounded-2xl border border-white/10 border-dashed flex flex-col items-center justify-center py-24 gap-3 text-textMuted">
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
              <div key={strategy.id} className="glass rounded-2xl border border-white/10 overflow-hidden flex flex-col">
                <div className="p-5 border-b border-white/5 flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-text mb-1">{strategy.name}</h3>
                    {strategy.description && (
                      <p className="text-sm text-textMuted line-clamp-2">{strategy.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => openEdit(strategy)}
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-textMuted transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(strategy.id)}
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="p-5 bg-white/2 grid grid-cols-2 sm:grid-cols-4 gap-4 mt-auto">
                  <div>
                    <div className="text-xs text-textMuted mb-1 flex items-center gap-1.5"><BarChart2 className="w-3.5 h-3.5"/> Operaciones</div>
                    <div className="font-semibold text-text">{tradesCount}</div>
                  </div>
                  <div>
                    <div className="text-xs text-textMuted mb-1 flex items-center gap-1.5"><Target className="w-3.5 h-3.5"/> Win Rate</div>
                    <div className={`font-semibold ${winRate >= 50 ? 'text-accent' : 'text-red-400'}`}>{winRate}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-textMuted mb-1">P&L</div>
                    <div className={`font-semibold ${pnl >= 0 ? 'text-accent' : 'text-red-400'}`}>
                      {pnl >= 0 ? '+' : ''}{fmtUSD(pnl)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-textMuted mb-1">RR Promedio</div>
                    <div className="font-semibold text-text">{avgRR > 0 ? `1:${avgRR.toFixed(2)}` : '—'}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={closeForm} className="absolute right-4 top-4 p-2 text-textMuted hover:text-text rounded-full hover:bg-white/5 transition">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-text mb-6">
              {editingStrategy ? 'Editar Estrategia' : 'Nueva Estrategia'}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              {formError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-textMuted mb-1.5">Nombre de la estrategia *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 text-text rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/60 transition"
                  placeholder="Ej: Smart Money Concepts, Breakout..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-textMuted mb-1.5">Descripción (opcional)</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 text-text rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/60 transition resize-none"
                  placeholder="Reglas, confirmaciones, notas..."
                />
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl py-3 font-medium transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Guardando...' : (editingStrategy ? 'Actualizar Estrategia' : 'Crear Estrategia')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default StrategiesPage;
