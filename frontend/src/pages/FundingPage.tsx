import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useFundedInvestments } from '../hooks/useFundedInvestments';
import type { FundedInvestment, InvestmentStatus } from '../hooks/useFundedInvestments';
import { useTrades } from '../hooks/useTrades';
import { useAccounts } from '../contexts/AccountContext';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BadgeDollarSign, Plus, Edit2, Trash2, X, Target, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { WithdrawalsSection } from '../components/funding/WithdrawalsSection';

const fmtUSD = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

const STATUS_STYLE: Record<InvestmentStatus, { tag: string; label: string }> = {
  pendiente:    { tag: 'tag tag-warn',   label: 'Pendiente' },
  aprobada:     { tag: 'tag tag-win',    label: 'Aprobada ✓' },
  rechazada:    { tag: 'tag tag-loss',   label: 'Rechazada' },
  reintentando: { tag: 'tag tag-info',   label: 'Retry' },
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

  const [activeTab, setActiveTab] = useState<'evaluaciones' | 'retiros'>('evaluaciones');
  const [searchParams, setSearchParams] = useSearchParams();

  // Si llegamos desde AccountsPage con ?account=<id>, pre-abrir el form
  useEffect(() => {
    const accountParam = searchParams.get('account');
    if (accountParam) {
      setEditingInvestment(null);
      setFormData(prev => ({
        ...prev,
        provider: '',
        amount_invested: '',
        investment_date: new Date().toISOString().split('T')[0],
        status: 'pendiente',
        trading_account_id: accountParam,
        notes: '',
      }));
      setFormError('');
      setIsFormOpen(true);
      // Limpiar el param de la URL sin recargar
      setSearchParams({}, { replace: true });
    }
  }, []);

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
      {/* Header and Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-[var(--line)] pb-4">
        <div className="seg">
          <button 
            type="button"
            onClick={() => setActiveTab('evaluaciones')}
            className={activeTab === 'evaluaciones' ? 'on-acc' : ''}
          >
            Evaluaciones
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('retiros')}
            className={activeTab === 'retiros' ? 'on-acc' : ''}
          >
            Retiros
          </button>
        </div>
      </div>

      {activeTab === 'evaluaciones' ? (
        <>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-text flex items-center gap-2">
              <BadgeDollarSign className="w-5 h-5 text-primary" /> Fondeos
            </h2>
            <button onClick={openNew} className="btn btn-primary btn-sm flex items-center gap-2">
              <Plus className="w-4 h-4" /> Nueva Inversión
            </button>
          </div>

          {/* Summary cards */}
          <div className="stat-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <div className="stat-card">
              <div className="sc-top">
                <span className="sc-lbl flex items-center gap-2"><Target className="w-3.5 h-3.5 text-primary" /> Total Invertido</span>
              </div>
              <div className="sc-val accent mono">{fmtUSD(metrics.totalInvested)}</div>
              <div className="sc-sub">{investments.length} evaluación{investments.length !== 1 ? 'es' : ''}</div>
            </div>
            <div className="stat-card">
              <div className="sc-top">
                <span className="sc-lbl flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5 text-acc" /> Total Recuperado</span>
              </div>
              <div className={`sc-val mono ${metrics.totalRecovered > 0 ? 'accent' : ''}`}>
                {fmtUSD(metrics.totalRecovered)}
              </div>
              <div className="sc-sub">P&L de cuentas fondeadas vinculadas</div>
            </div>
            <div className="stat-card">
              <div className="sc-top">
                <span className="sc-lbl flex items-center gap-2"><BadgeDollarSign className={`w-3.5 h-3.5 ${roiPositive ? 'text-acc' : 'text-loss'}`} /> ROI de Fondeo</span>
              </div>
              <div className={`sc-val mono ${roiPositive ? 'accent' : metrics.netRoi < 0 ? 'negative' : ''}`}>
                {metrics.netRoi > 0 ? '+' : ''}{metrics.netRoi.toFixed(1)}%
              </div>
              <div className="sc-sub">Recuperado vs. invertido</div>
            </div>
            <div className="stat-card">
              <div className="sc-top">
                <span className="sc-lbl flex items-center gap-2"><TrendingDown className="w-3.5 h-3.5 text-loss" /> Tasa de Aprobación</span>
              </div>
              <div className="sc-val accent mono">{approvedPct}%</div>
              <div className="sc-sub">Quemadas: <span className="text-loss mono">{blownPct}%</span></div>
            </div>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-20 text-textMuted gap-2">
              <span className="spinner" />
              Cargando inversiones...
            </div>
          )}

          {!isLoading && investments.length === 0 && (
            <div className="panel-card border-dashed flex flex-col items-center justify-center py-20 gap-3 text-textMuted">
              <BadgeDollarSign className="w-10 h-10 opacity-20" />
              <p className="text-sm">No registraste ninguna compra de evaluación.</p>
              <button onClick={openNew} className="btn btn-primary btn-sm mt-2">
                <Plus className="w-4 h-4" /> Registrar primera inversión
              </button>
            </div>
          )}

          {!isLoading && investments.length > 0 && (
            <>
              <div className="hidden md:block ptable-wrap">
                <table className="ptable">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Proveedor</th>
                      <th>Monto</th>
                      <th>Estado</th>
                      <th>Cuenta Vinculada</th>
                      <th style={{ textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {investments.map(inv => {
                      const style = STATUS_STYLE[inv.status];
                      const linkedAccount = accounts.find(a => a.id === inv.trading_account_id);
                      return (
                        <tr key={inv.id}>
                          <td className="mono">{inv.investment_date}</td>
                          <td className="sym">{inv.provider}</td>
                          <td className="sym">{fmtUSD(inv.amount_invested)}</td>
                          <td>
                            <span className={style.tag}>{style.label}</span>
                          </td>
                          <td>{linkedAccount?.name || '—'}</td>
                          <td>
                            <div className="flex justify-end gap-1.5">
                              <button onClick={() => openEdit(inv)} className="btn-icon" style={{ width: 32, height: 32 }}>
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDelete(inv.id)} disabled={deletingId === inv.id}
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

              <div className="md:hidden space-y-3">
                {investments.map(inv => {
                  const style = STATUS_STYLE[inv.status];
                  const linkedAccount = accounts.find(a => a.id === inv.trading_account_id);
                  return (
                    <div key={inv.id} className="fund-card">
                      <div className="fund-head">
                        <div>
                          <div className="fund-name">{inv.provider}</div>
                          <div className="fund-sub">{inv.investment_date}</div>
                        </div>
                        <div className="text-right">
                          <div className="fs-v">{fmtUSD(inv.amount_invested)}</div>
                          <span className={style.tag}>{style.label}</span>
                        </div>
                      </div>
                      {linkedAccount && (
                        <div className="fund-sub mb-3 flex items-center gap-1">
                          <span className="tag tag-win" style={{ width: 6, height: 6, padding: 0, minWidth: 6 }} />
                          Cuenta: {linkedAccount.name}
                        </div>
                      )}
                      {inv.notes && <div className="fund-sub mb-3 border-t border-[var(--line)] pt-2">{inv.notes}</div>}
                      <div className="flex gap-2 pt-2 border-t border-[var(--line)]">
                        <button onClick={() => openEdit(inv)} className="btn btn-ghost btn-sm">
                          <Edit2 className="w-3 h-3" /> Editar
                        </button>
                        <button onClick={() => handleDelete(inv.id)} disabled={deletingId === inv.id}
                          className="btn btn-danger btn-sm ml-auto">
                          <Trash2 className="w-3 h-3" /> Eliminar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {isFormOpen && (
            <div className="modal" onClick={closeForm}>
              <div className="modal-card" onClick={e => e.stopPropagation()}>
                <div className="modal-head">
                  <h3>{editingInvestment ? 'Editar Inversión' : 'Nueva Inversión'}</h3>
                  <button type="button" onClick={closeForm} className="btn-icon">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form id="funding-form" onSubmit={handleSave} className="modal-body space-y-4">
                  {formError && (
                    <div className="alert alert-err">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {formError}
                    </div>
                  )}
                  <div className="field">
                    <label>Proveedor *</label>
                    <input type="text" required value={formData.provider}
                      onChange={e => setFormData({ ...formData, provider: e.target.value })}
                      className="input"
                      placeholder="FTMO, MyFundedFX, The5ers..." />
                  </div>
                  <div className="m-grid">
                    <div className="field">
                      <label>Monto (USD) *</label>
                      <input type="number" step="0.01" required value={formData.amount_invested}
                        onChange={e => setFormData({ ...formData, amount_invested: e.target.value })}
                        className="input mono"
                        placeholder="0" />
                    </div>
                    <div className="field">
                      <label>Fecha *</label>
                      <input type="date" required value={formData.investment_date}
                        onChange={e => setFormData({ ...formData, investment_date: e.target.value })}
                        className="input" />
                    </div>
                  </div>
                  <div className="field">
                    <label>Estado</label>
                    <select value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value as InvestmentStatus })}
                      className="input">
                      <option value="pendiente">🕐 Pendiente — en evaluación</option>
                      <option value="aprobada">✅ Aprobada — fondeado</option>
                      <option value="rechazada">❌ Rechazada — quemada</option>
                      <option value="reintentando">🔄 Retry — reintentando</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Vincular a Cuenta (opcional)</label>
                    <select value={formData.trading_account_id}
                      onChange={e => setFormData({ ...formData, trading_account_id: e.target.value })}
                      className="input">
                      <option value="">Sin vincular</option>
                      {fundedAccounts.length > 0 ? (
                        fundedAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)
                      ) : (
                        accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)
                      )}
                    </select>
                    <p className="sc-sub">Vinculá cuando pases la evaluación para ver el ROI real.</p>
                  </div>
                  <div className="field">
                    <label>Notas</label>
                    <textarea value={formData.notes} rows={2}
                      onChange={e => setFormData({ ...formData, notes: e.target.value })}
                      className="input"
                      placeholder="Tamaño de cuenta, reglas especiales..." />
                  </div>
                </form>
                <div className="modal-foot">
                  <button type="submit" form="funding-form" disabled={isSaving}
                    className="btn btn-primary w-full">
                    {isSaving ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="spin" />
                        Guardando...
                      </span>
                    ) : (editingInvestment ? 'Actualizar Inversión' : 'Registrar Inversión')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <WithdrawalsSection />
      )}
    </AppLayout>
  );
};

export default FundingPage;
