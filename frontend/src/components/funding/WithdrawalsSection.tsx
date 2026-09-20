import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAccounts, ALL_ACCOUNTS_ID } from '../../contexts/AccountContext';
import { useWithdrawals, getNetAmount } from '../../hooks/useWithdrawals';
import type { Withdrawal, WithdrawalMethod, WithdrawalStatus } from '../../hooks/useWithdrawals';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, X, AlertCircle, ArrowDownToLine, TrendingUp, PiggyBank, Calendar, PieChart, Info, Search } from 'lucide-react';

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

interface FormData {
  trading_account_id: string;
  withdrawal_date: string;
  amount: string;
  commission_percentage: string;
  method: WithdrawalMethod;
  method_details: string;
  status: WithdrawalStatus;
  notes: string;
}

const EMPTY_FORM: FormData = {
  trading_account_id: '',
  withdrawal_date: new Date().toISOString().split('T')[0],
  amount: '',
  commission_percentage: '',
  method: 'billetera_virtual',
  method_details: '',
  status: 'procesado',
  notes: ''
};

export const WithdrawalsSection: React.FC<{ onChanged?: () => void | Promise<void> }> = ({ onChanged }) => {
  const { user } = useAuth();
  const { accounts, selectedAccountId } = useAccounts();
  const { withdrawals, metrics, isLoading, refresh } = useWithdrawals();
  
  const fundedAccounts = accounts.filter(a => a.account_type === 'fondeada');
  const isAll = selectedAccountId === ALL_ACCOUNTS_ID;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingWithdrawal, setEditingWithdrawal] = useState<Withdrawal | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [accountSearch, setAccountSearch] = useState('');

  // ── Preview en tiempo real ────────────────────────────────────────────────
  const previewGross = parseFloat(formData.amount) || 0;
  const previewPct = parseInt(formData.commission_percentage, 10) || 0;
  const previewNet = previewGross > 0 ? previewGross * (1 - previewPct / 100) : 0;
  const hasCommission = previewGross > 0 && previewPct > 0;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const openNew = () => {
    setEditingWithdrawal(null);
    setFormData({
      ...EMPTY_FORM,
      trading_account_id: selectedAccountId !== ALL_ACCOUNTS_ID ? selectedAccountId : (fundedAccounts[0]?.id || accounts[0]?.id || ''),
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
      commission_percentage: w.commission_percentage != null ? w.commission_percentage.toString() : '',
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

    const commissionRaw = formData.commission_percentage.trim();
    const commissionValue = commissionRaw === '' ? null : parseInt(commissionRaw, 10);

    const payload = {
      user_id: user.id,
      trading_account_id: formData.trading_account_id,
      withdrawal_date: formData.withdrawal_date,
      amount: parseFloat(formData.amount),
      commission_percentage: commissionValue,
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
      await refresh();
      await onChanged?.();
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
    await refresh();
    await onChanged?.();
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
            <span className="sc-lbl flex items-center gap-2"><ArrowDownToLine className="w-3.5 h-3.5 text-acc" /> Total Recibido (neto)</span>
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
                    const netAmt = getNetAmount(w);
                    const hasComm = w.commission_percentage != null && w.commission_percentage > 0;
                    return (
                      <tr key={w.id}>
                        <td className="mono">{w.withdrawal_date}</td>
                        <td className="sym">{accountName}</td>
                        <td>
                          {hasComm ? (
                            <div>
                              <div className="mono text-textMuted text-xs line-through">{fmtUSD(w.amount)} bruto</div>
                              <div className="mono pos font-semibold">{fmtUSD(netAmt)} neto</div>
                              <div className="sc-sub text-[10px]">{w.commission_percentage}% comisión prop firm</div>
                            </div>
                          ) : (
                            <span className="mono pos">{fmtUSD(w.amount)}</span>
                          )}
                        </td>
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
                <div className="relative mb-2">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="search"
                    value={accountSearch}
                    onChange={e => setAccountSearch(e.target.value)}
                    placeholder="Buscar cuenta por nombre..."
                    className="input text-sm"
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
                <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto p-2 border border-white/10 rounded-lg bg-black/20">
                  {accounts
                    .filter(a => a.name.toLowerCase().includes(accountSearch.toLowerCase()))
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(a => {
                      const isSelected = formData.trading_account_id === a.id;
                      const fmtBal = a.current_balance != null
                        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(a.current_balance)
                        : null;
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, trading_account_id: a.id })}
                          className={`flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                            isSelected
                              ? 'border-primary/50 bg-primary/10'
                              : 'border-white/5 bg-white/5 hover:bg-white/10'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                            isSelected ? 'border-primary' : 'border-white/30'
                          }`}>
                            {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{a.name}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {a.account_type === 'fondeada' && a.funded_phase && (
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                  a.funded_phase === 'verificada' ? 'tag tag-win' :
                                  a.funded_phase === 'fase_2' ? 'tag tag-info' : 'tag tag-warn'
                                }`}>
                                  {a.funded_phase === 'verificada' ? 'Fondeada' :
                                   a.funded_phase === 'fase_2' ? 'Fase 2' : 'Fase 1'}
                                </span>
                              )}
                              {fmtBal && (
                                <span className="text-xs text-textMuted">{fmtBal}</span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  }
                  {accounts.filter(a => a.name.toLowerCase().includes(accountSearch.toLowerCase())).length === 0 && (
                    <div className="p-4 text-center text-sm text-white/50">No se encontraron cuentas</div>
                  )}
                </div>
                {/* Hidden input to keep form validation */}
                <input type="hidden" required value={formData.trading_account_id} />
              </div>

              <div className="m-grid">
                <div className="field">
                  <label>Monto Bruto (USD) *</label>
                  <input type="number" step="0.01" required value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    className="input mono text-acc"
                    placeholder="0" />
                  <p className="sc-sub">Monto solicitado / aprobado por la prop firm</p>
                </div>
                <div className="field">
                  <label>Fecha *</label>
                  <input type="date" required value={formData.withdrawal_date}
                    onChange={e => setFormData({ ...formData, withdrawal_date: e.target.value })}
                    className="input" />
                </div>
              </div>

              {/* Comisión prop firm */}
              <div className="field">
                <label className="flex items-center gap-1.5">
                  Comisión de la prop firm (%) 
                  <span className="text-textMuted font-normal text-xs">(opcional)</span>
                </label>
                <select
                  value={formData.commission_percentage}
                  onChange={e => setFormData({ ...formData, commission_percentage: e.target.value })}
                  className="input"
                >
                  <option value="">Sin comisión (0% — trader se queda todo)</option>
                  {Array.from({ length: 100 }, (_, i) => i + 1).map(v => (
                    <option key={v} value={v}>{v}% — prop firm retiene, trader recibe {100 - v}%</option>
                  ))}
                </select>
                <p className="sc-sub flex items-center gap-1">
                  <Info className="w-3 h-3 shrink-0" />
                  Typical splits: 70/30, 80/20, 90/10. Dejá vacío si no aplica o ya es el neto.
                </p>
              </div>

              {/* Preview en tiempo real */}
              {previewGross > 0 && (
                <div
                  className="rounded-lg p-3 border"
                  style={{
                    background: hasCommission
                      ? 'color-mix(in srgb, var(--acc) 8%, var(--surface))'
                      : 'color-mix(in srgb, var(--primary) 6%, var(--surface))',
                    borderColor: hasCommission ? 'color-mix(in srgb, var(--acc) 25%, transparent)' : 'var(--line)',
                  }}
                >
                  {hasCommission ? (
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between text-textMuted">
                        <span>Bruto solicitado</span>
                        <span className="mono">{fmtUSD(previewGross)}</span>
                      </div>
                      <div className="flex justify-between text-textMuted">
                        <span>Comisión prop firm ({previewPct}%)</span>
                        <span className="mono text-loss">− {fmtUSD(previewGross * previewPct / 100)}</span>
                      </div>
                      <div className="h-px" style={{ background: 'var(--line)', margin: '4px 0' }} />
                      <div className="flex justify-between font-bold text-base">
                        <span className="text-text">Vas a recibir</span>
                        <span className="mono accent">US$ {previewNet.toFixed(0)} neto</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-textMuted">Vas a recibir</span>
                      <span className="mono accent">US$ {previewGross.toFixed(0)} neto</span>
                    </div>
                  )}
                </div>
              )}

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
