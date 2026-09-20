import React, { useState, useEffect, useMemo, useRef } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { supabase } from '../lib/supabase';
import type { Goal, BibleVerse, GoalTargetType } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useAccounts } from '../contexts/AccountContext';
import { useTrades } from '../hooks/useTrades';
import {
  Target, Plus, CheckCircle2, Clock, Trash2, BookOpen,
  TrendingUp, DollarSign, Percent, Activity, Award,
  Star, Download, Share2, Medal
} from 'lucide-react';
import Reveal from '../components/ui/Reveal';

const fmtCurrency = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD' }).format(n);

type BadgeDefinition = {
  id: string;
  name: string;
  description: string;
  icon_name: string;
  accent_color: string;
  linked_goal_type: string | null;
};

type UserBadge = {
  id: string;
  user_id: string;
  badge_definition_id: string;
  goal_id: string | null;
  earned_at: string;
  badge_definitions: BadgeDefinition;
};

const BADGE_ICONS: Record<string, React.ElementType> = {
  TrendingUp, DollarSign, Target, Star, Award,
};

const SUGGESTED_GOALS = [
  { title: 'Alcanzar US$ 100.000 de capital total', type: 'capital_total' as GoalTargetType, value: 100000 },
  { title: 'Ganar US$ 10.000 (P&L)', type: 'ganancia_periodo' as GoalTargetType, value: 10000 },
  { title: 'Mantener Win Rate del 70%', type: 'winrate' as GoalTargetType, value: 70 },
];

function generateBadgeCanvas(badge: BadgeDefinition, earnedAt: string): Promise<Blob> {
  return new Promise(resolve => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 450;
    const ctx = canvas.getContext('2d')!;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 800, 450);
    grad.addColorStop(0, '#0d1117');
    grad.addColorStop(1, '#141c25');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 450);

    // Glow circle
    const glow = ctx.createRadialGradient(400, 200, 20, 400, 200, 200);
    glow.addColorStop(0, badge.accent_color + '30');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 800, 450);

    // Border
    ctx.strokeStyle = badge.accent_color + '60';
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, 776, 426);

    // Medal circle
    ctx.beginPath();
    ctx.arc(400, 180, 70, 0, Math.PI * 2);
    ctx.fillStyle = badge.accent_color + '20';
    ctx.fill();
    ctx.strokeStyle = badge.accent_color;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Medal emoji (draw as text)
    ctx.font = '64px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🏅', 400, 180);

    // App branding
    ctx.font = 'bold 14px system-ui';
    ctx.fillStyle = badge.accent_color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('PERSONAL TRADER', 400, 50);

    // Badge name
    ctx.font = 'bold 36px system-ui';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(badge.name, 400, 295);

    // Description
    ctx.font = '18px system-ui';
    ctx.fillStyle = '#9ca3af';
    ctx.fillText(badge.description, 400, 335);

    // Date
    const date = new Date(earnedAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
    ctx.font = '14px system-ui';
    ctx.fillStyle = badge.accent_color + 'aa';
    ctx.fillText(`Ganada el ${date}`, 400, 395);

    canvas.toBlob(blob => resolve(blob!), 'image/png');
  });
}

const GoalsPage: React.FC = () => {
  const { user } = useAuth();
  const { globalStats, selectedAccountId } = useAccounts();
  const { trades } = useTrades({ accountId: selectedAccountId !== '__ALL__' ? selectedAccountId : undefined });

  const [goals, setGoals] = useState<Goal[]>([]);
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [badgeDefs, setBadgeDefs] = useState<BadgeDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const completingGoals = useRef<Set<string>>(new Set());

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '', description: '',
    target_type: 'capital_total' as GoalTargetType,
    target_value: '', deadline: ''
  });

  const fetchGoals = async () => {
    if (!user) return;
    const { data } = await supabase.from('goals').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) setGoals(data as Goal[]);
  };

  const fetchBadges = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_badges')
      .select('*, badge_definitions(*)')
      .eq('user_id', user.id)
      .order('earned_at', { ascending: false });
    if (data) setBadges(data as UserBadge[]);
  };

  const fetchBadgeDefs = async () => {
    const { data } = await supabase.from('badge_definitions').select('*');
    if (data) setBadgeDefs(data as BadgeDefinition[]);
  };

  const fetchVerses = async () => {
    const { data } = await supabase.from('bible_verses').select('*').order('id');
    if (data) setVerses(data as BibleVerse[]);
  };

  useEffect(() => {
    Promise.all([fetchGoals(), fetchVerses(), fetchBadges(), fetchBadgeDefs()])
      .then(() => setIsLoading(false));
  }, [user]);

  const verseOfTheDay = useMemo(() => {
    if (verses.length === 0) return null;
    const dayOfYear = Math.floor(Date.now() / 86400000);
    return verses[dayOfYear % verses.length];
  }, [verses]);

  const awardBadge = async (goal: Goal) => {
    if (!user || completingGoals.current.has(goal.id)) return;
    completingGoals.current.add(goal.id);

    // Find badge definition for this goal type
    const def = badgeDefs.find(d => d.linked_goal_type === goal.target_type) ||
                badgeDefs.find(d => d.id === 'generic');
    if (!def) return;

    // Avoid duplicate badges for the same goal
    const alreadyAwarded = badges.some(b => b.goal_id === goal.id);
    if (alreadyAwarded) return;

    await supabase.from('user_badges').insert([{
      user_id: user.id,
      badge_definition_id: def.id,
      goal_id: goal.id,
    }]);

    fetchBadges();
  };

  const goalsWithProgress = useMemo(() => {
    return goals.map(goal => {
      let currentProgress = 0;
      switch (goal.target_type) {
        case 'capital_total':
          currentProgress = globalStats.totalCurrentBalance;
          break;
        case 'ganancia_periodo': {
          const goalDate = new Date(goal.created_at).getTime();
          currentProgress = trades
            .filter(t => new Date(t.trade_date).getTime() >= goalDate)
            .reduce((sum, t) => sum + (t.result_amount ?? 0), 0);
          break;
        }
        case 'winrate': {
          const total = globalStats.totalWins + globalStats.totalLosses;
          currentProgress = total > 0 ? (globalStats.totalWins / total) * 100 : 0;
          break;
        }
        case 'personalizada':
          currentProgress = 0;
          break;
      }

      if (goal.status === 'en_progreso' && currentProgress >= goal.target_value && goal.target_value > 0) {
        supabase.from('goals')
          .update({ status: 'completada', completed_at: new Date().toISOString() })
          .eq('id', goal.id)
          .then(() => {
            awardBadge(goal);
            fetchGoals();
          });
      }

      const percent = goal.target_value > 0
        ? Math.min(100, Math.max(0, (currentProgress / goal.target_value) * 100))
        : 0;

      return { ...goal, currentProgress, percent };
    });
  }, [goals, globalStats, trades, badgeDefs]);

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    await supabase.from('goals').insert([{
      user_id: user.id,
      title: formData.title,
      description: formData.description || null,
      target_type: formData.target_type,
      target_value: parseFloat(formData.target_value),
      deadline: formData.deadline || null,
      status: 'en_progreso'
    }]);
    setShowModal(false);
    setFormData({ title: '', description: '', target_type: 'capital_total', target_value: '', deadline: '' });
    fetchGoals();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta meta?')) return;
    await supabase.from('goals').delete().eq('id', id);
    fetchGoals();
  };

  const handleDownloadBadge = async (badge: UserBadge) => {
    const blob = await generateBadgeCanvas(badge.badge_definitions, badge.earned_at);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `insignia-${badge.badge_definitions.name.toLowerCase().replace(/\s+/g, '-')}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShareBadge = async (badge: UserBadge) => {
    const blob = await generateBadgeCanvas(badge.badge_definitions, badge.earned_at);
    const file = new File([blob], 'insignia.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: badge.badge_definitions.name, text: `¡Gané la insignia "${badge.badge_definitions.name}" en Personal Trader!` });
    } else {
      handleDownloadBadge(badge);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'capital_total': return 'Capital Total';
      case 'ganancia_periodo': return 'Ganancia (P&L)';
      case 'winrate': return 'Win Rate';
      default: return 'Personalizada';
    }
  };

  const getFormat = (type: string, val: number) => {
    if (type === 'winrate') return `${val.toFixed(1)}%`;
    if (type === 'personalizada') return val.toString();
    return fmtCurrency(val);
  };

  return (
    <AppLayout>
      <Reveal>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="page-title flex items-center gap-2.5">
              <Target className="w-6 h-6 text-primary" />
              Metas y Objetivos
            </h1>
            <p className="page-sub mt-1">Establecé tus objetivos y hacé seguimiento de tu progreso.</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            <Plus className="w-4 h-4" /> Nueva Meta
          </button>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 space-y-6">
          <Reveal delay={80}>
            <h2 className="text-lg font-semibold text-text mb-4">En Progreso</h2>
            <div className="space-y-4">
              {isLoading ? (
                <div className="panel-card p-6 text-center text-textMuted animate-pulse">Cargando metas...</div>
              ) : goalsWithProgress.filter(g => g.status === 'en_progreso').length === 0 ? (
                <div className="panel-card p-8 border-dashed flex flex-col items-center justify-center text-center text-textMuted">
                  <Target className="w-8 h-8 opacity-40 mb-3" />
                  <p>No tenés metas en progreso.</p>
                </div>
              ) : (
                goalsWithProgress.filter(g => g.status === 'en_progreso').map(goal => (
                  <div key={goal.id} className="panel-card p-5 group relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-text text-lg">{goal.title}</h3>
                        {goal.description && <p className="text-sm text-textMuted mt-1">{goal.description}</p>}
                        <div className="flex items-center gap-3 mt-3 text-xs">
                          <span className="flex items-center gap-1 text-primary bg-primary/10 px-2 py-1 rounded-md font-medium">
                            {goal.target_type === 'capital_total' ? <DollarSign className="w-3 h-3" /> : goal.target_type === 'winrate' ? <Percent className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
                            {getTypeLabel(goal.target_type)}
                          </span>
                          {goal.deadline && (
                            <span className="flex items-center gap-1 text-textMuted">
                              <Clock className="w-3 h-3" />
                              Límite: {new Date(goal.deadline).toLocaleDateString('es-AR')}
                            </span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => handleDelete(goal.id)} className="btn-icon opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-textMuted">Progreso: <strong className="text-text">{getFormat(goal.target_type, goal.currentProgress)}</strong></span>
                        <span className="text-textMuted">Objetivo: <strong className="text-text">{getFormat(goal.target_type, goal.target_value)}</strong></span>
                      </div>
                      <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all duration-1000 ease-out" style={{ width: `${goal.percent}%` }} />
                      </div>
                      <div className="text-right text-xs font-semibold text-primary">{goal.percent.toFixed(1)}%</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Reveal>

          {/* Completed Goals */}
          {goalsWithProgress.filter(g => g.status === 'completada').length > 0 && (
            <Reveal delay={120}>
              <h2 className="text-lg font-semibold text-text mb-4 mt-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-acc" /> Completadas
              </h2>
              <div className="space-y-3 opacity-75">
                {goalsWithProgress.filter(g => g.status === 'completada').map(goal => (
                  <div key={goal.id} className="panel-card p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-text line-through decoration-acc/50">{goal.title}</h3>
                      <p className="text-xs text-textMuted mt-0.5">Alcanzado el {new Date(goal.completed_at!).toLocaleDateString('es-AR')}</p>
                    </div>
                    <button onClick={() => handleDelete(goal.id)} className="btn-icon">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </Reveal>
          )}

          {/* My Badges */}
          <Reveal delay={160}>
            <h2 className="text-lg font-semibold text-text mt-4 mb-4 flex items-center gap-2">
              <Medal className="w-5 h-5 text-primary" /> Mis Insignias
            </h2>
            {badges.length === 0 ? (
              <div className="panel-card p-8 border-dashed flex flex-col items-center justify-center text-center text-textMuted">
                <Award className="w-8 h-8 opacity-40 mb-3" />
                <p className="text-sm">Completá una meta para ganar tu primera insignia.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {badges.map(badge => {
                  const def = badge.badge_definitions;
                  const IconComponent = BADGE_ICONS[def.icon_name] || Award;
                  return (
                    <div
                      key={badge.id}
                      className="panel-card p-5 relative overflow-hidden group"
                      style={{ borderColor: def.accent_color + '40' }}
                    >
                      {/* Glow bg */}
                      <div
                        className="absolute inset-0 opacity-5 transition-opacity group-hover:opacity-10"
                        style={{ background: `radial-gradient(circle at top left, ${def.accent_color}, transparent 70%)` }}
                      />
                      <div className="relative flex items-start gap-4">
                        <div
                          className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl"
                          style={{ background: def.accent_color + '20', border: `2px solid ${def.accent_color}50` }}
                        >
                          <IconComponent className="w-7 h-7" color={def.accent_color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-text">{def.name}</div>
                          <div className="text-xs text-textMuted mt-0.5">{def.description}</div>
                          <div className="text-xs mt-2" style={{ color: def.accent_color + 'aa' }}>
                            {new Date(badge.earned_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </div>
                        </div>
                      </div>
                      <div className="relative mt-4 flex gap-2">
                        <button
                          onClick={() => handleDownloadBadge(badge)}
                          className="btn btn-ghost btn-sm flex-1 text-xs gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" /> Descargar
                        </button>
                        <button
                          onClick={() => handleShareBadge(badge)}
                          className="btn btn-ghost btn-sm flex-1 text-xs gap-1.5"
                        >
                          <Share2 className="w-3.5 h-3.5" /> Compartir
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Reveal>
        </div>

        <div className="lg:col-span-1 space-y-6">
          {/* Verse of the Day */}
          <Reveal delay={200}>
            {verseOfTheDay && (
              <div className="panel-card p-6 bg-gradient-to-br from-[var(--card)] to-[var(--bg)] relative overflow-hidden border-primary/20">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <BookOpen className="w-16 h-16" />
                </div>
                <div className="text-xs font-bold tracking-widest uppercase text-primary mb-4 flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5" /> Versículo del Día
                </div>
                <p className="text-text italic leading-relaxed mb-4">
                  "{verseOfTheDay.text_es}"
                </p>
                <div className="text-sm font-semibold text-textMuted">
                  — {verseOfTheDay.reference}
                </div>
                <div className="mt-3 inline-block px-2 py-0.5 bg-white/5 rounded text-[10px] uppercase font-bold text-textMuted/70">
                  {verseOfTheDay.topic}
                </div>
              </div>
            )}
          </Reveal>

          {/* Suggested Goals */}
          <Reveal delay={240}>
            <div className="panel-card p-5">
              <h3 className="font-semibold text-text mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-acc" /> Metas Sugeridas
              </h3>
              <div className="space-y-2">
                {SUGGESTED_GOALS.map((g, i) => (
                  <button
                    key={i}
                    onClick={() => { setFormData({ ...formData, title: g.title, target_type: g.type, target_value: g.value.toString() }); setShowModal(true); }}
                    className="w-full text-left p-3 rounded-xl border border-[var(--line)] hover:border-primary/50 hover:bg-primary/5 transition-colors group"
                  >
                    <div className="font-medium text-sm text-text group-hover:text-primary transition-colors">{g.title}</div>
                    <div className="text-xs text-textMuted mt-1 flex items-center justify-between">
                      {getTypeLabel(g.type)}
                      <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="panel-card w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Nueva Meta</h2>
            <form onSubmit={handleSaveGoal} className="space-y-4">
              <div className="field">
                <label>Título de la Meta</label>
                <input required type="text" className="input" placeholder="Ej: Fondeo de 50k" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
              </div>
              <div className="field">
                <label>Descripción (Opcional)</label>
                <textarea className="input" rows={2} placeholder="Detalles extra..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="field">
                  <label>Tipo de Métrica</label>
                  <select className="input" value={formData.target_type} onChange={e => setFormData({ ...formData, target_type: e.target.value as GoalTargetType })}>
                    <option value="capital_total">Capital Total</option>
                    <option value="ganancia_periodo">Ganancia (P&L)</option>
                    <option value="winrate">Win Rate</option>
                    <option value="personalizada">Personalizada</option>
                  </select>
                </div>
                <div className="field">
                  <label>Valor Objetivo</label>
                  <input required type="number" step="0.01" className="input" placeholder="Ej: 50000" value={formData.target_value} onChange={e => setFormData({ ...formData, target_value: e.target.value })} />
                </div>
              </div>
              <div className="field">
                <label>Fecha Límite (Opcional)</label>
                <input type="date" className="input" value={formData.deadline} onChange={e => setFormData({ ...formData, deadline: e.target.value })} />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--line)]">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost">Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar Meta</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default GoalsPage;
