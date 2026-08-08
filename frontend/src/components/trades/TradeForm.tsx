import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useAccounts } from '../../contexts/AccountContext';
import { useStrategies } from '../../hooks/useTrades';
import type { Trade, TradeSession, TradeDirection, TradeStatus } from '../../hooks/useTrades';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto glass rounded-2xl border border-white/10 shadow-2xl">
        <div className="sticky top-0 z-10 glass flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-text">{isEdit ? 'Editar Operación' : 'Registrar Operación'}</h2>
          <button onClick={onClose} className="text-textMuted hover:text-text transition p-1"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* 1. Cuenta */}
            <div>
              <label className="block text-sm text-textMuted mb-1.5">Cuenta *</label>
              <select value={accountId} onChange={e => setAccountId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-text rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/60 transition">
                {accounts.map(a => <option key={a.id} value={a.id} className="bg-surface text-text">{a.name} ({a.currency})</option>)}
              </select>
            </div>
            {/* 2. Fecha */}
            <div>
              <label className="block text-sm text-textMuted mb-1.5">Fecha *</label>
              <input type="date" value={tradeDate} onChange={e => setTradeDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-text rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/60 transition" />
            </div>
            
            {/* 3. Activo & 4. Dirección */}
            <div>
              <label className="block text-sm text-textMuted mb-1.5">Activo *</label>
              <input type="text" list="assets-list" value={asset} onChange={e => setAsset(e.target.value)} placeholder="Ej: EURUSD, XAUUSD"
                className="w-full bg-white/5 border border-white/10 text-text uppercase rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/60 transition" />
              <datalist id="assets-list">
                {knownAssets.map(a => <option key={a} value={a} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-sm text-textMuted mb-1.5">Dirección *</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setDirection('compra')}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-sm transition ${direction === 'compra' ? 'bg-accent/20 border-accent/40 text-accent font-medium' : 'bg-white/5 border-white/10 text-textMuted hover:bg-white/10'}`}>
                  <ArrowUpRight className="w-4 h-4" /> Compra
                </button>
                <button type="button" onClick={() => setDirection('venta')}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-sm transition ${direction === 'venta' ? 'bg-red-500/20 border-red-500/40 text-red-400 font-medium' : 'bg-white/5 border-white/10 text-textMuted hover:bg-white/10'}`}>
                  <ArrowDownRight className="w-4 h-4" /> Venta
                </button>
              </div>
            </div>

            {/* 5. Sesión & Temporalidad */}
            <div>
              <label className="block text-sm text-textMuted mb-1.5">Sesión <span className="text-textMuted/50">(opcional)</span></label>
              <select value={session} onChange={e => setSession(e.target.value as TradeSession)}
                className="w-full bg-white/5 border border-white/10 text-text rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/60 transition">
                {SESSIONS.map(s => <option key={s.value} value={s.value} className="bg-surface">{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-textMuted mb-1.5">Temporalidad <span className="text-textMuted/50">(opcional)</span></label>
              <select value={timeframe} onChange={e => setTimeframe(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-text rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/60 transition">
                {TIMEFRAMES.map(t => <option key={t} value={t} className="bg-surface">{t}</option>)}
              </select>
            </div>

            {/* Inversión y Resultado */}
            <div>
              <label className="block text-sm text-textMuted mb-1.5">Riesgo / Inversión <span className="text-textMuted/50">(opcional)</span></label>
              <input type="number" step="0.01" value={investment} onChange={e => setInvestment(e.target.value)} placeholder="Ej: 100"
                className="w-full bg-white/5 border border-white/10 text-text rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/60 transition" />
            </div>
            <div>
              <label className="block text-sm text-textMuted mb-1.5">Resultado en dinero ($) <span className="text-textMuted/50">(opcional)</span></label>
              <input type="number" step="0.01" value={resultAmount} onChange={e => setResultAmount(e.target.value)} placeholder="Ej: 300 o -100"
                className="w-full bg-white/5 border border-white/10 text-text rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/60 transition" />
            </div>

            {/* RR y Estado */}
            <div>
              <label className="block text-sm text-textMuted mb-1.5">Risk/Reward (RR) <span className="text-textMuted/50">(opcional)</span></label>
              <input type="text" value={riskReward} onChange={e => setRiskReward(e.target.value)} placeholder="Ej: 1:3"
                className="w-full bg-white/5 border border-white/10 text-text rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/60 transition" />
            </div>
            <div>
              <label className="block text-sm text-textMuted mb-1.5">Estado <span className="text-textMuted/50">(opcional)</span></label>
              <select value={status} onChange={e => setStatus(e.target.value as TradeStatus)}
                className="w-full bg-white/5 border border-white/10 text-text rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/60 transition">
                <option value="en curso" className="bg-surface">En curso</option>
                <option value="ganada" className="bg-surface">Ganada</option>
                <option value="perdida" className="bg-surface">Perdida</option>
                <option value="breakeven" className="bg-surface">Breakeven</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm text-textMuted mb-1.5">Zona operativa <span className="text-textMuted/50">(opcional)</span></label>
              <input type="text" value={zone} onChange={e => setZone(e.target.value)} placeholder="Ej: Order Block, FVG, Soporte M15"
                className="w-full bg-white/5 border border-white/10 text-text rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/60 transition" />
            </div>
            <div>
              <label className="block text-sm text-textMuted mb-1.5">Estrategia <span className="text-textMuted/50">(opcional)</span></label>
              <select value={strategyId} onChange={e => setStrategyId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-text rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/60 transition">
                <option value="" className="bg-surface">-- Ninguna --</option>
                {strategies.map(s => <option key={s.id} value={s.id} className="bg-surface">{s.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-textMuted mb-1.5">Motivo de entrada <span className="text-textMuted/50">(opcional)</span></label>
            <textarea value={entryReason} onChange={e => setEntryReason(e.target.value)} rows={2} placeholder="¿Qué viste para entrar en ese momento?"
              className="w-full bg-white/5 border border-white/10 text-text rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/60 transition resize-none" />
          </div>

          <div>
            <label className="block text-sm text-textMuted mb-1.5">Link de TradingView <span className="text-textMuted/50">(opcional)</span></label>
            <input type="url" value={tradingviewLink} onChange={e => setTradingviewLink(e.target.value)} placeholder="https://www.tradingview.com/x/..."
              className="w-full bg-white/5 border border-white/10 text-text rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/60 transition" />
          </div>

          <div>
            <label className="block text-sm text-textMuted mb-1.5">Notas o reflexión post-trade <span className="text-textMuted/50">(opcional)</span></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Aprendizajes, emociones al cerrar, errores cometidos..."
              className="w-full bg-white/5 border border-white/10 text-text rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/60 transition resize-none" />
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            {isEdit ? (
              <button type="button" onClick={handleDelete} disabled={isDeleting}
                className={`flex items-center gap-1.5 text-sm transition px-3 py-2 rounded-lg ${confirmDelete ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'text-textMuted hover:text-red-400 hover:bg-white/5'}`}>
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {confirmDelete ? '¿Confirmar?' : 'Eliminar'}
              </button>
            ) : <div />}

            <div className="flex items-center gap-3">
              {!isEdit && <button type="button" onClick={onClose} className="text-sm text-textMuted hover:text-text transition px-3 py-2">Cancelar</button>}
              <button type="submit" disabled={isSaving} className="flex items-center gap-2 bg-primary hover:bg-primaryHover disabled:opacity-50 text-white font-semibold rounded-lg px-5 py-2.5 text-sm transition-all shadow-lg shadow-primary/20">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isEdit ? 'Guardar cambios' : 'Registrar'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TradeForm;
