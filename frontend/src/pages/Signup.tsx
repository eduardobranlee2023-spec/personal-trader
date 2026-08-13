import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import BrandMark from '../components/brand/BrandMark';
import Reveal from '../components/ui/Reveal';

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      setIsLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (error) {
      if (error.message.includes('already registered')) {
        setError('Este email ya está registrado. Iniciá sesión.');
      } else {
        setError(`Error: ${error.message}`);
      }
    } else {
      setSuccess(true);
    }
    setIsLoading(false);
  };

  const passwordStrength = () => {
    if (password.length === 0) return null;
    if (password.length < 6) return { label: 'Débil', barClass: 'l', width: '25%' };
    if (password.length < 10) return { label: 'Regular', barClass: 'w', width: '50%' };
    return { label: 'Fuerte', barClass: 'w', width: '100%' };
  };

  const strength = passwordStrength();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="noise" aria-hidden="true" />

      <div className="w-full max-w-md relative z-10">
        <Reveal className="flex flex-col items-center mb-8">
          <BrandMark size={64} className="mb-4" />
          <h1 className="text-2xl font-bold text-text tracking-tight uppercase">
            Personal <span className="text-primary">Trader</span>
          </h1>
          <p className="text-textMuted text-sm mt-1">Tu diario de operativa profesional</p>
        </Reveal>

        <Reveal delay={120}>
          <div className="panel-card p-8">
            {success ? (
              <div className="text-center py-4">
                <div className="flex items-center justify-center w-16 h-16 tag tag-win rounded-full mx-auto mb-5" style={{ padding: 0, width: 64, height: 64 }}>
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="page-title mb-3">¡Cuenta creada!</h2>
                <p className="text-textMuted text-sm mb-2">
                  Revisá tu bandeja de email para confirmar tu cuenta.
                </p>
                <p className="text-textMuted text-sm mb-6">
                  Tu cuenta quedará <span className="tag tag-warn">en espera</span> para que, después del pago, el administrador te dé acceso.
                </p>
                <button onClick={() => navigate('/login')} className="btn btn-primary">
                  Ir al inicio de sesión
                </button>
              </div>
            ) : (
              <>
                <h2 className="page-title mb-6">Crear cuenta</h2>

                {error && (
                  <div className="alert alert-err mb-5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="field">
                    <label htmlFor="signup-name">Nombre completo</label>
                    <div className="input-icon-wrap">
                      <User className="input-icon w-4 h-4" />
                      <input id="signup-name" type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Eduardo Branlee" required className="input" />
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor="signup-email">Email</label>
                    <div className="input-icon-wrap">
                      <Mail className="input-icon w-4 h-4" />
                      <input id="signup-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" required className="input" />
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor="signup-password">Contraseña</label>
                    <div className="input-icon-wrap relative">
                      <Lock className="input-icon w-4 h-4" />
                      <input id="signup-password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" required minLength={8} className="input pr-10" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="input-action" aria-label={showPassword ? 'Ocultar' : 'Mostrar'}>
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {strength && (
                      <div className="mt-2">
                        <div className="ratio-bar">
                          <i className={strength.barClass} style={{ width: strength.width }} />
                        </div>
                        <p className="sc-sub">Seguridad: <span className="text-text">{strength.label}</span></p>
                      </div>
                    )}
                  </div>

                  <div className="alert alert-warn text-xs">
                    <strong className="block mb-1">Acceso con confirmación manual</strong>
                    Al registrarte, tu cuenta quedará pendiente de activación. Una vez que el administrador confirme tu pago, tendrás acceso completo.
                  </div>

                  <button id="signup-submit" type="submit" disabled={isLoading} className="btn btn-primary w-full">
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="spin" />
                        Creando cuenta...
                      </span>
                    ) : 'Crear cuenta'}
                  </button>
                </form>
              </>
            )}
          </div>
        </Reveal>

        <Reveal delay={200}>
          <p className="text-center text-textMuted text-sm mt-6">
            ¿Ya tenés cuenta?{' '}
            <Link to="/login" className="text-primary hover:underline">
              Iniciá sesión
            </Link>
          </p>
        </Reveal>
      </div>
    </div>
  );
};

export default Signup;
