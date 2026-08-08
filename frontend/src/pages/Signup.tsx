import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { TrendingUp, Mail, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';

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
      options: {
        data: { full_name: fullName },
      },
    });

    if (error) {
      if (error.message.includes('already registered')) {
        setError('Este email ya está registrado. Iniciá sesión.');
      } else {
        setError('Error al registrarse. Intentá de nuevo.');
      }
    } else {
      setSuccess(true);
    }
    setIsLoading(false);
  };

  const passwordStrength = () => {
    if (password.length === 0) return null;
    if (password.length < 6) return { label: 'Débil', color: 'bg-red-500', width: 'w-1/4' };
    if (password.length < 10) return { label: 'Regular', color: 'bg-yellow-400', width: 'w-2/4' };
    return { label: 'Fuerte', color: 'bg-accent', width: 'w-full' };
  };

  const strength = passwordStrength();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-16 h-16 bg-primary/20 border border-primary/40 rounded-2xl mb-4 shadow-lg shadow-primary/20">
            <TrendingUp className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-text tracking-tight">Personal Trader</h1>
          <p className="text-textMuted text-sm mt-1">Tu diario de operativa profesional</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8 border border-white/10">
          {success ? (
            <div className="text-center py-4">
              <div className="flex items-center justify-center w-16 h-16 bg-accent/20 border border-accent/40 rounded-full mx-auto mb-5">
                <CheckCircle2 className="w-8 h-8 text-accent" />
              </div>
              <h2 className="text-xl font-semibold text-text mb-3">¡Cuenta creada!</h2>
              <p className="text-textMuted text-sm mb-2">
                Revisá tu bandeja de email para confirmar tu cuenta.
              </p>
              <p className="text-textMuted text-sm mb-6">
                Tu cuenta quedará <span className="text-yellow-400 font-medium">en espera</span> para que, después del pago, el administrador te dé acceso.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="bg-primary hover:bg-primaryHover text-white font-semibold rounded-lg px-6 py-2.5 text-sm transition-all duration-200"
              >
                Ir al inicio de sesión
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-text mb-6">Crear cuenta</h2>

              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 mb-5 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSignup} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-sm text-textMuted mb-1.5" htmlFor="signup-name">Nombre completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
                    <input
                      id="signup-name"
                      type="text"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="Eduardo Branlee"
                      required
                      className="w-full bg-white/5 border border-white/10 text-text placeholder-textMuted rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm text-textMuted mb-1.5" htmlFor="signup-email">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
                    <input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      required
                      className="w-full bg-white/5 border border-white/10 text-text placeholder-textMuted rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm text-textMuted mb-1.5" htmlFor="signup-password">Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
                    <input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      required
                      minLength={8}
                      className="w-full bg-white/5 border border-white/10 text-text placeholder-textMuted rounded-lg pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted hover:text-text transition"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password strength */}
                  {strength && (
                    <div className="mt-2">
                      <div className="w-full bg-white/10 rounded-full h-1">
                        <div className={`h-1 rounded-full transition-all duration-300 ${strength.color} ${strength.width}`} />
                      </div>
                      <p className="text-xs text-textMuted mt-1">Seguridad: <span className="text-text">{strength.label}</span></p>
                    </div>
                  )}
                </div>

                {/* Info box */}
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-xs text-yellow-400">
                  <strong className="block mb-1">⚠️ Acceso con confirmación manual</strong>
                  Al registrarte, tu cuenta quedará pendiente de activación. Una vez que el administrador confirme tu pago, tendrás acceso completo al dashboard.
                </div>

                {/* Submit */}
                <button
                  id="signup-submit"
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary hover:bg-primaryHover disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-2.5 text-sm transition-all duration-200 shadow-lg shadow-primary/20"
                >
                  {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-textMuted text-sm mt-6">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="text-primary hover:text-primaryHover transition">
            Iniciá sesión
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
