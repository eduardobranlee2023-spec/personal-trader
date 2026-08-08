import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Clock, LogOut, Mail, TrendingUp } from 'lucide-react';

const PendingAccess: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-yellow-400/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        {/* Logo & Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-16 h-16 bg-primary/20 border border-primary/40 rounded-2xl mb-4 shadow-lg shadow-primary/20">
            <TrendingUp className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-text tracking-tight">Personal Trader</h1>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-10 border border-white/10 text-center">
          {/* Icon */}
          <div className="flex items-center justify-center w-20 h-20 bg-yellow-400/10 border border-yellow-400/30 rounded-full mx-auto mb-6">
            <Clock className="w-10 h-10 text-yellow-400" />
          </div>

          <h2 className="text-2xl font-bold text-text mb-3">
            Acceso pendiente de activación
          </h2>

          <p className="text-textMuted leading-relaxed mb-6">
            Tu cuenta fue creada correctamente, pero el acceso al dashboard todavía
            no fue activado. El administrador revisará tu pago y te dará acceso
            manualmente en breve.
          </p>

          {/* Info box */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-8 text-left space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-yellow-400 shrink-0" />
              <span className="text-sm text-textMuted">
                Cuenta: <span className="text-text font-medium">{profile?.email || user?.email}</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-yellow-400 shrink-0" />
              <span className="text-sm text-textMuted">
                Estado: <span className="text-yellow-400 font-medium">Pendiente de activación</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-yellow-400 shrink-0" />
              <span className="text-sm text-textMuted">
                Acceso: <span className="text-text font-medium">De por vida (pago único)</span>
              </span>
            </div>
          </div>

          {/* Contact admin */}
          <a
            id="pending-contact-admin"
            href="mailto:eduardobranlee2023@gmail.com?subject=Activación de acceso - Personal Trader"
            className="flex items-center justify-center gap-2 w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-textMuted hover:text-text font-medium rounded-lg py-3 text-sm transition-all duration-200 mb-3"
          >
            <Mail className="w-4 h-4" />
            Contactar al administrador
          </a>

          {/* Sign out */}
          <button
            id="pending-signout"
            onClick={handleSignOut}
            className="flex items-center justify-center gap-2 w-full text-textMuted hover:text-red-400 text-sm transition-colors duration-200 py-2"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
};

export default PendingAccess;
