import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Clock, LogOut, Mail } from 'lucide-react';
import BrandMark from '../components/brand/BrandMark';
import Reveal from '../components/ui/Reveal';

const PendingAccess: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="noise" aria-hidden="true" />

      <div className="w-full max-w-lg relative z-10">
        <Reveal>
          <div className="flex flex-col items-center mb-8">
            <BrandMark size={64} className="mb-4" />
            <h1 className="text-2xl font-bold text-text tracking-tight uppercase">
              Personal <span className="text-primary">Trader</span>
            </h1>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="panel-card p-10 text-center">
            <div className="flex items-center justify-center w-20 h-20 tag tag-warn rounded-full mx-auto mb-6" style={{ padding: 0, width: 80, height: 80 }}>
              <Clock className="w-10 h-10" />
            </div>

            <h2 className="page-title mb-3">Acceso pendiente de activación</h2>

            <p className="page-sub leading-relaxed mb-6">
              Tu cuenta fue creada correctamente, pero el acceso al dashboard todavía
              no fue activado. El administrador revisará tu pago y te dará acceso
              manualmente en breve.
            </p>

            <div className="panel-card p-5 mb-8 text-left space-y-3">
              <div className="flex items-center gap-3">
                <span className="tag tag-warn shrink-0" style={{ width: 8, height: 8, padding: 0, minWidth: 8 }} />
                <span className="text-sm text-textMuted">
                  Cuenta: <span className="text-text font-medium">{profile?.email || user?.email}</span>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="tag tag-warn shrink-0" style={{ width: 8, height: 8, padding: 0, minWidth: 8 }} />
                <span className="text-sm text-textMuted">
                  Estado: <span className="tag tag-warn">Pendiente de activación</span>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="tag tag-warn shrink-0" style={{ width: 8, height: 8, padding: 0, minWidth: 8 }} />
                <span className="text-sm text-textMuted">
                  Acceso: <span className="text-text font-medium">De por vida (pago único)</span>
                </span>
              </div>
            </div>

            <a
              id="pending-contact-admin"
              href="mailto:eduardobranlee2023@gmail.com?subject=Activación de acceso - Personal Trader"
              className="btn btn-ghost w-full mb-3"
            >
              <Mail className="w-4 h-4" />
              Contactar al administrador
            </a>

            <button
              id="pending-signout"
              onClick={handleSignOut}
              className="btn btn-ghost btn-sm w-full text-loss"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          </div>
        </Reveal>
      </div>
    </div>
  );
};

export default PendingAccess;
