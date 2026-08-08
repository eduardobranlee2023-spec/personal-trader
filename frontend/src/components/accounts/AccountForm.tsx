import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { TradingAccount, AccountStatus, AccountType } from '../../contexts/AccountContext';
import { X, Save, Loader2, AlertCircle, Trash2 } from 'lucide-react';

type Props = {
  account?: TradingAccount | null;
  onClose: () => void;
  onSaved: () => void;
};

const statusOptions: { value: AccountStatus; label: string; color: string }[] = [
  { value: 'activa', label: 'Activa', color: 'text-accent' },
  { value: 'pausada', label: 'Pausada', color: 'text-yellow-400' },
  { value: 'quemada', label: 'Quemada', color: 'text-red-400' },
  { value: 'pasada', label: 'Pasada (evaluación aprobada)', color: 'text-blue-400' },
];

const typeOptions: { value: AccountType; label: string }[] = [
  { value: 'personal', label: 'Personal' },
  { value: 'fondeada', label: 'Fondeada / Prop Firm' },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg glass rounded-2xl border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <h2 className="text-lg font-semibold text-text">
            {isEdit ? 'Editar cuenta' : 'Nueva cuenta'}
          </h2>
          <button onClick={onClose} className="text-textMuted hover:text-text transition p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm text-textMuted mb-1.5">Nombre de la cuenta *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: FTMO Challenge #1"
              className="w-full bg-white/5 border border-white/10 text-text placeholder-textMuted rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition"
            />
          </div>

          {/* Broker */}
          <div>
            <label className="block text-sm text-textMuted mb-1.5">Broker / Prop Firm</label>
            <input
              type="text"
              value={broker}
              onChange={e => setBroker(e.target.value)}
              placeholder="Ej: FTMO, My Forex Funds, IC Markets..."
              className="w-full bg-white/5 border border-white/10 text-text placeholder-textMuted rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition"
            />
          </div>

          {/* Type + Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-textMuted mb-1.5">Tipo</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as AccountType)}
                className="w-full bg-white/5 border border-white/10 text-text rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/60 transition appearance-none"
              >
                {typeOptions.map(o => (
                  <option key={o.value} value={o.value} className="bg-surface text-text">{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-textMuted mb-1.5">Moneda</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-text rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/60 transition appearance-none"
              >
                {['USD', 'EUR', 'GBP', 'ARS', 'BTC'].map(c => (
                  <option key={c} value={c} className="bg-surface text-text">{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Initial Balance */}
          <div>
            <label className="block text-sm text-textMuted mb-1.5">Balance inicial</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted text-sm">{currency}</span>
              <input
                type="number"
                step="0.01"
                value={initialBalance}
                onChange={e => setInitialBalance(e.target.value)}
                placeholder="10000"
                className="w-full bg-white/5 border border-white/10 text-text placeholder-textMuted rounded-lg pl-12 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm text-textMuted mb-2">Estado</label>
            <div className="grid grid-cols-2 gap-2">
              {statusOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all duration-150 ${
                    status === opt.value
                      ? 'bg-white/10 border-white/20'
                      : 'bg-white/3 border-white/5 hover:bg-white/7 hover:border-white/10'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    opt.value === 'activa' ? 'bg-accent' :
                    opt.value === 'pausada' ? 'bg-yellow-400' :
                    opt.value === 'quemada' ? 'bg-red-400' : 'bg-blue-400'
                  }`} />
                  <span className={status === opt.value ? opt.color : 'text-textMuted'}>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            {isEdit ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className={`flex items-center gap-1.5 text-sm transition px-3 py-2 rounded-lg ${
                  confirmDelete
                    ? 'bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30'
                    : 'text-textMuted hover:text-red-400 hover:bg-white/5'
                }`}
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {confirmDelete ? '¿Confirmar eliminación?' : 'Eliminar'}
              </button>
            ) : (
              <button type="button" onClick={onClose} className="text-sm text-textMuted hover:text-text transition px-3 py-2">
                Cancelar
              </button>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 bg-primary hover:bg-primaryHover disabled:opacity-50 text-white font-semibold rounded-lg px-5 py-2.5 text-sm transition-all shadow-lg shadow-primary/20"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEdit ? 'Guardar cambios' : 'Crear cuenta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccountForm;
