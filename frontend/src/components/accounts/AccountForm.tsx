import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { TradingAccount, AccountStatus, AccountType, FundedPhase } from '../../contexts/AccountContext';
import { X, Save, Loader2, AlertCircle, Trash2 } from 'lucide-react';

type Props = {
  account?: TradingAccount | null;
  onClose: () => void;
  onSaved: () => void;
};

const statusOptions: { value: AccountStatus; label: string; color: string }[] = [
  { value: 'activa', label: 'Activa', color: 'text-acc' },
  { value: 'pausada', label: 'Pausada', color: 'text-warn' },
  { value: 'quemada', label: 'Quemada', color: 'text-loss' },
  { value: 'pasada', label: 'Pasada (evaluación aprobada)', color: 'text-info' },
];

const typeOptions: { value: AccountType; label: string }[] = [
  { value: 'personal', label: 'Personal' },
  { value: 'fondeada', label: 'Fondeada / Prop Firm' },
];

const phaseOptions: { value: NonNullable<FundedPhase>; label: string; color: string; dot: string }[] = [
  { value: 'fase_1',    label: 'Fase 1 — Challenge inicial', color: 'text-warn',  dot: 'tag-warn' },
  { value: 'fase_2',    label: 'Fase 2 — Verificación',     color: 'text-info',  dot: 'tag-info' },
  { value: 'verificada', label: 'Verificada — Cuenta real',  color: 'text-acc',   dot: 'tag-win' },
];

const AccountForm: React.FC<Props> = ({ account, onClose, onSaved }) => {
  const { user } = useAuth();
  const isEdit = !!account;

  const [name, setName] = useState(account?.name ?? '');
  const [broker, setBroker] = useState(account?.broker_or_prop_firm ?? '');
  const [type, setType] = useState<AccountType>(account?.account_type ?? 'personal');
  const [currency, setCurrency] = useState(account?.currency ?? 'USD');
  const [initialBalance, setInitialBalance] = useState<string>(
    account?.initial_balance != null ? String(account.initial_balance) : ''
  );
  const [status, setStatus] = useState<AccountStatus>(account?.status ?? 'activa');
  const [fundedPhase, setFundedPhase] = useState<FundedPhase>(account?.funded_phase ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('El nombre de la cuenta es obligatorio.'); return; }
    setIsSaving(true);
    setError('');

    const payload = {
      user_id: user!.id,
      name: name.trim(),
      broker_or_prop_firm: broker.trim() || null,
      account_type: type,
      currency,
      initial_balance: initialBalance !== '' ? parseFloat(initialBalance) : null,
      status,
      funded_phase: type === 'fondeada' ? fundedPhase : null,
    };

    let err;
    if (isEdit) {
      ({ error: err } = await supabase
        .from('trading_accounts')
        .update(payload)
        .eq('id', account!.id));
    } else {
      ({ error: err } = await supabase
        .from('trading_accounts')
        .insert(payload));
    }

    if (err) {
      setError(err.message);
    } else {
      onSaved();
      onClose();
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setIsDeleting(true);
    const { error: err } = await supabase
      .from('trading_accounts')
      .delete()
      .eq('id', account!.id);
    if (err) {
      setError(err.message);
      setIsDeleting(false);
    } else {
      onSaved();
      onClose();
    }
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{isEdit ? 'Editar cuenta' : 'Nueva cuenta'}</h3>
          <button type="button" onClick={onClose} className="btn-icon">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form id="account-form" onSubmit={handleSave} className="modal-body space-y-4">
          {error && (
            <div className="alert alert-err">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="field">
            <label>Nombre de la cuenta *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: FTMO Challenge #1"
              className="input"
            />
          </div>

          <div className="field">
            <label>Broker / Prop Firm</label>
            <input
              type="text"
              value={broker}
              onChange={e => setBroker(e.target.value)}
              placeholder="Ej: FTMO, My Forex Funds, IC Markets..."
              className="input"
            />
          </div>

          <div className="m-grid">
            <div className="field">
              <label>Tipo</label>
              <select
                value={type}
                onChange={e => { setType(e.target.value as AccountType); if (e.target.value === 'personal') setFundedPhase(null); }}
                className="input"
              >
                {typeOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Moneda</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="input"
              >
                {['USD', 'EUR', 'GBP', 'ARS', 'BTC'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {type === 'fondeada' && (
            <div className="field">
              <label>Fase del challenge</label>
              <div className="flex flex-col gap-2">
                {phaseOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFundedPhase(opt.value)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all duration-150 ${
                      fundedPhase === opt.value
                        ? 'border-[var(--line2)] bg-[var(--card)]'
                        : 'border-[var(--line)] bg-transparent hover:border-[var(--line2)]'
                    }`}
                  >
                    <span className={`tag ${opt.dot} shrink-0`} />
                    <span className={fundedPhase === opt.value ? opt.color : 'text-textMuted'}>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="field">
            <label>Balance inicial</label>
            <div className="input-icon-wrap">
              <span className="input-icon">{currency}</span>
              <input
                type="number"
                step="0.01"
                value={initialBalance}
                onChange={e => setInitialBalance(e.target.value)}
                placeholder="10000"
                className="input"
              />
            </div>
          </div>

          <div className="field">
            <label>Estado</label>
            <div className="m-grid">
              {statusOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all duration-150 ${
                    status === opt.value
                      ? 'border-[var(--line2)] bg-[var(--card)]'
                      : 'border-[var(--line)] bg-transparent hover:border-[var(--line2)]'
                  }`}
                >
                  <span className={`tag shrink-0 ${
                    opt.value === 'activa' ? 'tag-win' :
                    opt.value === 'pausada' ? 'tag-warn' :
                    opt.value === 'quemada' ? 'tag-loss' : 'tag-info'
                  }`} style={{ width: 8, height: 8, padding: 0, minWidth: 8 }} />
                  <span className={status === opt.value ? opt.color : 'text-textMuted'}>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </form>

        <div className="modal-foot modal-foot-between">
          {isEdit ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className={`btn btn-sm ${confirmDelete ? 'btn-danger' : 'btn-ghost'}`}
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {confirmDelete ? '¿Confirmar eliminación?' : 'Eliminar'}
            </button>
          ) : (
            <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">
              Cancelar
            </button>
          )}

          <button
            type="submit"
            form="account-form"
            disabled={isSaving}
            className="btn btn-primary btn-sm"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? 'Guardar cambios' : 'Crear cuenta'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountForm;
