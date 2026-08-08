import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  TrendingUp, Users, LogOut, CheckCircle2, Clock, XCircle,
  Shield, Calendar, ChevronDown, Loader2
} from 'lucide-react';

type AccessStatus = 'pendiente' | 'activo' | 'revocado';

const statusConfig: Record<AccessStatus, { label: string; color: string; icon: React.ReactNode }> = {
  activo: {
    label: 'Activo',
    color: 'text-accent bg-accent/10 border-accent/30',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  pendiente: {
    label: 'Pendiente',
    color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  revocado: {
    label: 'Revocado',
    color: 'text-red-400 bg-red-400/10 border-red-400/30',
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
      <nav className="border-b border-white/10 bg-surface/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 bg-primary/20 border border-primary/40 rounded-lg">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold text-text text-lg">Personal Trader</span>
            <span className="flex items-center gap-1 text-xs text-accent bg-accent/10 border border-accent/30 px-2 py-0.5 rounded-full">
              <Shield className="w-3 h-3" />
              Admin
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-sm text-textMuted hover:text-text transition px-3 py-1.5 rounded-lg hover:bg-white/5"
            >
              Dashboard
            </button>
            <button
              id="admin-signout"
              onClick={handleSignOut}
              className="text-textMuted hover:text-red-400 transition p-1.5"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Gestión de Usuarios
          </h1>
          <p className="text-textMuted mt-1">Activá, pausá o revocá el acceso de los traders registrados.</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total', value: stats.total, color: 'text-text' },
            { label: 'Activos', value: stats.active, color: 'text-accent' },
            { label: 'Pendientes', value: stats.pending, color: 'text-yellow-400' },
            { label: 'Revocados', value: stats.revoked, color: 'text-red-400' },
          ].map(s => (
            <div key={s.label} className="glass rounded-xl p-5 border border-white/10">
              <div className={`text-3xl font-bold ${s.color} mb-1`}>{s.value}</div>
              <div className="text-sm text-textMuted">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Success / error message */}
        {message && (
          <div className={`flex items-center gap-2 rounded-lg px-4 py-3 mb-5 text-sm border ${
            message.type === 'success'
              ? 'bg-accent/10 border-accent/30 text-accent'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
            {message.text}
          </div>
        )}

        {/* Users table */}
        <div className="glass rounded-2xl border border-white/10 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-20 text-textMuted">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No hay usuarios registrados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-textMuted">
                    <th className="text-left px-6 py-4 font-medium">Usuario</th>
                    <th className="text-left px-6 py-4 font-medium">Rol</th>
                    <th className="text-left px-6 py-4 font-medium">Registro</th>
                    <th className="text-left px-6 py-4 font-medium">Activación</th>
                    <th className="text-left px-6 py-4 font-medium">Estado</th>
                    <th className="text-right px-6 py-4 font-medium">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, idx) => {
                    const status = user.access_status as AccessStatus;
                    const cfg = statusConfig[status];
                    const isUpdating = updatingId === user.id;

                    return (
                      <tr
                        key={user.id}
                        className={`border-b border-white/5 hover:bg-white/3 transition-colors ${idx % 2 === 0 ? '' : 'bg-white/2'}`}
                      >
                        {/* User info */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                              {user.email?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <div className="text-text font-medium">{user.full_name || '(sin nombre)'}</div>
                              <div className="text-textMuted text-xs">{user.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="px-6 py-4">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                            user.role === 'admin'
                              ? 'text-purple-400 bg-purple-400/10 border-purple-400/30'
                              : 'text-textMuted bg-white/5 border-white/10'
                          }`}>
                            {user.role === 'admin' ? '⚡ Admin' : 'Trader'}
                          </span>
                        </td>

                        {/* Created at */}
                        <td className="px-6 py-4 text-textMuted">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 shrink-0" />
                            {new Date(user.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                          </div>
                        </td>

                        {/* Granted at */}
                        <td className="px-6 py-4 text-textMuted text-xs">
                          {user.access_granted_at
                            ? new Date(user.access_granted_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
                            : <span className="opacity-40">—</span>}
                        </td>

                        {/* Status badge */}
                        <td className="px-6 py-4">
                          <span className={`flex items-center gap-1.5 w-fit text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.color}`}>
                            {cfg.icon}
                            {cfg.label}
                          </span>
                        </td>

                        {/* Action dropdown */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isUpdating ? (
                              <Loader2 className="w-4 h-4 text-primary animate-spin" />
                            ) : (
                              <div className="relative group">
                                <button
                                  id={`admin-action-${user.id}`}
                                  className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-textMuted hover:text-text text-xs px-3 py-1.5 rounded-lg transition"
                                >
                                  Cambiar <ChevronDown className="w-3 h-3" />
                                </button>
                                <div className="absolute right-0 top-full mt-1 w-36 glass rounded-xl border border-white/10 shadow-xl z-20 hidden group-hover:block">
                                  {(['activo', 'pendiente', 'revocado'] as AccessStatus[]).map(s => (
                                    <button
                                      key={s}
                                      id={`admin-set-${s}-${user.id}`}
                                      onClick={() => handleStatusChange(user, s)}
                                      disabled={status === s}
                                      className={`w-full text-left px-4 py-2.5 text-xs transition hover:bg-white/5 first:rounded-t-xl last:rounded-b-xl disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 ${
                                        statusConfig[s].color.split(' ')[0]
                                      }`}
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
