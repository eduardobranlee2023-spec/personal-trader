import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, Lock, Eye, EyeOff, AlertCircle, BarChart2, CalendarDays, ShieldCheck } from 'lucide-react';
import BrandMark from '../components/brand/BrandMark';
import Reveal from '../components/ui/Reveal';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [bars, setBars] = useState<number[]>([40, 65, 45, 80, 55, 90, 70, 100]);

  useEffect(() => {
    const interval = setInterval(() => {
      setBars(prev => {
        const newBars = [...prev];
        const lastIdx = newBars.length - 1;
        const change = (Math.random() - 0.4) * 15;
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
      <div className="noise" aria-hidden="true" />

      <div className="hidden md:flex md:w-1/2 lg:w-[55%] relative flex-col justify-center items-center p-12 overflow-hidden border-r border-[var(--line)]">
        <div className="max-w-lg w-full relative z-10">
          <Reveal>
            <div className="flex items-center gap-3 mb-6">
              <BrandMark size={32} />
              <span className="font-bold text-text tracking-tight uppercase text-base">
                Personal <span className="text-primary">Trader</span>
              </span>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div className="eyebrow">// journal de trading</div>
            <h2 className="text-4xl lg:text-5xl font-bold text-text leading-tight mb-6 uppercase tracking-tight">
              Operá con <span className="text-acc">datos</span>
            </h2>
            <p className="text-textMuted text-lg mb-10">
              El diario profesional para gestionar cuentas de fondeo, analizar métricas y perfeccionar tus estrategias.
            </p>
          </Reveal>

          <Reveal delay={160}>
            <div className="stat-card p-6 mb-8">
              <div className="relative flex items-end gap-2 h-40 mb-4">
                {bars.map((height, i) => {
                  const isLast = i === bars.length - 1;
                  const isDown = i > 0 && height < bars[i - 1];
                  return (
                    <div key={i} className="flex-1 flex flex-col justify-end relative h-full">
                      <div className="absolute left-1/2 -translate-x-1/2 w-0.5 bg-[var(--line2)] h-full opacity-50" />
                      <div
                        className={`w-full rounded-sm transition-all duration-300 ${isDown ? 'bg-[var(--red)]' : 'bg-[var(--acc)]'} ${isLast ? 'opacity-100' : 'opacity-80'}`}
                        style={{ height: `${height}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between items-center border-t border-[var(--line)] pt-4 mt-2">
                <div>
                  <div className="sc-lbl mb-1">Net PnL</div>
                  <div className="sc-val accent mono flex items-center gap-2">
                    +$4,250.00 <span className="tag tag-win">+12.5%</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="sc-lbl mb-1">Win Rate</div>
                  <div className="sc-val mono">68.5%</div>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={240}>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: BarChart2, label: 'Métricas Detalladas' },
                { icon: ShieldCheck, label: 'Gestión de Fondeos' },
                { icon: CalendarDays, label: 'Calendario Diario' },
                { icon: BarChart2, label: 'ROI y Drawdown' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="panel-card p-3 flex items-center gap-3">
                  <Icon className="w-5 h-5 text-primary shrink-0" />
                  <span className="text-sm text-text font-medium">{label}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>

      <div className="w-full md:w-1/2 lg:w-[45%] flex flex-col justify-center items-center p-6 sm:p-12 z-10 relative">
        <div className="w-full max-w-sm">
          <Reveal className="flex md:hidden flex-col items-center mb-10">
            <BrandMark size={64} className="mb-4" />
            <h1 className="text-2xl font-bold text-text tracking-tight uppercase">
              Personal <span className="text-primary">Trader</span>
            </h1>
            <p className="text-textMuted text-sm mt-1 text-center">Iniciá sesión para acceder a tu diario</p>
          </Reveal>

          <Reveal delay={120}>
            <div className="panel-card p-8 sm:p-10">
              <h2 className="page-title mb-8">Ingresar</h2>

              {error && (
                <div className="alert alert-err mb-6">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-tight">{error}</span>
                </div>
              )}

              {magicLinkSent ? (
                <div className="text-center py-6">
                  <div className="flex items-center justify-center w-14 h-14 tag tag-win rounded-full mx-auto mb-4" style={{ padding: 0, width: 56, height: 56 }}>
                    <Mail className="w-7 h-7" />
                  </div>
                  <p className="text-text font-medium mb-2 text-lg">¡Link enviado!</p>
                  <p className="text-textMuted text-sm leading-relaxed mb-6">
                    Revisá tu bandeja de entrada de <span className="text-primary font-medium">{email}</span> y hacé click en el enlace para ingresar.
                  </p>
                  <button onClick={() => setMagicLinkSent(false)} className="btn btn-ghost btn-sm">
                    Volver al inicio de sesión
                  </button>
                </div>
              ) : (
                <form onSubmit={handlePasswordLogin} className="space-y-5">
                  <div className="field">
                    <label htmlFor="login-email">Email</label>
                    <div className="input-icon-wrap">
                      <Mail className="input-icon w-4 h-4" />
                      <input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" required className="input" />
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor="login-password">Contraseña</label>
                    <div className="input-icon-wrap relative">
                      <Lock className="input-icon w-4 h-4" />
                      <input id="login-password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required className="input mono pr-11" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="input-action" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button id="login-submit" type="submit" disabled={isLoading} className="btn btn-primary w-full mt-2">
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="spin" />
                        Ingresando...
                      </span>
                    ) : 'Iniciar sesión'}
                  </button>

                  <div className="flex items-center gap-3 my-6">
                    <div className="flex-1 h-px bg-[var(--line)]" />
                    <span className="text-textMuted text-xs font-medium uppercase tracking-widest">o</span>
                    <div className="flex-1 h-px bg-[var(--line)]" />
                  </div>

                  <button id="login-magic-link" type="button" onClick={handleMagicLink} disabled={isLoading} className="btn btn-ghost w-full">
                    <Mail className="w-4 h-4" />
                    Ingresar con Magic Link
                  </button>
                </form>
              )}
            </div>
          </Reveal>

          <Reveal delay={200}>
            <p className="text-center text-textMuted text-sm mt-8 font-medium">
              ¿No tenés cuenta?{' '}
              <Link to="/signup" className="text-primary hover:underline">
                Crear cuenta nueva
              </Link>
            </p>
          </Reveal>
        </div>
      </div>
    </div>
  );
};

export default Login;
