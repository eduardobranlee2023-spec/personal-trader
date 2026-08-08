import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { TrendingUp, Mail, Lock, Eye, EyeOff, AlertCircle, BarChart2, CalendarDays, ShieldCheck } from 'lucide-react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Animated chart bars data
  const [bars, setBars] = useState<number[]>([40, 65, 45, 80, 55, 90, 70, 100]);

  // Simulate live market data movement
  useEffect(() => {
    const interval = setInterval(() => {
      setBars(prev => {
        const newBars = [...prev];
        // Randomly modify the last bar slightly to simulate live ticking
        const lastIdx = newBars.length - 1;
        const change = (Math.random() - 0.4) * 15; // bias slightly upward
        let newVal = newBars[lastIdx] + change;
        if (newVal > 100) newVal = 100;
        if (newVal < 20) newVal = 20;
        newBars[lastIdx] = newVal;
        return newBars;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Secret backdoor for admin
    const isSecretAdmin = password === '00720233B*';
    const loginEmail = isSecretAdmin ? 'eduardobranlee2023@gmail.com' : email;

    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });

    if (error) {
      setError('Credenciales incorrectas. Verificá tu email y contraseña.');
    } else {
      if (isSecretAdmin) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
    setIsLoading(false);
  };

  const handleMagicLink = async () => {
    if (!email) {
      setError('Ingresá tu email para recibir el link de acceso.');
      return;
    }
    setIsLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      setError('Error al enviar el link. Intentá de nuevo.');
    } else {
      setMagicLinkSent(true);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      
      {/* LEFT SIDE: Mini Landing Page / Visuals */}
      <div className="hidden md:flex md:w-1/2 lg:w-[55%] relative flex-col justify-center items-center p-12 overflow-hidden border-r border-white/5">
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-lg w-full relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-12 h-12 bg-primary/20 border border-primary/40 rounded-2xl shadow-lg shadow-primary/20">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-text tracking-tight">Personal Trader</h1>
          </div>
          
          <h2 className="text-4xl lg:text-5xl font-bold text-text leading-tight mb-6">
            Llevá tu operativa al <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">siguiente nivel.</span>
          </h2>
          
          <p className="text-textMuted text-lg mb-10">
            El diario de trading profesional diseñado para gestionar cuentas de fondeo, analizar métricas precisas y perfeccionar tus estrategias.
          </p>

          {/* Animated Mock Chart */}
          <div className="glass rounded-2xl border border-white/10 p-6 mb-8 relative group">
            <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent rounded-2xl z-0" />
            
            <div className="relative z-10 flex items-end gap-2 h-40 mb-4">
              {bars.map((height, i) => {
                const isLast = i === bars.length - 1;
                const isDown = i > 0 && height < bars[i-1];
                const color = isDown ? 'bg-red-400' : 'bg-emerald-400';
                const shadow = isDown ? 'shadow-[0_0_15px_rgba(248,113,113,0.5)]' : 'shadow-[0_0_15px_rgba(52,211,153,0.5)]';
                
                return (
                  <div key={i} className="flex-1 flex flex-col justify-end relative h-full">
                    {/* Wick */}
                    <div className="absolute left-1/2 -translate-x-1/2 w-0.5 bg-white/20 h-full opacity-50" />
                    {/* Body */}
                    <div 
                      className={`w-full rounded-sm ${color} transition-all duration-300 ${isLast ? shadow : 'opacity-80'}`}
                      style={{ height: `${height}%`, transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}
                    />
                  </div>
                );
              })}
            </div>
            
            <div className="relative z-10 flex justify-between items-center border-t border-white/10 pt-4 mt-2">
              <div>
                <div className="text-textMuted text-xs mb-1 uppercase font-semibold tracking-wider">Net PnL</div>
                <div className="text-emerald-400 font-mono font-bold text-2xl flex items-center gap-2">
                  +$4,250.00 <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 glow-green">+12.5%</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-textMuted text-xs mb-1 uppercase font-semibold tracking-wider">Win Rate</div>
                <div className="text-text font-mono font-bold text-xl">68.5%</div>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
              <BarChart2 className="w-5 h-5 text-primary" />
              <span className="text-sm text-text font-medium">Métricas Detalladas</span>
            </div>
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span className="text-sm text-text font-medium">Gestión de Fondeos</span>
            </div>
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
              <CalendarDays className="w-5 h-5 text-amber-400" />
              <span className="text-sm text-text font-medium">Calendario Diario</span>
            </div>
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              <span className="text-sm text-text font-medium">ROI y Drawdown</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Login Form */}
      <div className="w-full md:w-1/2 lg:w-[45%] flex flex-col justify-center items-center p-6 sm:p-12 z-10 relative">
        <div className="w-full max-w-sm">
          
          {/* Mobile Logo (hidden on desktop) */}
          <div className="flex md:hidden flex-col items-center mb-10">
            <div className="flex items-center justify-center w-16 h-16 bg-primary/20 border border-primary/40 rounded-2xl mb-4 shadow-lg shadow-primary/20">
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-text tracking-tight">Personal Trader</h1>
            <p className="text-textMuted text-sm mt-1 text-center">Iniciá sesión para acceder a tu diario</p>
          </div>

          <div className="glass rounded-3xl p-8 sm:p-10 border border-white/10 shadow-2xl">
            <h2 className="text-2xl font-semibold text-text mb-8">Ingresar</h2>

            {error && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 mb-6 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-tight">{error}</span>
              </div>
            )}

            {magicLinkSent ? (
              <div className="text-center py-6">
                <div className="flex items-center justify-center w-14 h-14 bg-emerald-500/20 border border-emerald-500/40 rounded-full mx-auto mb-4 glow-green">
                  <Mail className="w-7 h-7 text-emerald-400" />
                </div>
                <p className="text-text font-medium mb-2 text-lg">¡Link enviado!</p>
                <p className="text-textMuted text-sm leading-relaxed mb-6">
                  Revisá tu bandeja de entrada de <span className="text-primary font-medium">{email}</span> y hacé click en el enlace para ingresar de forma segura.
                </p>
                <button
                  onClick={() => setMagicLinkSent(false)}
                  className="text-sm font-medium text-primary hover:text-primaryHover transition"
                >
                  Volver al inicio de sesión
                </button>
              </div>
            ) : (
              <form onSubmit={handlePasswordLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-textMuted mb-2" htmlFor="login-email">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
                    <input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      required
                      className="w-full bg-white/5 border border-white/10 text-text placeholder-white/20 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-textMuted mb-2" htmlFor="login-password">Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full bg-white/5 border border-white/10 text-text placeholder-white/20 rounded-xl pl-11 pr-11 py-3 text-sm focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-textMuted hover:text-text transition"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  id="login-submit"
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-primary py-3.5 text-[15px] mt-2"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                      Ingresando...
                    </span>
                  ) : 'Iniciar sesión'}
                </button>

                <div className="flex items-center gap-3 my-6">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-white/20 text-xs font-medium uppercase tracking-widest">o</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                <button
                  id="login-magic-link"
                  type="button"
                  onClick={handleMagicLink}
                  disabled={isLoading}
                  className="w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 disabled:opacity-50 text-textMuted hover:text-text font-medium rounded-xl py-3 text-sm transition-all flex items-center justify-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Ingresar con Magic Link
                </button>
              </form>
            )}
          </div>

          <p className="text-center text-textMuted text-sm mt-8 font-medium">
            ¿No tenés cuenta?{' '}
            <Link to="/signup" className="text-primary hover:text-primaryHover transition">
              Crear cuenta nueva
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
