import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useAccounts } from '../../contexts/AccountContext';
import { useStrategies } from '../../hooks/useTrades';
import type { Trade, TradeSession, TradeDirection, TradeStatus } from '../../hooks/useTrades';
import type { FundedPhase } from '../../contexts/AccountContext';
import {
  createTradeImageUrl,
  getTradeImagePaths,
  MAX_TRADE_IMAGE_SIZE,
  MAX_TRADE_IMAGES,
  removeMultipleTradeImagesIfUnused,
  encodeTradeImagePaths,
  uploadTradeImage,
} from '../../lib/tradeImages';
import { X, Save, Loader2, AlertCircle, ArrowUpRight, ArrowDownRight, Trash2, Search, ImagePlus, ClipboardPaste } from 'lucide-react';

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

const PHASE_LABEL: Record<NonNullable<FundedPhase>, string> = {
  fase_1: 'Fase 1',
  fase_2: 'Fase 2',
  verificada: 'Verificada',
};

const fmtBalance = (n: number, currency: string) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);

const accountOptionLabel = (a: {
  name: string;
  account_type: string;
  funded_phase?: FundedPhase | null;
  current_balance?: number;
  initial_balance?: number | null;
  currency: string;
  status: string;
}) => {
  const balance = a.current_balance ?? a.initial_balance ?? null;
  const phase = a.account_type === 'fondeada' && a.funded_phase ? ` · ${PHASE_LABEL[a.funded_phase]}` : '';
  const statusStr = a.status ? ` · ${a.status.charAt(0).toUpperCase() + a.status.slice(1)}` : '';
  const balStr = balance != null ? ` — ${fmtBalance(balance, a.currency)}` : '';
  return `${a.name}${statusStr}${phase}${balStr}`;
};

type AccountAmounts = {
  investment: string;
  result: string;
};

const TradeForm: React.FC<Props> = ({ trade, knownAssets, onClose, onSaved }) => {
  const { user } = useAuth();
  const { accounts } = useAccounts();
  const { strategies } = useStrategies();
  const isEdit = !!trade;

  const availableNewAccounts = accounts.filter(a => a.status !== 'quemada');
  const [accountIds, setAccountIds] = useState<string[]>(
    trade ? [trade.trading_account_id] : availableNewAccounts.length > 0 ? [availableNewAccounts[0].id] : []
  );
  const [accountSearch, setAccountSearch] = useState('');

  // Per-account investment & result amounts (keyed by account id)
  const [accountAmounts, setAccountAmounts] = useState<Record<string, AccountAmounts>>(() => {
    if (trade) {
      return {
        [trade.trading_account_id]: {
          investment: trade.investment_amount ? String(trade.investment_amount) : '',
          result: trade.result_amount != null ? String(trade.result_amount) : '',
        },
      };
    }
    return {};
  });

  const [tradeDate, setTradeDate] = useState(trade?.trade_date ?? new Date().toISOString().split('T')[0]);
  const [asset, setAsset] = useState(trade?.asset ?? '');
  const [session, setSession] = useState<TradeSession>(trade?.session ?? 'nyc');
  const [timeframe, setTimeframe] = useState(trade?.timeframe ?? 'M15');
  const [zone, setZone] = useState(trade?.zone ?? '');
  const [direction, setDirection] = useState<TradeDirection>(trade?.direction ?? 'compra');
  const [entryReason, setEntryReason] = useState(trade?.entry_reason ?? '');
  const existingImagePaths = getTradeImagePaths(trade?.tradingview_link ?? null);
  const [tradingviewLink, setTradingviewLink] = useState(existingImagePaths.length > 0 ? '' : trade?.tradingview_link ?? '');

  // Imágenes ya guardadas en storage (paths y urls firmadas)
  const [persistedImages, setPersistedImages] = useState<{ path: string; url: string }[]>([]);
  // Nuevas imágenes seleccionadas o pegadas en esta sesión
  const [newImageFiles, setNewImageFiles] = useState<{ id: string; file: File; previewUrl: string }[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isPasting, setIsPasting] = useState(false);

  const [strategyId, setStrategyId] = useState(trade?.strategy_id ?? '');
  const [riskReward, setRiskReward] = useState(trade?.risk_reward ?? '');
  const [status, setStatus] = useState<TradeStatus>(trade?.status ?? 'en curso');
  const [notes, setNotes] = useState(trade?.notes ?? '');

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Cargar URLs para imágenes ya persistidas
  useEffect(() => {
    if (existingImagePaths.length === 0) return;
    let isCurrent = true;

    Promise.all(
      existingImagePaths.map(async path => {
        const { url } = await createTradeImageUrl(path);
        return url ? { path, url } : null;
      })
    ).then(items => {
      if (!isCurrent) return;
      const valid = items.filter((x): x is { path: string; url: string } => x !== null);
      setPersistedImages(valid);
    });

    return () => {
      isCurrent = false;
    };
  }, [trade?.tradingview_link]);

  // Manejar adición de archivos (tanto desde input file como desde portapapeles)
  const handleAddFiles = (files: File[]) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
    const currentTotal = persistedImages.length + newImageFiles.length;
    const remainingSlots = MAX_TRADE_IMAGES - currentTotal;

    if (remainingSlots <= 0) {
      setError(`Se permite un máximo de ${MAX_TRADE_IMAGES} imágenes por operación.`);
      return;
    }

    const filesToAdd: { id: string; file: File; previewUrl: string }[] = [];
    for (const file of files) {
      if (filesToAdd.length >= remainingSlots) {
        setError(`Límite alcanzado: se agregaron solo hasta completar el máximo de ${MAX_TRADE_IMAGES} imágenes.`);
        break;
      }
      if (!validTypes.includes(file.type)) {
        setError('Formato no compatible. Usá JPG, PNG, WebP, GIF o AVIF.');
        continue;
      }
      if (file.size > MAX_TRADE_IMAGE_SIZE) {
        setError('Cada imagen no puede superar los 10 MB.');
        continue;
      }
      setError('');
      filesToAdd.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (filesToAdd.length > 0) {
      setNewImageFiles(prev => [...prev, ...filesToAdd]);
    }
  };

  const removePersistedImage = (path: string) => {
    setPersistedImages(prev => prev.filter(img => img.path !== path));
  };

  const removeNewFile = (id: string) => {
    setNewImageFiles(prev => {
      const target = prev.find(item => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter(item => item.id !== id);
    });
  };

  // Pegar imágenes con Ctrl + V directamente desde el portapapeles
  const handlePaste = (e: React.ClipboardEvent | ClipboardEvent) => {
    const clipboardData = 'clipboardData' in e ? e.clipboardData : null;
    if (!clipboardData) return;

    const items = clipboardData.items;
    const pastedImageFiles: File[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          pastedImageFiles.push(file);
        }
      }
    }

    if (pastedImageFiles.length > 0) {
      e.preventDefault();
      handleAddFiles(pastedImageFiles);
    }
  };

  // Botón manual para leer desde el portapapeles si la API Clipboard está disponible
  const handlePasteFromClipboardApi = async () => {
    try {
      setIsPasting(true);
      if (!navigator.clipboard || !navigator.clipboard.read) {
        setError('Tu navegador no permite lectura directa del portapapeles con botón. Podés presionar Ctrl + V para pegar la imagen.');
        return;
      }
      const clipboardItems = await navigator.clipboard.read();
      const files: File[] = [];
      for (const item of clipboardItems) {
        const imageType = item.types.find(type => type.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const extension = imageType.split('/')[1] || 'png';
          const file = new File([blob], `screenshot-${Date.now()}.${extension}`, { type: imageType });
          files.push(file);
        }
      }
      if (files.length === 0) {
        setError('No se encontró ninguna imagen en el portapapeles. Copiá una captura e intentá de nuevo o usá Ctrl + V.');
      } else {
        handleAddFiles(files);
      }
    } catch (err) {
      setError('Presioná Ctrl + V sobre el formulario para pegar la imagen copiada.');
    } finally {
      setIsPasting(false);
    }
  };

  // Listener global de paste mientras el modal está abierto
  useEffect(() => {
    const windowPasteListener = (e: ClipboardEvent) => {
      // Si el foco está en un input de texto o textarea normal y no tiene imágenes en el portapapeles, dejar que pegue texto
      const hasImage = Array.from(e.clipboardData?.items ?? []).some(it => it.type.startsWith('image/'));
      if (hasImage) {
        handlePaste(e);
      }
    };
    window.addEventListener('paste', windowPasteListener);
    return () => {
      window.removeEventListener('paste', windowPasteListener);
    };
  }, [persistedImages.length, newImageFiles.length]);

  const getAmounts = (accId: string): AccountAmounts =>
    accountAmounts[accId] ?? { investment: '', result: '' };

  const setAmount = (accId: string, field: keyof AccountAmounts, value: string) => {
    setAccountAmounts(prev => ({
      ...prev,
      [accId]: { ...getAmounts(accId), [field]: value },
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (accountIds.length === 0) {
      setError('Debe seleccionar al menos una cuenta.');
      return;
    }
    if (!asset.trim()) {
      setError('El activo es obligatorio.');
      return;
    }
    if (tradingviewLink && !/^https?:\/\//i.test(tradingviewLink)) {
      setError('El enlace de TradingView debe comenzar con http:// o https://');
      return;
    }
    if (newImageFiles.some(item => item.file.size > MAX_TRADE_IMAGE_SIZE)) {
      setError('Ninguna imagen puede superar los 10 MB.');
      return;
    }
    if (riskReward && !/^1:\d+(\.\d+)?$/.test(riskReward)) {
      setError('El formato de Risk/Reward debe ser "1:X" (ej: 1:3 o 1:2.5)');
      return;
    }

    setIsSaving(true);
    setError('');

    const newlyUploadedPaths: string[] = [];
    try {
      // 1. Subir cualquier nueva imagen agregada (sea por selector de archivos o pegada con Ctrl+V)
      if (newImageFiles.length > 0) {
        setIsUploadingImages(true);
        for (const item of newImageFiles) {
          const { path, error: uploadError } = await uploadTradeImage(item.file, user!.id);
          if (uploadError || !path) {
            throw new Error(`No se pudo subir una de las imágenes: ${uploadError?.message ?? 'error desconocido'}`);
          }
          newlyUploadedPaths.push(path);
        }
        setIsUploadingImages(false);
      }

      // 2. Determinar el valor para tradingview_link:
      // Si el usuario ingresó un link manual de TradingView y no hay imágenes, se usa ese link.
      // Si hay imágenes (persisted + new), se codifican en formato storage-multi:...
      let imageValue: string | null = null;
      const combinedPaths = [...persistedImages.map(img => img.path), ...newlyUploadedPaths];

      if (combinedPaths.length > 0) {
        imageValue = encodeTradeImagePaths(combinedPaths);
      } else if (tradingviewLink.trim()) {
        imageValue = tradingviewLink.trim();
      }

      const basePayload = {
        user_id: user!.id,
        strategy_id: strategyId || null,
        trade_date: tradeDate,
        asset: asset.trim().toUpperCase(),
        session,
        timeframe,
        zone: zone.trim() || null,
        direction,
        entry_reason: entryReason.trim() || null,
        tradingview_link: imageValue,
        commission_percentage: null,
        risk_reward: riskReward.trim() || null,
        notes: notes.trim() || null,
      };

      const getAccountSpecificData = (accId: string) => {
        const amounts = getAmounts(accId);
        const investVal = amounts.investment !== '' ? parseFloat(amounts.investment) : 0;
        const resVal = amounts.result !== '' ? parseFloat(amounts.result) : null;

        let finalStatus: TradeStatus = status;
        let result_percentage: number | null = null;

        if (resVal !== null) {
          if (resVal > 0) finalStatus = 'ganada';
          else if (resVal < 0) finalStatus = 'perdida';
          else finalStatus = 'breakeven';

          const account = accounts.find(a => a.id === accId);
          if (account && account.initial_balance && !isEdit) {
            const pct = (resVal / account.initial_balance) * 100;
            result_percentage = parseFloat(pct.toFixed(2));
          } else if (isEdit && trade?.result_percentage != null) {
            result_percentage = trade.result_percentage;
          }
        }

        return {
          trading_account_id: accId,
          investment_amount: investVal,
          result_amount: resVal,
          result_percentage,
          status: finalStatus,
        };
      };

      let saveError;
      if (isEdit) {
        const payload = { ...basePayload, ...getAccountSpecificData(accountIds[0]) };
        ({ error: saveError } = await supabase.from('trades').update(payload).eq('id', trade!.id));
      } else {
        const trade_group_id = accountIds.length > 1 ? crypto.randomUUID() : null;
        const payloads = accountIds.map(accId => ({
          ...basePayload,
          ...getAccountSpecificData(accId),
          trade_group_id,
        }));
        ({ error: saveError } = await supabase.from('trades').insert(payloads));
      }

      if (saveError) {
        if (newlyUploadedPaths.length > 0) {
          await supabase.storage.from('trade-images').remove(newlyUploadedPaths);
        }
        setError(saveError.message);
        return;
      }

      // 3. Limpiar del storage cualquier imagen anterior que el usuario haya quitado durante la edición
      if (existingImagePaths.length > 0) {
        const removedPaths = existingImagePaths.filter(p => !persistedImages.some(img => img.path === p));
        if (removedPaths.length > 0) {
          void removeMultipleTradeImagesIfUnused(removedPaths);
        }
      }

      onSaved();
      onClose();
    } catch (saveError) {
      if (newlyUploadedPaths.length > 0) {
        await supabase.storage.from('trade-images').remove(newlyUploadedPaths);
      }
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar la operación.');
    } finally {
      setIsSaving(false);
      setIsUploadingImages(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setIsDeleting(true);
    const { error: err } = await supabase.from('trades').delete().eq('id', trade!.id);
    if (err) {
      setError(err.message);
      setIsDeleting(false);
    } else {
      if (existingImagePaths.length > 0) {
        void removeMultipleTradeImagesIfUnused(existingImagePaths);
      }
      onSaved();
      onClose();
    }
  };

  const filteredAccounts = (isEdit ? accounts : availableNewAccounts).filter(a =>
    a.name.toLowerCase().includes(accountSearch.toLowerCase())
  );

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-card modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{isEdit ? 'Editar Operacion' : 'Registrar Operacion'}</h3>
          <button type="button" onClick={onClose} className="btn-icon">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form id="trade-form" onSubmit={handleSave} className="modal-body space-y-5">
          {error && (
            <div className="alert alert-err">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <div className="m-grid">
            {isEdit ? (
              <div className="field col-span-full">
                <label>Cuenta (Edicion individual) *</label>
                <select
                  value={accountIds[0] || ''}
                  onChange={e => setAccountIds([e.target.value])}
                  className="input"
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {accountOptionLabel(a)}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="field col-span-full">
                <label>Cuentas * (tilda las que participan en esta operacion)</label>
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
                <div className="flex flex-col gap-2 max-h-72 overflow-y-auto p-2 border border-white/10 rounded-lg bg-black/20">
                  {filteredAccounts.length === 0 ? (
                    <div className="p-4 text-center text-sm text-white/50">No se encontraron cuentas</div>
                  ) : (
                    filteredAccounts.map(a => {
                      const isChecked = accountIds.includes(a.id);
                      const amounts = getAmounts(a.id);
                      return (
                        <div
                          key={a.id}
                          className="flex flex-col gap-2 p-2 border border-white/5 rounded-lg bg-white/5 transition-colors hover:bg-white/10"
                        >
                          <label className="flex items-center gap-2 cursor-pointer w-full">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={e => {
                                if (e.target.checked) setAccountIds([...accountIds, a.id]);
                                else setAccountIds(accountIds.filter(id => id !== a.id));
                              }}
                              className="checkbox"
                            />
                            <span className="text-sm font-medium select-none">{accountOptionLabel(a)}</span>
                          </label>

                          {isChecked && (
                            <div className="flex gap-2 pl-6">
                              <div className="flex-1">
                                <label className="block text-xs text-white/50 mb-1">Inversion ($)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={amounts.investment}
                                  onChange={e => setAmount(a.id, 'investment', e.target.value)}
                                  placeholder="Ej: 100"
                                  className="input text-sm"
                                />
                              </div>
                              <div className="flex-1">
                                <label className="block text-xs text-white/50 mb-1">Resultado ($)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={amounts.result}
                                  onChange={e => setAmount(a.id, 'result', e.target.value)}
                                  placeholder="Ej: 300 o -100"
                                  className="input text-sm"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {isEdit && (
              <>
                <div className="field">
                  <label>Riesgo / Inversion (opcional)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={getAmounts(accountIds[0] ?? '').investment}
                    onChange={e => setAmount(accountIds[0] ?? '', 'investment', e.target.value)}
                    placeholder="Ej: 100"
                    className="input"
                  />
                </div>
                <div className="field">
                  <label>Resultado en dinero ($) (opcional)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={getAmounts(accountIds[0] ?? '').result}
                    onChange={e => setAmount(accountIds[0] ?? '', 'result', e.target.value)}
                    placeholder="Ej: 300 o -100"
                    className="input"
                  />
                </div>
              </>
            )}

            <div className="field">
              <label>Fecha *</label>
              <input
                type="date"
                value={tradeDate}
                onChange={e => setTradeDate(e.target.value)}
                className="input"
              />
            </div>
            <div className="field">
              <label>Activo *</label>
              <input
                type="text"
                list="assets-list"
                value={asset}
                onChange={e => setAsset(e.target.value)}
                placeholder="Ej: EURUSD, XAUUSD"
                className="input uppercase"
              />
              <datalist id="assets-list">
                {knownAssets.map(a => (
                  <option key={a} value={a} />
                ))}
              </datalist>
            </div>
            <div className="field">
              <label>Direccion *</label>
              <div className="seg">
                <button
                  type="button"
                  className={direction === 'compra' ? 'on-buy' : ''}
                  onClick={() => setDirection('compra')}
                >
                  <ArrowUpRight className="w-4 h-4" /> Compra
                </button>
                <button
                  type="button"
                  className={direction === 'venta' ? 'on-sell' : ''}
                  onClick={() => setDirection('venta')}
                >
                  <ArrowDownRight className="w-4 h-4" /> Venta
                </button>
              </div>
            </div>
            <div className="field">
              <label>Sesion (opcional)</label>
              <select
                value={session}
                onChange={e => setSession(e.target.value as TradeSession)}
                className="input"
              >
                {SESSIONS.map(s => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Temporalidad (opcional)</label>
              <select value={timeframe} onChange={e => setTimeframe(e.target.value)} className="input">
                {TIMEFRAMES.map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Risk/Reward (RR) (opcional)</label>
              <input
                type="text"
                value={riskReward}
                onChange={e => setRiskReward(e.target.value)}
                placeholder="Ej: 1:3"
                className="input"
              />
            </div>
            <div className="field">
              <label>Estado (opcional)</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as TradeStatus)}
                className="input"
              >
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
              <input
                type="text"
                value={zone}
                onChange={e => setZone(e.target.value)}
                placeholder="Ej: Order Block, FVG, Soporte M15"
                className="input"
              />
            </div>
            <div className="field">
              <label>Estrategia (opcional)</label>
              <select value={strategyId} onChange={e => setStrategyId(e.target.value)} className="input">
                <option value="">-- Ninguna --</option>
                {strategies.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label>Motivo de entrada (opcional)</label>
            <textarea
              value={entryReason}
              onChange={e => setEntryReason(e.target.value)}
              rows={2}
              placeholder="Que viste para entrar en ese momento?"
              className="input"
            />
          </div>

          <div className="field">
            <div className="flex items-center justify-between">
              <label className="mb-0">Imágenes de la operativa (máximo {MAX_TRADE_IMAGES})</label>
              <span className="sc-sub">
                {persistedImages.length + newImageFiles.length} de {MAX_TRADE_IMAGES}
              </span>
            </div>

            {/* Controles para subir desde archivo o pegar desde portapapeles */}
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <label
                className={`btn btn-ghost btn-sm cursor-pointer ${
                  persistedImages.length + newImageFiles.length >= MAX_TRADE_IMAGES ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                <ImagePlus className="w-4 h-4" />
                Subir desde archivos
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                  className="sr-only"
                  disabled={persistedImages.length + newImageFiles.length >= MAX_TRADE_IMAGES}
                  onChange={event => {
                    const files = event.target.files ? Array.from(event.target.files) : [];
                    event.target.value = '';
                    if (files.length > 0) handleAddFiles(files);
                  }}
                />
              </label>

              <button
                type="button"
                className={`btn btn-ghost btn-sm ${
                  persistedImages.length + newImageFiles.length >= MAX_TRADE_IMAGES ? 'opacity-50 pointer-events-none' : ''
                }`}
                onClick={() => void handlePasteFromClipboardApi()}
                disabled={isPasting || persistedImages.length + newImageFiles.length >= MAX_TRADE_IMAGES}
                title="Pega una imagen copiada en tu portapapeles o presiona Ctrl + V directamente"
              >
                {isPasting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardPaste className="w-4 h-4" />}
                Pegar imagen (o Ctrl+V)
              </button>
            </div>

            <span className="sc-sub block mt-0.5">
              Podés seleccionar archivos o copiar un gráfico (TradingView, captura de pantalla, etc.) y presionar <strong>Ctrl + V</strong> en cualquier parte.
            </span>

            {/* Galería de vistas previas de imágenes */}
            {(persistedImages.length > 0 || newImageFiles.length > 0) && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                {/* Imágenes ya existentes guardadas en Supabase */}
                {persistedImages.map((img, idx) => (
                  <div key={img.path} className="relative group rounded-lg border border-[var(--line2)] overflow-hidden bg-black/20 aspect-video flex items-center justify-center">
                    <img
                      src={img.url}
                      alt={`Operativa ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => removePersistedImage(img.path)}
                        className="btn-icon bg-red-500/80 hover:bg-red-600 text-white p-1 rounded-full"
                        style={{ width: 28, height: 28 }}
                        title="Quitar imagen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="absolute bottom-1 left-1 bg-black/70 text-[10px] px-1.5 py-0.5 rounded text-white font-mono">
                      {idx + 1}
                    </span>
                  </div>
                ))}

                {/* Nuevas imágenes pendientes de guardar */}
                {newImageFiles.map((item, idx) => (
                  <div key={item.id} className="relative group rounded-lg border border-primary/40 overflow-hidden bg-black/20 aspect-video flex items-center justify-center">
                    <img
                      src={item.previewUrl}
                      alt={`Nueva ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => removeNewFile(item.id)}
                        className="btn-icon bg-red-500/80 hover:bg-red-600 text-white p-1 rounded-full"
                        style={{ width: 28, height: 28 }}
                        title="Quitar imagen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="absolute bottom-1 left-1 bg-primary/80 text-[10px] px-1.5 py-0.5 rounded text-white font-mono">
                      Nueva {persistedImages.length + idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="field">
            <label>O pegá un link de TradingView (opcional)</label>
            <input
              type="url"
              value={tradingviewLink}
              onChange={e => setTradingviewLink(e.target.value)}
              placeholder="https://www.tradingview.com/x/..."
              className="input"
            />
          </div>

          <div className="field">
            <label>Notas o reflexion post-trade (opcional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Aprendizajes, emociones al cerrar, errores cometidos..."
              className="input"
            />
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
              {confirmDelete ? 'Confirmar?' : 'Eliminar'}
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            {!isEdit && (
              <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">
                Cancelar
              </button>
            )}
            <button type="submit" form="trade-form" disabled={isSaving || isUploadingImages} className="btn btn-primary btn-sm">
              {isSaving || isUploadingImages ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isUploadingImages ? 'Subiendo imágenes...' : isEdit ? 'Guardar cambios' : 'Registrar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradeForm;
