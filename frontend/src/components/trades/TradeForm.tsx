import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useAccounts } from '../../contexts/AccountContext';
import { useStrategies } from '../../hooks/useTrades';
import type { Trade, TradeSession, TradeDirection, TradeStatus } from '../../hooks/useTrades';
import type { FundedPhase } from '../../contexts/AccountContext';
import { X, Save, Loader2, AlertCircle, ArrowUpRight, ArrowDownRight, Trash2 } from 'lucide-react';

type Props = {
  trade?: Trade | null;
  knownAssets: string[];
  onClose: () => void;
  onSaved: () => void;
};

const TIMEFRAMES = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1'];
const SESSIONS: { value: TradeSession; label: string }[] = [
  { value: 'asia', label: 'Asia' },
  { value: 'londres', label: 'Londres' },
  { value: 'nyc', label: 'Nueva York' },
  { value: 'overlap', label: 'Overlap (LON/NYC)' },
];

/** Prioridad de ordenamiento por status */
const STATUS_ORDER: Record<string, number> = { activa: 0, pausada: 1, pasada: 2, quemada: 3 };

const PHASE_LABEL: Record<NonNullable<FundedPhase>, string> = {
  fase_1: 'Fase 1',
  fase_2: 'Fase 2',
  verificada: 'Verificada',
};

const fmtBalance = (n: number, currency: string) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);

/** Genera el label completo de una cuenta para el selector */
const accountOptionLabel = (a: { name: string; account_type: string; funded_phase?: FundedPhase | null; current_balance?: number; initial_balance?: number | null; currency: string }) => {
  const balance = a.current_balance ?? a.initial_balance ?? null;
  const phase = a.account_type === 'fondeada' && a.funded_phase ? ` · ${PHASE_LABEL[a.funded_phase]}` : '';
  const balStr = balance != null ? ` — ${fmtBalance(balance, a.currency)}` : '';
  return `${a.name}${phase}${balStr}`;
};

const TradeForm: React.FC<Props> = ({ trade, knownAssets, onClose, onSaved }) => {
  const { user } = useAuth();
  const { accounts } = useAccounts();
  const { strategies } = useStrategies();
  const isEdit = !!trade;

  const [accountId, setAccountId] = useState(trade?.trading_account_id ?? (accounts.length > 0 ? accounts[0].id : ''));
  const [tradeDate, setTradeDate] = useState(trade?.trade_date ?? new Date().toISOString().split('T')[0]);
  const [asset, setAsset] = useState(trade?.asset ?? '');
  const [session, setSession] = useState<TradeSession>(trade?.session ?? 'nyc');
  const [timeframe, setTimeframe] = useState(trade?.timeframe ?? 'M15');
  const [zone, setZone] = useState(trade?.zone ?? '');
  const [direction, setDirection] = useState<TradeDirection>(trade?.direction ?? 'compra');
  const [entryReason, setEntryReason] = useState(trade?.entry_reason ?? '');
  const [tradingviewLink, setTradingviewLink] = useState(trade?.tradingview_link ?? '');
  const [strategyId, setStrategyId] = useState(trade?.strategy_id ?? '');
  const [investment, setInvestment] = useState(trade?.investment_amount ? String(trade.investment_amount) : '');
  const [resultAmount, setResultAmount] = useState(trade?.result_amount != null ? String(trade.result_amount) : '');
  const [resultPercentage, setResultPercentage] = useState(trade?.result_percentage != null ? String(trade.result_percentage) : '');
  const [riskReward, setRiskReward] = useState(trade?.risk_reward ?? '');
  const [status, setStatus] = useState<TradeStatus>(trade?.status ?? 'en curso');
  const [notes, setNotes] = useState(trade?.notes ?? '');

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Auto-calculate percentage and status based on resultAmount
  useEffect(() => {
    if (resultAmount !== '') {
      const val = parseFloat(resultAmount);
      // Auto-set status
      if (val > 0) setStatus('ganada');
      else if (val < 0) setStatus('perdida');
      else if (val === 0) setStatus('breakeven');

      // Auto-calculate percentage if we know the account's initial balance
      const account = accounts.find(a => a.id === accountId);
      if (account && account.initial_balance && !trade) {
        const pct = (val / account.initial_balance) * 100;
        setResultPercentage(pct.toFixed(2));
      }
    } else {
      if (!trade) setStatus('en curso');
    }
  }, [resultAmount, accountId, accounts, trade]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) { setError('Debe seleccionar una cuenta.'); return; }
    if (!asset.trim()) { setError('El activo es obligatorio.'); return; }

    if (tradingviewLink && !tradingviewLink.startsWith('http')) {
      setError('El enlace de TradingView debe comenzar con http:// o https://');
      return;
    }
    
    if (riskReward && !/^1:\d+(\.\d+)?$/.test(riskReward)) {
      setError('El formato de Risk/Reward debe ser "1:X" (ej: 1:3 o 1:2.5)');
      return;
    }

    setIsSaving(true);
    setError('');

    const payload = {
      user_id: user!.id,
      trading_account_id: accountId,
      strategy_id: strategyId || null,
      trade_date: tradeDate,
      asset: asset.trim().toUpperCase(),
      session,
      timeframe,
      zone: zone.trim() || null,
      direction,
      entry_reason: entryReason.trim() || null,
      tradingview_link: tradingviewLink.trim() || null,
      investment_amount: investment !== '' ? parseFloat(investment) : 0,
      result_amount: resultAmount !== '' ? parseFloat(resultAmount) : null,
      result_percentage: resultPercentage !== '' ? parseFloat(resultPercentage) : null,
      risk_reward: riskReward.trim() || null,
      status,
      notes: notes.trim() || null,
    };

    let err;
    if (isEdit) {
      ({ error: err } = await supabase.from('trades').update(payload).eq('id', trade!.id));
    } else {
      ({ error: err } = await supabase.from('trades').insert(payload));
    }

    if (err) setError(err.message);
    else { onSaved(); onClose(); }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setIsDeleting(true);
    const { error: err } = await supabase.from('trades').delete().eq('id', trade!.id);
    if (err) { setError(err.message); setIsDeleting(false); }
    else { onSaved(); onClose(); }
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-card modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{isEdit ? 'Editar Operación' : 'Registrar Operación'}</h3>
          <button type="button" onClick={onClose} className="btn-icon"><X className="w-5 h-5" /></button>
        </div>

        <form id="trade-form" onSubmit={handleSave} className="modal-body space-y-5">
          {error && (
            <div className="alert alert-err">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <div className="m-grid">
            <div className="field">
              <label>Cuenta *</label>
              <select value={accountId} onChange={e => setAccountId(e.target.value)} className="input">
                {[...accounts]
                  .sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9))
                  .map(a => (
                    <option key={a.id} value={a.id}>
                      {accountOptionLabel(a)}
                    </option>
                  ))}
              </select>
            </div>
            <div className="field">
              <label>Fecha *</label>
              <input type="date" value={tradeDate} onChange={e => setTradeDate(e.target.value)} className="input" />
            </div>
            <div className="field">
              <label>Activo *</label>
              <input type="text" list="assets-list" value={asset} onChange={e => setAsset(e.target.value)} placeholder="Ej: EURUSD, XAUUSD"
                className="input uppercase" />
              <datalist id="assets-list">
                {knownAssets.map(a => <option key={a} value={a} />)}
              </datalist>
            </div>
            <div className="field">
              <label>Dirección *</label>
              <div className="seg">
                <button type="button" className={direction === 'compra' ? 'on-buy' : ''} onClick={() => setDirection('compra')}>
                  <ArrowUpRight className="w-4 h-4" /> Compra
                </button>
                <button type="button" className={direction === 'venta' ? 'on-sell' : ''} onClick={() => setDirection('venta')}>
                  <ArrowDownRight className="w-4 h-4" /> Venta
                </button>
              </div>
            </div>
            <div className="field">
              <label>Sesión (opcional)</label>
              <select value={session} onChange={e => setSession(e.target.value as TradeSession)} className="input">
                {SESSIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Temporalidad (opcional)</label>
              <select value={timeframe} onChange={e => setTimeframe(e.target.value)} className="input">
                {TIMEFRAMES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Riesgo / Inversión (opcional)</label>
              <input type="number" step="0.01" value={investment} onChange={e => setInvestment(e.target.value)} placeholder="Ej: 100" className="input" />
            </div>
            <div className="field">
              <label>Resultado en dinero ($) (opcional)</label>
              <input type="number" step="0.01" value={resultAmount} onChange={e => setResultAmount(e.target.value)} placeholder="Ej: 300 o -100" className="input" />
            </div>
            <div className="field">
              <label>Risk/Reward (RR) (opcional)</label>
              <input type="text" value={riskReward} onChange={e => setRiskReward(e.target.value)} placeholder="Ej: 1:3" className="input" />
            </div>
            <div className="field">
              <label>Estado (opcional)</label>
              <select value={status} onChange={e => setStatus(e.target.value as TradeStatus)} className="input">
                <option value="en curso">En curso</option>
                <option value="ganada">Ganada</option>
                <option value="perdida">Perdida</option>
                <option value="breakeven">Breakeven</option>
              </select>
            </div>
          </div>

          <div className="m-grid">
            <div className="field">
              <label>Zona operativa (opcional)</label>
              <input type="text" value={zone} onChange={e => setZone(e.target.value)} placeholder="Ej: Order Block, FVG, Soporte M15" className="input" />
            </div>
            <div className="field">
              <label>Estrategia (opcional)</label>
              <select value={strategyId} onChange={e => setStrategyId(e.target.value)} className="input">
                <option value="">-- Ninguna --</option>
                {strategies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="field">
            <label>Motivo de entrada (opcional)</label>
            <textarea value={entryReason} onChange={e => setEntryReason(e.target.value)} rows={2} placeholder="¿Qué viste para entrar en ese momento?" className="input" />
          </div>

          <div className="field">
            <label>Link de TradingView (opcional)</label>
            <input type="url" value={tradingviewLink} onChange={e => setTradingviewLink(e.target.value)} placeholder="https://www.tradingview.com/x/..." className="input" />
          </div>

          <div className="field">
            <label>Notas o reflexión post-trade (opcional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Aprendizajes, emociones al cerrar, errores cometidos..." className="input" />
          </div>
        </form>

        <div className="modal-foot modal-foot-between">
          {isEdit ? (
            <button type="button" onClick={handleDelete} disabled={isDeleting}
              className={`btn btn-sm ${confirmDelete ? 'btn-danger' : 'btn-ghost'}`}>
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {confirmDelete ? '¿Confirmar?' : 'Eliminar'}
            </button>
          ) : <div />}

          <div className="flex items-center gap-3">
            {!isEdit && <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">Cancelar</button>}
            <button type="submit" form="trade-form" disabled={isSaving} className="btn btn-primary btn-sm">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEdit ? 'Guardar cambios' : 'Registrar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradeForm;
