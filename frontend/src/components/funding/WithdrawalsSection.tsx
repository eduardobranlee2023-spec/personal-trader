import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAccounts, ALL_ACCOUNTS_ID } from '../../contexts/AccountContext';
import { useWithdrawals, Withdrawal, WithdrawalMethod, WithdrawalStatus } from '../../hooks/useWithdrawals';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, X, AlertCircle, ArrowDownToLine, TrendingUp, PiggyBank, Calendar, PieChart } from 'lucide-react';

const fmtUSD = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

const METHOD_LABELS: Record<WithdrawalMethod, string> = {
  billetera_virtual: 'Billetera Virtual',
  transferencia_bancaria: 'Transferencia',
  cripto: 'Cripto',
  otro: 'Otro'
};

const STATUS_STYLE: Record<WithdrawalStatus, { bg: string; text: string; label: string }> = {
  pendiente: { bg: 'bg-amber-400/10 border-amber-400/20', text: 'text-amber-400', label: 'Pendiente' },
  procesado: { bg: 'bg-emerald-400/10 border-emerald-400/20', text: 'text-emerald-400', label: 'Procesado' },
  rechazado: { bg: 'bg-red-400/10 border-red-400/20', text: 'text-red-400', label: 'Rechazado' },
};

export const WithdrawalsSection: React.FC = () => {
  const { user } = useAuth();
  const { accounts, selectedAccountId } = useAccounts();
  const { withdrawals, metrics, isLoading, refresh } = useWithdrawals();
  
  const fundedAccounts = accounts.filter(a => a.account_type === 'fondeada');
  const isAll = selectedAccountId === ALL_ACCOUNTS_ID;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingWithdrawal, setEditingWithdrawal] = useState<Withdrawal | null>(null);
  const [formData, setFormData] = useState({
    trading_account_id: '',
    withdrawal_date: new Date().toISOString().split('T')[0],
    amount: '',
    method: 'billetera_virtual' as WithdrawalMethod,
    method_details: '',
    status: 'procesado' as WithdrawalStatus,
    notes: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openNew = () => {
    setEditingWithdrawal(null);
    setFormData({
      trading_account_id: selectedAccountId !== ALL_ACCOUNTS_ID ? selectedAccountId : (fundedAccounts[0]?.id || ''),
      withdrawal_date: new Date().toISOString().split('T')[0],
      amount: '',
      method: 'billetera_virtual',
      method_details: '',
      status: 'procesado',
      notes: ''
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const openEdit = (w: Withdrawal) => {
    setEditingWithdrawal(w);
    setFormData({
      trading_account_id: w.trading_account_id,
      withdrawal_date: w.withdrawal_date,
      amount: w.amount.toString(),
      method: w.method,
      method_details: w.method_details || '',
      status: w.status,
      notes: w.notes || ''
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingWithdrawal(null);
    setFormError('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!formData.trading_account_id) { setFormError('Debes seleccionar una cuenta.'); return; }
    if (!formData.amount || isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
      setFormError('Ingresá un monto válido mayor a 0.');
      return;
    }
    setIsSaving(true);
    setFormError('');

    const payload = {
      user_id: user.id,
      trading_account_id: formData.trading_account_id,
      withdrawal_date: formData.withdrawal_date,
      amount: parseFloat(formData.amount),
      method: formData.method,
      method_details: (formData.method === 'billetera_virtual' || formData.method === 'otro' || formData.method === 'cripto') ? formData.method_details : null,
      status: formData.status,
      notes: formData.notes || null,
    };

    try {
      const { error } = editingWithdrawal
        ? await supabase.from('withdrawals').update(payload).eq('id', editingWithdrawal.id)
        : await supabase.from('withdrawals').insert(payload);

      if (error) { setFormError(error.message); return; }
      refresh();
      closeForm();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar este retiro?')) return;
    setDeletingId(id);
    await supabase.from('withdrawals').delete().eq('id', id);
    setDeletingId(null);
    refresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text">Tus Retiros</h2>
          <p className="text-textMuted text-sm mt-0.5">Gestión de pagos y profit splits.</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> Registrar Retiro
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass rounded-2xl border border-white/10 p-5 card-hover">
          <div className="flex items-center gap-2 mb-2 text-textMuted text-xs">
            <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-400" /> Total Retirado
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{fmtUSD(metrics.totalWithdrawn)}</div>
          <div className="text-xs text-textMuted mt-1">{metrics.totalWithdrawalsCount} retiros procesados</div>
        </div>
        
        <div className="glass rounded-2xl border border-white/10 p-5 card-hover">
          <div className="flex items-center gap-2 mb-2 text-textMuted text-xs">
            <TrendingUp className="w-3.5 h-3.5 text-primary" /> % de Ganancia Retirada
          </div>
          <div className="text-2xl font-bold font-mono text-text">
            {metrics.withdrawnPct !== null ? `${metrics.withdrawnPct.toFixed(1)}%` : 'N/A'}
          </div>
          <div className="text-xs text-textMuted mt-1">
            Ganancia neta: {fmtUSD(metrics.netProfit)}
          </div>
        </div>

        <div className="glass rounded-2xl border border-white/10 p-5 card-hover">
          <div className="flex items-center gap-2 mb-2 text-textMuted text-xs">
            <PiggyBank className="w-3.5 h-3.5 text-purple-400" /> Capital Creciendo
          </div>
          <div className="text-2xl font-bold font-mono text-purple-400">
            {metrics.reinvestedPct !== null ? `${metrics.reinvestedPct.toFixed(1)}%` : 'N/A'}
          </div>
          <div className="text-xs text-textMuted mt-1">Beneficios dejados en cuenta</div>
        </div>

        <div className="glass rounded-2xl border border-white/10 p-5 card-hover">
          <div className="flex items-center gap-2 mb-2 text-textMuted text-xs">
            <Calendar className="w-3.5 h-3.5 text-blue-400" /> Frecuencia de Retiro
          </div>
          <div className="text-2xl font-bold font-mono text-text">
            {metrics.frequencyDays !== null ? `${Math.round(metrics.frequencyDays)} días` : '—'}
          </div>
          <div className="text-xs text-textMuted mt-1">Promedio: {fmtUSD(metrics.averageWithdrawal)} c/u</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Method Distribution or Account Comparison */}
        <div className="glass rounded-2xl border border-white/10 p-5 lg:col-span-1">
          {isAll && metrics.byAccount.length > 0 ? (
            <>
              <h3 className="font-semibold text-text flex items-center gap-2 mb-4 text-sm">
                <PieChart className="w-4 h-4 text-primary" /> Top Cuentas por Retiros
              </h3>
              <div className="space-y-3">
                {metrics.byAccount.slice(0, 5).map(acc => (
                  <div key={acc.account.id} className="text-sm">
                    <div className="flex justify-between text-text mb-1">
                      <span className="truncate pr-2">{acc.account.name}</span>
                      <span className="font-mono font-bold">{fmtUSD(acc.totalWithdrawn)}</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-primary h-full rounded-full" 
                        style={{ width: `${acc.withdrawnPct ? Math.min(acc.withdrawnPct, 100) : 0}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-textMuted mt-1">
                      <span>{acc.withdrawnPct !== null ? `${acc.withdrawnPct.toFixed(0)}% de PnL` : ''}</span>
                      <span>PnL: {fmtUSD(acc.netProfit)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <h3 className="font-semibold text-text flex items-center gap-2 mb-4 text-sm">
                <PieChart className="w-4 h-4 text-primary" /> Distribución por Método
              </h3>
              {metrics.totalWithdrawn > 0 ? (
                <div className="space-y-3">
                  {Object.entries(metrics.methodDistribution)
                    .filter(([, val]) => val > 0)
                    .sort(([, a], [, b]) => b - a)
                    .map(([method, amount]) => {
                      const pct = (amount / metrics.totalWithdrawn) * 100;
                      return (
                        <div key={method} className="text-sm">
                          <div className="flex justify-between text-text mb-1">
                            <span>{METHOD_LABELS[method as WithdrawalMethod]}</span>
                            <span className="font-mono font-bold">{pct.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <div className="text-[10px] text-textMuted mt-1 text-right">{fmtUSD(amount)}</div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center text-textMuted text-sm py-8">No hay retiros procesados.</div>
              )}
            </>
          )}
        </div>

        {/* Withdrawals Table */}
        <div className="glass rounded-2xl border border-white/10 overflow-hidden lg:col-span-2 flex flex-col">
          <div className="p-4 border-b border-white/10 font-semibold text-sm">Historial de Retiros</div>
          
          {isLoading ? (
            <div className="p-8 text-center text-textMuted flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Cargando...
            </div>
          ) : withdrawals.length === 0 ? (
             <div className="p-8 text-center text-textMuted text-sm flex flex-col items-center gap-2">
               <ArrowDownToLine className="w-8 h-8 opacity-20" />
               No se encontraron retiros.
             </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-textMuted bg-white/2">
                    <th className="p-4 font-medium">Fecha</th>
                    <th className="p-4 font-medium">Cuenta</th>
                    <th className="p-4 font-medium">Monto</th>
                    <th className="p-4 font-medium">Método</th>
                    <th className="p-4 font-medium">Estado</th>
                    <th className="p-4 font-medium text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {withdrawals.map(w => {
                    const style = STATUS_STYLE[w.status];
                    const accountName = accounts.find(a => a.id === w.trading_account_id)?.name || '—';
                    return (
                      <tr key={w.id} className="hover:bg-white/3 transition group text-sm">
                        <td className="p-4 text-textMuted font-mono text-xs">{w.withdrawal_date}</td>
                        <td className="p-4 font-semibold text-text">{accountName}</td>
                        <td className="p-4 font-mono font-bold text-emerald-400">{fmtUSD(w.amount)}</td>
                        <td className="p-4">
                          <div className="text-text">{METHOD_LABELS[w.method]}</div>
                          {w.method_details && <div className="text-xs text-textMuted">{w.method_details}</div>}
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold border ${style.bg} ${style.text}`}>
                            {style.label}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition">
                            <button onClick={() => openEdit(w)} className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-textMuted transition">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(w.id)} disabled={deletingId === w.id}
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
          )}
        </div>
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-surface border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative my-8">
            <button onClick={closeForm} className="absolute right-4 top-4 p-2 text-textMuted hover:text-text rounded-full hover:bg-white/5 transition">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-text mb-6">
              {editingWithdrawal ? 'Editar Retiro' : 'Registrar Retiro'}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              {formError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-textMuted mb-1.5">Cuenta de Trading *</label>
                <select required value={formData.trading_account_id}
                  onChange={e => setFormData({ ...formData, trading_account_id: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 text-text rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/60">
                  <option value="" disabled>Seleccionar cuenta...</option>
                  {fundedAccounts.length > 0 && <optgroup label="Cuentas Fondeadas">
                    {fundedAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </optgroup>}
                  <optgroup label="Otras Cuentas">
                    {accounts.filter(a => a.account_type !== 'fondeada').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </optgroup>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-textMuted mb-1.5">Monto (USD) *</label>
                  <input type="number" step="0.01" required value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 text-text rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/60 font-mono text-emerald-400"
                    placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-textMuted mb-1.5">Fecha *</label>
                  <input type="date" required value={formData.withdrawal_date}
                    onChange={e => setFormData({ ...formData, withdrawal_date: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 text-text rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/60" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-textMuted mb-1.5">Método *</label>
                <select required value={formData.method}
                  onChange={e => setFormData({ ...formData, method: e.target.value as WithdrawalMethod })}
                  className="w-full bg-white/5 border border-white/10 text-text rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/60">
                  <option value="billetera_virtual">Billetera Virtual (PayPal, Deel, etc)</option>
                  <option value="cripto">Cripto (USDT, BTC, etc)</option>
                  <option value="transferencia_bancaria">Transferencia Bancaria</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              {(formData.method === 'billetera_virtual' || formData.method === 'cripto' || formData.method === 'otro') && (
                <div>
                  <label className="block text-sm font-medium text-textMuted mb-1.5">Detalle del Método</label>
                  <input type="text" value={formData.method_details}
                    onChange={e => setFormData({ ...formData, method_details: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 text-text rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/60"
                    placeholder={formData.method === 'cripto' ? 'USDT TRC20...' : 'PayPal...'} />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-textMuted mb-1.5">Estado</label>
                <select value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as WithdrawalStatus })}
                  className="w-full bg-white/5 border border-white/10 text-text rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/60">
                  <option value="procesado">✅ Procesado (Recibido)</option>
                  <option value="pendiente">🕐 Pendiente</option>
                  <option value="rechazado">❌ Rechazado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-textMuted mb-1.5">Notas</label>
                <textarea value={formData.notes} rows={2}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 text-text rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/60 resize-none"
                  placeholder="Detalles adicionales..." />
              </div>

              <button type="submit" disabled={isSaving}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed">
                {isSaving ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Guardando...
                  </span>
                ) : (editingWithdrawal ? 'Actualizar Retiro' : 'Registrar Retiro')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
