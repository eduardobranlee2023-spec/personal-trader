import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAccounts, ALL_ACCOUNTS_ID } from '../../contexts/AccountContext';
import { useWithdrawals } from '../../hooks/useWithdrawals';
import type { Withdrawal, WithdrawalMethod, WithdrawalStatus } from '../../hooks/useWithdrawals';
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

const STATUS_STYLE: Record<WithdrawalStatus, { tag: string; label: string }> = {
  pendiente: { tag: 'tag tag-warn', label: 'Pendiente' },
  procesado: { tag: 'tag tag-win', label: 'Procesado' },
  rechazado: { tag: 'tag tag-loss', label: 'Rechazado' },
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
        <button onClick={openNew} className="btn btn-primary btn-sm flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> Registrar Retiro
        </button>
      </div>

      {/* Summary Cards */}
      <div className="stat-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="stat-card">
          <div className="sc-top">
            <span className="sc-lbl flex items-center gap-2"><ArrowDownToLine className="w-3.5 h-3.5 text-acc" /> Total Retirado</span>
          </div>
          <div className="sc-val accent mono">{fmtUSD(metrics.totalWithdrawn)}</div>
          <div className="sc-sub">{metrics.totalWithdrawalsCount} retiros procesados</div>
        </div>
        
        <div className="stat-card">
          <div className="sc-top">
            <span className="sc-lbl flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5 text-primary" /> % de Ganancia Retirada</span>
          </div>
          <div className="sc-val mono">
            {metrics.withdrawnPct !== null ? `${metrics.withdrawnPct.toFixed(1)}%` : 'N/A'}
          </div>
          <div className="sc-sub">Ganancia neta: {fmtUSD(metrics.netProfit)}</div>
        </div>

        <div className="stat-card">
          <div className="sc-top">
            <span className="sc-lbl flex items-center gap-2"><PiggyBank className="w-3.5 h-3.5 text-info" /> Capital Creciendo</span>
          </div>
          <div className="sc-val text-info mono">
            {metrics.reinvestedPct !== null ? `${metrics.reinvestedPct.toFixed(1)}%` : 'N/A'}
          </div>
          <div className="sc-sub">Beneficios dejados en cuenta</div>
        </div>

        <div className="stat-card">
          <div className="sc-top">
            <span className="sc-lbl flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-info" /> Frecuencia de Retiro</span>
          </div>
          <div className="sc-val mono">
            {metrics.frequencyDays !== null ? `${Math.round(metrics.frequencyDays)} días` : '—'}
          </div>
          <div className="sc-sub">Promedio: {fmtUSD(metrics.averageWithdrawal)} c/u</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Method Distribution or Account Comparison */}
        <div className="panel-card p-5 lg:col-span-1">
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
                    <div className="bar">
                      <i style={{ width: `${acc.withdrawnPct ? Math.min(acc.withdrawnPct, 100) : 0}%` }} />
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
                          <div className="bar">
                            <i style={{ width: `${pct}%` }} />
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
        <div className="chart-box lg:col-span-2 flex flex-col">
          <div className="chart-head font-semibold">Historial de Retiros</div>
          
          {isLoading ? (
            <div className="p-8 text-center text-textMuted flex items-center justify-center gap-2">
              <span className="spinner" />
              Cargando...
            </div>
          ) : withdrawals.length === 0 ? (
             <div className="p-8 text-center text-textMuted text-sm flex flex-col items-center gap-2">
               <ArrowDownToLine className="w-8 h-8 opacity-20" />
               No se encontraron retiros.
             </div>
          ) : (
            <div className="ptable-wrap border-0 rounded-none">
              <table className="ptable">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Cuenta</th>
                    <th>Monto</th>
                    <th>Método</th>
                    <th>Estado</th>
                    <th style={{ textAlign: 'right' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map(w => {
                    const style = STATUS_STYLE[w.status];
                    const accountName = accounts.find(a => a.id === w.trading_account_id)?.name || '—';
                    return (
                      <tr key={w.id}>
                        <td className="mono">{w.withdrawal_date}</td>
                        <td className="sym">{accountName}</td>
                        <td className="pos">{fmtUSD(w.amount)}</td>
                        <td>
                          <div>{METHOD_LABELS[w.method]}</div>
                          {w.method_details && <div className="sc-sub">{w.method_details}</div>}
                        </td>
                        <td>
                          <span className={style.tag}>{style.label}</span>
                        </td>
                        <td>
                          <div className="flex justify-end gap-1.5">
                            <button onClick={() => openEdit(w)} className="btn-icon" style={{ width: 32, height: 32 }}>
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(w.id)} disabled={deletingId === w.id}
                              className="btn btn-danger btn-sm btn-icon" style={{ width: 32, height: 32, padding: 0 }}>
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
        <div className="modal" onClick={closeForm}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{editingWithdrawal ? 'Editar Retiro' : 'Registrar Retiro'}</h3>
              <button type="button" onClick={closeForm} className="btn-icon">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form id="withdrawal-form" onSubmit={handleSave} className="modal-body space-y-4">
              {formError && (
                <div className="alert alert-err">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}
              
              <div className="field">
                <label>Cuenta de Trading *</label>
                <select required value={formData.trading_account_id}
                  onChange={e => setFormData({ ...formData, trading_account_id: e.target.value })}
                  className="input">
                  <option value="" disabled>Seleccionar cuenta...</option>
                  {fundedAccounts.length > 0 && <optgroup label="Cuentas Fondeadas">
                    {fundedAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </optgroup>}
                  <optgroup label="Otras Cuentas">
                    {accounts.filter(a => a.account_type !== 'fondeada').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </optgroup>
                </select>
              </div>

              <div className="m-grid">
                <div className="field">
                  <label>Monto (USD) *</label>
                  <input type="number" step="0.01" required value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    className="input mono text-acc"
                    placeholder="0" />
                </div>
                <div className="field">
                  <label>Fecha *</label>
                  <input type="date" required value={formData.withdrawal_date}
                    onChange={e => setFormData({ ...formData, withdrawal_date: e.target.value })}
                    className="input" />
                </div>
              </div>

              <div className="field">
                <label>Método *</label>
                <select required value={formData.method}
                  onChange={e => setFormData({ ...formData, method: e.target.value as WithdrawalMethod })}
                  className="input">
                  <option value="billetera_virtual">Billetera Virtual (PayPal, Deel, etc)</option>
                  <option value="cripto">Cripto (USDT, BTC, etc)</option>
                  <option value="transferencia_bancaria">Transferencia Bancaria</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              {(formData.method === 'billetera_virtual' || formData.method === 'cripto' || formData.method === 'otro') && (
                <div className="field">
                  <label>Detalle del Método</label>
                  <input type="text" value={formData.method_details}
                    onChange={e => setFormData({ ...formData, method_details: e.target.value })}
                    className="input"
                    placeholder={formData.method === 'cripto' ? 'USDT TRC20...' : 'PayPal...'} />
                </div>
              )}

              <div className="field">
                <label>Estado</label>
                <select value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as WithdrawalStatus })}
                  className="input">
                  <option value="procesado">✅ Procesado (Recibido)</option>
                  <option value="pendiente">🕐 Pendiente</option>
                  <option value="rechazado">❌ Rechazado</option>
                </select>
              </div>

              <div className="field">
                <label>Notas</label>
                <textarea value={formData.notes} rows={2}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="input"
                  placeholder="Detalles adicionales..." />
              </div>
            </form>
            <div className="modal-foot">
              <button type="submit" form="withdrawal-form" disabled={isSaving}
                className="btn btn-primary w-full">
                {isSaving ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="spin" />
                    Guardando...
                  </span>
                ) : (editingWithdrawal ? 'Actualizar Retiro' : 'Registrar Retiro')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
