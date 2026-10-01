import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, LogOut, Activity, Wallet, FileText, Crosshair, 
  Award, PieChart, Calendar, Target, ChevronRight, ChevronLeft, Check 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

const PAYPAL_CLIENT_ID = 'BAAa2eHubsfQ_fFOsy2gjhH5zgK7pfQgluEWU1B9d-BFrxIT_EHAsfWDAO1vJeQvjaSF2Tb5T6rXXOoxA0';
const PAYPAL_PLAN_ID = 'P-84S703384K1964313NKXLXMQ';
const PAYPAL_PLAN_MENTOR_ID = 'P-0N777076BT7880332NK65JIQ';

const TOUR_STEPS = [
  {
    title: "Bienvenida",
    icon: Activity,
    message: "Todo tu ecosistema de trading en un solo lugar."
  },
  {
    title: "Mis Cuentas",
    icon: Wallet,
    message: "Capital inicial, capital actual y P&L de cada cuenta real o fondeada, todas juntas."
  },
  {
    title: "Operaciones",
    icon: FileText,
    message: "Registro completo de cada trade, incluso en varias cuentas a la vez con un solo formulario."
  },
  {
    title: "Estrategias",
    icon: Crosshair,
    message: "Medí qué setups te funcionan mejor con datos reales, no a ojo."
  },
  {
    title: "Fondeos",
    icon: Award,
    message: "Seguimiento de evaluaciones, fases del challenge, retiros y cuánto ya recuperaste de lo invertido."
  },
  {
    title: "Estadísticas",
    icon: PieChart,
    message: "Winrate, profit factor, drawdown, rachas, expectativa por operación — todo calculado automáticamente."
  },
  {
    title: "Calendario",
    icon: Calendar,
    message: "Tu consistencia mes a mes, de un vistazo."
  },
  {
    title: "Metas",
    icon: Target,
    message: "Objetivos personalizados con seguimiento de progreso e insignias al cumplirlos."
  }
];

const Expired: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Solo mostramos el tour si el profile cargó y el flag es falso
    if (profile && profile.has_seen_onboarding_tour === false) {
      setShowTour(true);
    }
  }, [profile]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleApprove = async (data: any) => {
    if (!user) return;
    setIsProcessing(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ paypal_subscription_id: data.subscriptionID })
        .eq('id', user.id);

      if (error) throw error;
      
    } catch (error) {
      console.error('Error al guardar suscripción:', error);
      setIsProcessing(false);
    }
  };

  const finishTour = async () => {
    setShowTour(false);
    if (user && profile?.has_seen_onboarding_tour === false) {
      // Guardar que ya vio el tour
      await supabase.from('profiles').update({ has_seen_onboarding_tour: true }).eq('id', user.id);
    }
  };

  const nextStep = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      finishTour();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
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

  if (showTour) {
    const step = TOUR_STEPS[currentStep];
    const Icon = step.icon;

    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative">
        <button 
          onClick={finishTour}
          className="absolute top-6 right-6 text-sm text-textMuted hover:text-text transition-colors"
        >
          Saltar
        </button>

        <div className="panel-card max-w-md w-full flex flex-col min-h-[450px]">
          <div className="flex-grow flex flex-col items-center justify-center p-8 text-center">
            <div className="w-24 h-24 rounded-full bg-acc/10 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(0,224,138,0.1)]">
              <Icon className="w-12 h-12 text-acc" />
            </div>
            <h2 className="text-2xl font-bold text-text mb-4">{step.title}</h2>
            <p className="text-textMuted leading-relaxed text-lg">{step.message}</p>
          </div>

          <div className="p-6 border-t border-[var(--line)] bg-white/5 flex flex-col gap-6">
            <div className="flex justify-center gap-2">
              {TOUR_STEPS.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-6 bg-acc' : 'w-2 bg-white/20'}`}
                />
              ))}
            </div>

            <div className="flex justify-between items-center gap-4">
              <button 
                onClick={prevStep}
                disabled={currentStep === 0}
                className={`btn btn-ghost px-4 ${currentStep === 0 ? 'opacity-0 pointer-events-none' : ''}`}
              >
                <ChevronLeft className="w-5 h-5 mr-1" /> Atrás
              </button>
              
              <button 
                onClick={nextStep}
                className="btn btn-primary px-6 shadow-lg shadow-acc/20"
              >
                {currentStep === TOUR_STEPS.length - 1 ? 'Empezar' : 'Siguiente'} <ChevronRight className="w-5 h-5 ml-1" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Pantalla Final de Pago (si no muestra el tour)
  let statusTitle = "Membresía Vencida";
  let statusMessage = "Tu membresía ha vencido o aún está pendiente de activación. Por favor, renová tu suscripción para seguir usando la app y acceder a todas tus herramientas.";

  if (profile?.access_status === 'pendiente') {
    statusTitle = "Sin membresía activa";
    statusMessage = "Todavía no tenés una membresía activa. Suscribite para empezar.";
  } else if (profile?.access_status === 'vencida') {
    statusTitle = "Membresía Vencida";
    statusMessage = "Tu membresía venció. Renová para seguir usando la app.";
  } else if (profile?.access_status === 'cancelada') {
    statusTitle = "Membresía Cancelada";
    statusMessage = "Cancelaste tu membresía. Podés reactivarla cuando quieras.";
  } else if (profile?.access_status === 'revocada') {
    statusTitle = "Acceso No Disponible";
    statusMessage = "Tu acceso no está disponible. Contactá al soporte.";
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-12 px-6">
      <div className="w-16 h-16 bg-loss/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <AlertCircle className="w-8 h-8 text-loss" />
      </div>
      
      <h1 className="text-3xl font-bold text-text mb-3 text-center">{statusTitle}</h1>
      <p className="text-textMuted mb-10 leading-relaxed text-center max-w-xl">
        {statusMessage}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mb-8">
        
        {/* Plan Básico */}
        <div className="panel-card flex flex-col bg-white/5 border border-[var(--line)] overflow-hidden">
          <div className="p-8 flex-grow">
            <h3 className="text-xl font-bold text-text mb-2">Plan Básico</h3>
            <div className="flex items-end gap-1 mb-4">
              <span className="text-3xl font-bold">US$ 20</span>
              <span className="text-textMuted">/mes</span>
            </div>
            
            <div className="bg-acc/10 rounded-lg p-3 mb-6 border border-acc/20">
              <p className="font-medium text-acc mb-1 text-sm">🎁 Probá 30 días gratis</p>
              <p className="text-xs text-textMuted">Cancelá cuando quieras.</p>
            </div>

            <ul className="space-y-4 text-sm text-textMuted mb-8">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-acc shrink-0 mt-0.5" />
                <span>Acceso a todo el ecosistema de trading</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-acc shrink-0 mt-0.5" />
                <span>Gestión de cuentas y operaciones</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-acc shrink-0 mt-0.5" />
                <span>Estadísticas y análisis automático</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-acc shrink-0 mt-0.5" />
                <span>Módulo de metas y calendario</span>
              </li>
            </ul>
          </div>
          
          <div className="p-6 bg-black/20 border-t border-[var(--line)]">
            <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, vault: true, intent: 'subscription' }}>
              <PayPalButtons 
                style={{ shape: 'rect', color: 'gold', layout: 'vertical', label: 'subscribe' }}
                createSubscription={(_data, actions) => actions.subscription.create({ plan_id: PAYPAL_PLAN_ID })}
                onApprove={(data, _actions) => handleApprove(data)}
              />
            </PayPalScriptProvider>
          </div>
        </div>

        {/* Plan Mentor */}
        <div className="panel-card flex flex-col bg-acc/5 border border-acc/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-acc text-background text-xs font-bold px-3 py-1 rounded-bl-lg">
            RECOMENDADO
          </div>
          <div className="p-8 flex-grow">
            <h3 className="text-xl font-bold text-text mb-2 flex items-center gap-2">
              Plan Mentor
              <Award className="w-5 h-5 text-acc" />
            </h3>
            <div className="flex items-end gap-1 mb-4">
              <span className="text-3xl font-bold">US$ 45,99</span>
              <span className="text-textMuted">/mes</span>
            </div>
            
            <div className="bg-white/5 rounded-lg p-3 mb-6 border border-white/10">
              <p className="font-medium text-text mb-1 text-sm">Sin mes de prueba</p>
              <p className="text-xs text-textMuted">Cobro inmediato al suscribirse.</p>
            </div>

            <ul className="space-y-4 text-sm text-textMuted mb-8">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-acc shrink-0 mt-0.5" />
                <span className="text-text font-medium">Todo lo incluido en el Plan Básico</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-acc shrink-0 mt-0.5" />
                <span className="text-text">Promocioná tu comunidad, curso o mentoría</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-acc shrink-0 mt-0.5" />
                <span className="text-text">Aparición destacada en el directorio "Aprender"</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-acc shrink-0 mt-0.5" />
                <span className="text-text">Link directo a tus plataformas externas</span>
              </li>
            </ul>
          </div>
          
          <div className="p-6 bg-black/20 border-t border-acc/20">
            <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, vault: true, intent: 'subscription' }}>
              <PayPalButtons 
                style={{ shape: 'rect', color: 'gold', layout: 'vertical', label: 'subscribe' }}
                createSubscription={(_data, actions) => actions.subscription.create({ plan_id: PAYPAL_PLAN_MENTOR_ID })}
                onApprove={(data, _actions) => handleApprove(data)}
              />
            </PayPalScriptProvider>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6 mt-4">
        <button 
          onClick={() => setShowTour(true)}
          className="text-sm text-acc hover:text-acc-hover transition-colors font-medium"
        >
          Ver de nuevo qué incluye Personal Trader
        </button>
        
        <button 
          onClick={handleSignOut}
          className="text-sm text-textMuted hover:text-loss transition-colors flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
};

export default Expired;
