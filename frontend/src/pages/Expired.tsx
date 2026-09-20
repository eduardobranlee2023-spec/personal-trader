import React from 'react';
import { AlertCircle, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Expired: React.FC = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="panel-card max-w-md w-full text-center py-12 px-8">
        <div className="w-16 h-16 bg-loss/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-8 h-8 text-loss" />
        </div>
        
        <h1 className="text-2xl font-bold text-text mb-3">Membresía Vencida</h1>
        <p className="text-textMuted mb-8 leading-relaxed">
          Tu membresía ha vencido o aún está pendiente de activación. Por favor, renová tu suscripción para seguir usando la app y acceder a todas tus herramientas.
        </p>

        <div className="flex flex-col gap-3">
          {/* Aquí irá el botón de pago en el futuro */}
          <button className="btn btn-primary w-full py-3" disabled>
            Renovar Suscripción (Próximamente)
          </button>
          
          <button 
            onClick={handleSignOut}
            className="btn btn-ghost w-full py-3 text-textMuted hover:text-text flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
};

export default Expired;
