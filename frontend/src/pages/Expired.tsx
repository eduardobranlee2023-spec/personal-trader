import React, { useState } from 'react';
import { AlertCircle, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

const PAYPAL_CLIENT_ID = 'BAAa2eHubsfQ_fFOsy2gjhH5zgK7pfQgluEWU1B9d-BFrxIT_EHAsfWDAO1vJeQvjaSF2Tb5T6rXXOoxA0';
const PAYPAL_PLAN_ID = 'P-84S703384K1964313NKXLXMQ';

const Expired: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleApprove = async (data: any) => {
    if (!user) return;
    setIsProcessing(true);
    
    try {
      // Guardar el subscription_id en perfiles
      const { error } = await supabase
        .from('profiles')
        .update({ paypal_subscription_id: data.subscriptionID })
        .eq('id', user.id);

      if (error) throw error;
      
      // La activación real la hace el webhook. Mostramos mensaje.
    } catch (error) {
      console.error('Error al guardar suscripción:', error);
      setIsProcessing(false);
    }
  };

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="panel-card max-w-md w-full text-center py-12 px-8">
          <div className="spinner mx-auto mb-6" />
          <h2 className="text-xl font-bold mb-2">Estamos confirmando tu pago</h2>
          <p className="text-textMuted">En breve vas a tener acceso. Podés recargar la página en unos segundos.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="panel-card max-w-md w-full text-center py-12 px-8">
        <div className="w-16 h-16 bg-loss/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-8 h-8 text-loss" />
        </div>
        
        <h1 className="text-2xl font-bold text-text mb-3">Membresía Vencida</h1>
        <p className="text-textMuted mb-6 leading-relaxed">
          Tu membresía ha vencido o aún está pendiente de activación. Por favor, renová tu suscripción para seguir usando la app y acceder a todas tus herramientas.
        </p>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-8 text-sm">
          <p className="font-medium text-win mb-1">🎁 Probá 30 días gratis</p>
          <p className="text-textMuted">Después, US$ 20/mes. Cancelá cuando quieras.</p>
        </div>

        <div className="flex flex-col gap-4">
          <PayPalScriptProvider options={{ 
            clientId: PAYPAL_CLIENT_ID, 
            vault: true, 
            intent: 'subscription' 
          }}>
            <PayPalButtons 
              style={{
                shape: 'rect',
                color: 'gold',
                layout: 'vertical',
                label: 'subscribe'
              }}
              createSubscription={(_data, actions) => {
                return actions.subscription.create({
                  plan_id: PAYPAL_PLAN_ID
                });
              }}
              onApprove={(data, _actions) => handleApprove(data)}
            />
          </PayPalScriptProvider>
          
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
