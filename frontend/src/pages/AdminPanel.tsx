import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  TrendingUp, Users, LogOut, CheckCircle2, Clock, XCircle,
  Shield, ChevronDown, X
} from 'lucide-react';

type AccessStatus = 'pendiente' | 'activa' | 'vencida' | 'cancelada' | 'revocada';

const statusConfig: Record<AccessStatus, { label: string; tag: string; icon: React.ReactNode }> = {
  activa: {
    label: 'Activa',
    tag: 'tag tag-win',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  pendiente: {
    label: 'Pendiente',
    tag: 'tag tag-warn',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  vencida: {
    label: 'Vencida',
    tag: 'tag tag-loss',
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
  cancelada: {
    label: 'Cancelada',
    tag: 'tag tag-neutral',
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
  revocada: {
    label: 'Revocada',
    tag: 'tag tag-loss',
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
};

const AdminPanel: React.FC = () => {
  const { profile: adminProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [renewModalUser, setRenewModalUser] = useState<Profile | null>(null);
  const [exactDateInput, setExactDateInput] = useState('');

  const fetchUsers = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setUsers(data as Profile[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleStatusChange = async (targetUser: Profile, newStatus: AccessStatus) => {
    if (newStatus === 'activa') {
      setRenewModalUser(targetUser);
      return;
    }
    
    if (targetUser.access_status === newStatus) return;
    setUpdatingId(targetUser.id);
    setMessage(null);

    const updates: Record<string, unknown> = {
      access_status: newStatus,
    };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', targetUser.id);

    if (error) {
      setMessage({ type: 'error', text: `Error al actualizar: ${error.message}` });
    } else {
      setMessage({
        type: 'success',
        text: `Acceso de ${targetUser.email} actualizado a "${newStatus}".`,
      });
      await fetchUsers();
    }
    setUpdatingId(null);
  };

  const handleRenew = async (targetUser: Profile, months: number | null, exactDate: string | null) => {
    setUpdatingId(targetUser.id);
    setRenewModalUser(null);
    setMessage(null);

    let newDate = new Date();
    // Si ya tiene una fecha futura, extendemos desde esa fecha
    if (targetUser.access_status === 'activa' && targetUser.subscription_expires_at) {
      const currentExp = new Date(targetUser.subscription_expires_at);
      if (currentExp > newDate) {
        newDate = currentExp;
      }
    }

    if (months !== null) {
      newDate.setMonth(newDate.getMonth() + months);
    } else if (exactDate !== null) {
      newDate = new Date(exactDate);
    }

    // Punto de integración de Webhooks:
    // En el futuro, un webhook de Mercado Pago o Stripe podría llamar a una Edge Function 
    // que ejecute exactamente este update en la base de datos de Supabase.
    const updates: Record<string, unknown> = {
      access_status: 'activa',
      subscription_expires_at: newDate.toISOString(),
      last_payment_confirmed_at: new Date().toISOString(),
    };

    if (!targetUser.access_granted_at) {
      updates.access_granted_at = new Date().toISOString();
      updates.access_granted_by = adminProfile?.id;
    }

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', targetUser.id);

    if (error) {
      setMessage({ type: 'error', text: `Error al renovar: ${error.message}` });
    } else {
      setMessage({
        type: 'success',
        text: `Suscripción de ${targetUser.email} renovada hasta ${newDate.toLocaleDateString()}.`,
      });
      await fetchUsers();
    }
    setUpdatingId(null);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const stats = {
    total: users.length,
    active: users.filter(u => u.access_status === 'activa').length,
    pending: users.filter(u => u.access_status === 'pendiente').length,
    vencida: users.filter(u => u.access_status === 'vencida').length,
  };

  const calculateDaysLeft = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    return days;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="shell-topbar">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="brand-mark">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="font-bold text-text text-lg">Personal Trader</span>
            <span className="tag tag-win">
              <Shield className="w-3 h-3" />
              Admin
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="btn btn-ghost btn-sm"
            >
              Dashboard
            </button>
            <button
              id="admin-signout"
              onClick={handleSignOut}
              className="btn-icon text-loss"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="page-title flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Gestión de Usuarios
          </h1>
          <p className="page-sub mt-1">Activá, pausá o renová el acceso de los traders registrados.</p>
        </div>

        <div className="stat-grid grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Total', value: stats.total, accent: false, negative: false },
            { label: 'Activos', value: stats.active, accent: true, negative: false },
            { label: 'Pendientes', value: stats.pending, warn: true },
            { label: 'Vencidos', value: stats.vencida, negative: true },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className={`sc-val ${s.accent ? 'accent' : s.negative ? 'negative' : s.warn ? 'text-warn' : ''}`}>{s.value}</div>
              <div className="sc-sub">{s.label}</div>
            </div>
          ))}
        </div>

        {message && (
          <div className={`alert mb-5 ${message.type === 'success' ? 'alert-ok' : 'alert-err'}`}>
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
            {message.text}
          </div>
        )}

        <div className="panel-card overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <span className="spinner" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-20 text-textMuted">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No hay usuarios registrados.</p>
            </div>
          ) : (
            <div className="ptable-wrap border-0 rounded-none overflow-x-auto">
              <table className="ptable min-w-[800px]">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Vencimiento</th>
                    <th style={{ textAlign: 'right' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const status = user.access_status as AccessStatus;
                    const cfg = statusConfig[status];
                    const isUpdating = updatingId === user.id;
                    const daysLeft = calculateDaysLeft(user.subscription_expires_at || null);

                    return (
                      <tr key={user.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="avatar">
                              {user.email?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <div className="sym">{user.full_name || '(sin nombre)'}</div>
                              <div className="sc-sub">{user.email}</div>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className={`tag ${user.role === 'admin' ? 'tag-info' : 'tag-neutral'}`}>
                            {user.role === 'admin' ? '⚡ Admin' : 'Trader'}
                          </span>
                        </td>

                        <td>
                          <span className={`${cfg.tag} flex items-center gap-1.5 w-fit`}>
                            {cfg.icon}
                            {cfg.label}
                          </span>
                        </td>

                        <td>
                          {user.subscription_expires_at ? (
                            <div className="flex flex-col">
                              <span className="text-sm">
                                {new Date(user.subscription_expires_at).toLocaleDateString()}
                              </span>
                              {daysLeft !== null && (
                                <span className={`text-xs ${daysLeft < 0 ? 'text-loss' : daysLeft < 5 ? 'text-warn' : 'text-textMuted'}`}>
                                  {daysLeft < 0 ? `Vencido hace ${Math.abs(daysLeft)} días` : `Quedan ${daysLeft} días`}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="sc-sub">—</span>
                          )}
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <div className="flex items-center justify-end gap-2">
                            {isUpdating ? (
                              <span className="spinner" />
                            ) : (
                              <div className="relative group">
                                <button
                                  id={`admin-action-${user.id}`}
                                  className="btn btn-ghost btn-sm"
                                >
                                  Cambiar <ChevronDown className="w-3 h-3" />
                                </button>
                                <div className="absolute right-0 top-full mt-1 min-w-[12rem] panel-card shadow-xl z-20 hidden group-hover:flex group-hover:flex-col items-stretch">
                                  <button
                                    onClick={() => handleStatusChange(user, 'activa')}
                                    className={`w-full text-left px-4 py-2.5 text-xs transition hover:bg-[var(--line)] first:rounded-t-xl disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 ${statusConfig['activa'].tag}`}
                                  >
                                    {statusConfig['activa'].icon}
                                    Renovar / Activar
                                  </button>
                                  {(['vencida', 'pendiente', 'cancelada', 'revocada'] as AccessStatus[]).map(s => (
                                    <button
                                      key={s}
                                      id={`admin-set-${s}-${user.id}`}
                                      onClick={() => handleStatusChange(user, s)}
                                      disabled={status === s}
                                      className={`w-full text-left px-4 py-2.5 text-xs transition hover:bg-[var(--line)] last:rounded-b-xl disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 ${statusConfig[s].tag}`}
                                    >
                                      {statusConfig[s].icon}
                                      {statusConfig[s].label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
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
      </main>

      {/* Renew Modal */}
      {renewModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="panel-card w-full max-w-md p-6 relative">
            <button 
              onClick={() => setRenewModalUser(null)}
              className="absolute top-4 right-4 text-textMuted hover:text-text transition"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-1">Renovar Suscripción</h2>
            <p className="text-sm text-textMuted mb-6">
              Usuario: <span className="text-text font-medium">{renewModalUser.email}</span>
            </p>

            <div className="space-y-3 mb-6">
              <button 
                onClick={() => handleRenew(renewModalUser, 1, null)}
                className="btn btn-outline w-full justify-center"
              >
                + 1 Mes
              </button>
              <button 
                onClick={() => handleRenew(renewModalUser, 3, null)}
                className="btn btn-outline w-full justify-center"
              >
                + 3 Meses
              </button>
              <button 
                onClick={() => handleRenew(renewModalUser, 12, null)}
                className="btn btn-outline w-full justify-center"
              >
                + 12 Meses
              </button>
            </div>

            <div className="border-t border-[var(--line)] pt-4">
              <label className="block text-sm font-medium mb-2">O hasta fecha exacta:</label>
              <div className="flex gap-2">
                <input 
                  type="date" 
                  className="input flex-1"
                  value={exactDateInput}
                  onChange={(e) => setExactDateInput(e.target.value)}
                />
                <button 
                  onClick={() => handleRenew(renewModalUser, null, exactDateInput)}
                  disabled={!exactDateInput}
                  className="btn btn-primary"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
