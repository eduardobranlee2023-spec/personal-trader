import React, { useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { useFundedInvestments } from '../hooks/useFundedInvestments';
import type { FundedInvestment, InvestmentStatus } from '../hooks/useFundedInvestments';
import { useTrades } from '../hooks/useTrades';
import { useAccounts } from '../contexts/AccountContext';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BadgeDollarSign, Plus, Edit2, Trash2, X, Target, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

const fmtUSD = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

const STATUS_STYLE: Record<InvestmentStatus, { bg: string; text: string; label: string }> = {
  pendiente:    { bg: 'bg-amber-400/10 border-amber-400/20',  text: 'text-amber-400',   label: 'Pendiente' },
  aprobada:     { bg: 'bg-emerald-400/10 border-emerald-400/20', text: 'text-emerald-400', label: 'Aprobada ✓' },
  rechazada:    { bg: 'bg-red-400/10 border-red-400/20',      text: 'text-red-400',      label: 'Rechazada' },
  reintentando: { bg: 'bg-blue-400/10 border-blue-400/20',    text: 'text-blue-400',     label: 'Retry' },
};

const FundingPage: React.FC = () => {
  const { user } = useAuth();
  const { trades } = useTrades();
  const { investments, metrics, isLoading, refresh } = useFundedInvestments(trades);
  const { accounts } = useAccounts();
  const fundedAccounts = accounts.filter(a => a.account_type === 'fondeada');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<FundedInvestment | null>(null);
  const [formData, setFormData] = useState({
    provider: '',
    amount_invested: '',
    investment_date: new Date().toISOString().split('T')[0],
    status: 'pendiente' as InvestmentStatus,
    trading_account_id: '',
    notes: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openNew = () => {
    setEditingInvestment(null);
    setFormData({
      provider: '', amount_invested: '',
      investment_date: new Date().toISOString().split('T')[0],
      status: 'pendiente', trading_account_id: '', notes: ''
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const openEdit = (inv: FundedInvestment) => {
    setEditingInvestment(inv);
    setFormData({
      provider: inv.provider,
      amount_invested: inv.amount_invested.toString(),
      investment_date: inv.investment_date,
      status: inv.status,
      trading_account_id: inv.trading_account_id || '',
      notes: inv.notes || ''
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingInvestment(null);
    setFormError('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!formData.provider.trim()) { setFormError('El proveedor es obligatorio.'); return; }
    if (!formData.amount_invested || isNaN(parseFloat(formData.amount_invested))) {
      setFormError('Ingresá un monto válido.');
      return;
    }
    setIsSaving(true);
    setFormError('');

    const payload = {
      user_id: user.id,
      provider: formData.provider.trim(),
      amount_invested: parseFloat(formData.amount_invested),
      investment_date: formData.investment_date,
      status: formData.status,
      trading_account_id: formData.trading_account_id || null,
      notes: formData.notes || null,
    };

    try {
      const { error } = editingInvestment
        ? await supabase.from('funded_investments').update(payload).eq('id', editingInvestment.id)
        : await supabase.from('funded_investments').insert(payload);

      if (error) { setFormError(error.message); return; }
      refresh();
      closeForm();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar esta inversión?')) return;
    setDeletingId(id);
    await supabase.from('funded_investments').delete().eq('id', id);
    setDeletingId(null);
    refresh();
  };

  const roiPositive = metrics.netRoi >= 0;

  const totalBought = investments.length;
  const approvedCount = investments.filter(i => i.status === 'aprobada').length;
  const blownCount = investments.filter(i => i.status === 'rechazada').length;
  const approvedPct = totalBought > 0 ? ((approvedCount / totalBought) * 100).toFixed(1) : '0.0';
  const blownPct = totalBought > 0 ? ((blownCount / totalBought) * 100).toFixed(1) : '0.0';

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text flex items-center gap-2">
            <BadgeDollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> Fondeos
          </h1>
          <p className="text-textMuted text-sm mt-0.5">Gestioná evaluaciones y analizá tu ROI real.</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> Nueva Inversión
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="glass rounded-2xl border border-white/10 p-5 card-hover">
          <div className="flex items-center gap-2 mb-2 text-textMuted text-xs">
            <Target className="w-3.5 h-3.5 text-primary" /> Total Invertido
          </div>
          <div className="text-2xl font-bold font-mono text-text">{fmtUSD(metrics.totalInvested)}</div>
          <div className="text-xs text-textMuted mt-1">{investments.length} evaluación{investments.length !== 1 ? 'es' : ''}</div>
        </div>
        <div className="glass rounded-2xl border border-white/10 p-5 card-hover">
          <div className="flex items-center gap-2 mb-2 text-textMuted text-xs">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Total Recuperado
          </div>
          <div className={`text-2xl font-bold font-mono ${metrics.totalRecovered > 0 ? 'text-emerald-400' : 'text-text'}`}>
            {fmtUSD(metrics.totalRecovered)}
          </div>
          <div className="text-xs text-textMuted mt-1">P&L de cuentas fondeadas vinculadas</div>
        </div>
        <div className={`glass rounded-2xl border p-5 card-hover ${
          roiPositive ? 'border-emerald-400/20 glow-green' : metrics.netRoi < 0 ? 'border-red-400/20 glow-red' : 'border-white/10'
        }`}>
          <div className="flex items-center gap-2 mb-2 text-textMuted text-xs">
            <BadgeDollarSign className={`w-3.5 h-3.5 ${roiPositive ? 'text-emerald-400' : 'text-red-400'}`} /> ROI de Fondeo
          </div>
          <div className={`text-2xl font-bold font-mono ${roiPositive ? 'text-emerald-400' : metrics.netRoi < 0 ? 'text-red-400' : 'text-text'}`}>
            {metrics.netRoi > 0 ? '+' : ''}{metrics.netRoi.toFixed(1)}%
          </div>
          <div className="text-xs text-textMuted mt-1">Recuperado vs. invertido</div>
        </div>
        <div className="glass rounded-2xl border border-white/10 p-5 card-hover">
          <div className="flex items-center gap-2 mb-2 text-textMuted text-xs">
            <TrendingDown className="w-3.5 h-3.5 text-red-400" /> Tasa de Aprobación
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {approvedPct}%
          </div>
          <div className="text-xs text-textMuted mt-1">Quemadas: <span className="text-red-400 font-mono">{blownPct}%</span></div>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20 text-textMuted gap-2">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Cargando inversiones...
        </div>
      )}

      {/* Empty state */}
      {!isLoading && investments.length === 0 && (
        <div className="glass rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center py-20 gap-3 text-textMuted">
          <BadgeDollarSign className="w-10 h-10 opacity-20" />
          <p className="text-sm">No registraste ninguna compra de evaluación.</p>
          <button onClick={openNew} className="btn-primary mt-2 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Registrar primera inversión
          </button>
        </div>
      )}

      {/* Desktop table */}
      {!isLoading && investments.length > 0 && (
        <>
          <div className="hidden md:block glass rounded-2xl border border-white/10 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-xs text-textMuted bg-white/2">
                  <th className="p-4 font-medium">Fecha</th>
                  <th className="p-4 font-medium">Proveedor</th>
                  <th className="p-4 font-medium">Monto</th>
                  <th className="p-4 font-medium">Estado</th>
                  <th className="p-4 font-medium">Cuenta Vinculada</th>
                  <th className="p-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {investments.map(inv => {
                  const style = STATUS_STYLE[inv.status];
                  const linkedAccount = accounts.find(a => a.id === inv.trading_account_id);
                  return (
                    <tr key={inv.id} className="hover:bg-white/3 transition group text-sm">
                      <td className="p-4 text-textMuted font-mono text-xs">{inv.investment_date}</td>
                      <td className="p-4 font-semibold text-text">{inv.provider}</td>
                      <td className="p-4 font-mono font-bold text-text">{fmtUSD(inv.amount_invested)}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold border ${style.bg} ${style.text}`}>
                          {style.label}
                        </span>
                      </td>
                      <td className="p-4 text-textMuted">{linkedAccount?.name || '—'}</td>
                      <td className="p-4">
                        <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition">
                          <button onClick={() => openEdit(inv)} className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-textMuted transition">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(inv.id)} disabled={deletingId === inv.id}
                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 transition disabled:opacity-50">
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

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {investments.map(inv => {
              const style = STATUS_STYLE[inv.status];
              const linkedAccount = accounts.find(a => a.id === inv.trading_account_id);
              return (
                <div key={inv.id} className="glass rounded-2xl border border-white/10 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-bold text-text">{inv.provider}</div>
                      <div className="text-xs text-textMuted font-mono mt-0.5">{inv.investment_date}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold font-mono text-text">{fmtUSD(inv.amount_invested)}</div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase ${style.bg} ${style.text}`}>
                        {style.label}
                      </span>
                    </div>
                  </div>
                  {linkedAccount && (
                    <div className="text-xs text-textMuted mb-3 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                      Cuenta: {linkedAccount.name}
                    </div>
                  )}
                  {inv.notes && <div className="text-xs text-textMuted mb-3 border-t border-white/5 pt-2">{inv.notes}</div>}
                  <div className="flex gap-2 pt-2 border-t border-white/5">
                    <button onClick={() => openEdit(inv)} className="flex items-center gap-1.5 text-xs text-textMuted hover:text-text">
                      <Edit2 className="w-3 h-3" /> Editar
                    </button>
                    <button onClick={() => handleDelete(inv.id)} disabled={deletingId === inv.id}
                      className="flex items-center gap-1.5 text-xs text-red-400/70 hover:text-red-400 ml-auto disabled:opacity-50">
                      <Trash2 className="w-3 h-3" /> Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-surface border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative my-8">
            <button onClick={closeForm} className="absolute right-4 top-4 p-2 text-textMuted hover:text-text rounded-full hover:bg-white/5 transition">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-text mb-6">
              {editingInvestment ? 'Editar Inversión' : 'Nueva Inversión'}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              {formError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-textMuted mb-1.5">Proveedor *</label>
                <input type="text" required value={formData.provider}
                  onChange={e => setFormData({ ...formData, provider: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 text-text rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/60"
                  placeholder="FTMO, MyFundedFX, The5ers..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-textMuted mb-1.5">Monto (USD) *</label>
                  <input type="number" step="0.01" required value={formData.amount_invested}
                    onChange={e => setFormData({ ...formData, amount_invested: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 text-text rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/60 font-mono"
                    placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-textMuted mb-1.5">Fecha *</label>
                  <input type="date" required value={formData.investment_date}
                    onChange={e => setFormData({ ...formData, investment_date: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 text-text rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/60" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-textMuted mb-1.5">Estado</label>
                <select value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as InvestmentStatus })}
                  className="w-full bg-white/5 border border-white/10 text-text rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/60">
                  <option value="pendiente">🕐 Pendiente — en evaluación</option>
                  <option value="aprobada">✅ Aprobada — fondeado</option>
                  <option value="rechazada">❌ Rechazada — quemada</option>
                  <option value="reintentando">🔄 Retry — reintentando</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-textMuted mb-1.5">Vincular a Cuenta (opcional)</label>
                <select value={formData.trading_account_id}
                  onChange={e => setFormData({ ...formData, trading_account_id: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 text-text rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/60">
                  <option value="">Sin vincular</option>
                  {fundedAccounts.length > 0 ? (
                    fundedAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)
                  ) : (
                    accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)
                  )}
                </select>
                <p className="text-xs text-textMuted mt-1">Vinculá cuando pases la evaluación para ver el ROI real.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-textMuted mb-1.5">Notas</label>
                <textarea value={formData.notes} rows={2}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 text-text rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/60 resize-none"
                  placeholder="Tamaño de cuenta, reglas especiales..." />
              </div>
              <button type="submit" disabled={isSaving}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed">
                {isSaving ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Guardando...
                  </span>
                ) : (editingInvestment ? 'Actualizar Inversión' : 'Registrar Inversión')}
              </button>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default FundingPage;
