import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  TrendingUp, Users, LogOut, CheckCircle2, Clock, XCircle,
  Shield, Calendar, ChevronDown
} from 'lucide-react';

type AccessStatus = 'pendiente' | 'activo' | 'revocado';

const statusConfig: Record<AccessStatus, { label: string; tag: string; icon: React.ReactNode }> = {
  activo: {
    label: 'Activo',
    tag: 'tag tag-win',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  pendiente: {
    label: 'Pendiente',
    tag: 'tag tag-warn',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  revocado: {
    label: 'Revocado',
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
    if (targetUser.access_status === newStatus) return;
    setUpdatingId(targetUser.id);
    setMessage(null);

    const updates: Record<string, unknown> = {
      access_status: newStatus,
    };

    // If activating, set granted_at and granted_by
    if (newStatus === 'activo') {
      updates.access_granted_at = new Date().toISOString();
      updates.access_granted_by = adminProfile?.id;
    }

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

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const stats = {
    total: users.length,
    active: users.filter(u => u.access_status === 'activo').length,
    pending: users.filter(u => u.access_status === 'pendiente').length,
    revoked: users.filter(u => u.access_status === 'revocado').length,
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
          <p className="page-sub mt-1">Activá, pausá o revocá el acceso de los traders registrados.</p>
        </div>

        <div className="stat-grid grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Total', value: stats.total, accent: false, negative: false },
            { label: 'Activos', value: stats.active, accent: true, negative: false },
            { label: 'Pendientes', value: stats.pending, warn: true },
            { label: 'Revocados', value: stats.revoked, negative: true },
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
            <div className="ptable-wrap border-0 rounded-none">
              <table className="ptable">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Rol</th>
                    <th>Registro</th>
                    <th>Activación</th>
                    <th>Estado</th>
                    <th style={{ textAlign: 'right' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const status = user.access_status as AccessStatus;
                    const cfg = statusConfig[status];
                    const isUpdating = updatingId === user.id;

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
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 shrink-0" />
                            {new Date(user.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                          </div>
                        </td>

                        <td className="sc-sub">
                          {user.access_granted_at
                            ? new Date(user.access_granted_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
                            : '—'}
                        </td>

                        <td>
                          <span className={`${cfg.tag} flex items-center gap-1.5 w-fit`}>
                            {cfg.icon}
                            {cfg.label}
                          </span>
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
                                <div className="absolute right-0 top-full mt-1 w-36 panel-card shadow-xl z-20 hidden group-hover:block">
                                  {(['activo', 'pendiente', 'revocado'] as AccessStatus[]).map(s => (
                                    <button
                                      key={s}
                                      id={`admin-set-${s}-${user.id}`}
                                      onClick={() => handleStatusChange(user, s)}
                                      disabled={status === s}
                                      className={`w-full text-left px-4 py-2.5 text-xs transition hover:bg-[var(--line)] first:rounded-t-xl last:rounded-b-xl disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 ${statusConfig[s].tag}`}
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
    </div>
  );
};

export default AdminPanel;
