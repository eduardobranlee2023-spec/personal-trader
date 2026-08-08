import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAccounts, ALL_ACCOUNTS_ID } from '../../contexts/AccountContext';
import { useTheme } from '../../contexts/ThemeContext';
import type { TradingAccount } from '../../contexts/AccountContext';
import {
  TrendingUp, LogOut, ChevronDown, Wallet,
  LayoutDashboard, BarChart2, CalendarDays, Shield, PieChart, BookOpen, BadgeDollarSign,
  Sun, Moon, Menu, X
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/accounts', label: 'Cuentas', icon: Wallet },
  { path: '/trades', label: 'Operaciones', icon: BarChart2 },
  { path: '/strategies', label: 'Estrategias', icon: BookOpen },
  { path: '/funding', label: 'Fondeos', icon: BadgeDollarSign },
  { path: '/stats', label: 'Estadísticas', icon: PieChart },
  { path: '/calendar', label: 'Calendario', icon: CalendarDays },
];

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, signOut } = useAuth();
  const { accounts, selectedAccountId, setSelectedAccountId, isLoading: accountsLoading } = useAccounts();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close mobile menu on navigation
  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const selectedLabel =
    selectedAccountId === ALL_ACCOUNTS_ID
      ? 'Todas las cuentas'
      : accounts.find((a: TradingAccount) => a.id === selectedAccountId)?.name ?? 'Cuenta';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navbar */}
      <nav className="border-b border-white/10 bg-surface/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">

          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex items-center justify-center w-8 h-8 bg-primary/20 border border-primary/30 rounded-lg">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold text-text text-sm hidden sm:block tracking-tight">Personal Trader</span>
          </div>

          {/* Nav links — desktop only */}
          <div className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
            {navItems.map(({ path, label, icon: Icon }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  location.pathname === path
                    ? 'bg-primary/15 text-primary'
                    : 'text-textMuted hover:text-text hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1.5">
            {/* Account selector */}
            <div className="relative" ref={dropdownRef}>
              <button
                id="account-selector"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-text text-xs px-2.5 py-2 rounded-lg transition-all max-w-[140px] sm:max-w-[180px]"
              >
                <Wallet className="w-3 h-3 text-primary shrink-0" />
                <span className="truncate hidden sm:block">{accountsLoading ? '...' : selectedLabel}</span>
                <ChevronDown className={`w-3 h-3 text-textMuted shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-56 glass rounded-xl border border-white/10 shadow-2xl z-50 overflow-hidden">
                  <button
                    id="account-option-all"
                    onClick={() => { setSelectedAccountId(ALL_ACCOUNTS_ID); setDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-3 text-sm transition hover:bg-white/5 flex items-center gap-2 border-b border-white/5 ${
                      selectedAccountId === ALL_ACCOUNTS_ID ? 'text-primary' : 'text-text'
                    }`}
                  >
                    <div className="w-2 h-2 rounded-full bg-primary/60 shrink-0" />
                    <span className="font-medium">Todas las cuentas</span>
                  </button>
                  {accounts.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-textMuted italic">Sin cuentas creadas</div>
                  ) : (
                    accounts.map((acc: TradingAccount) => (
                      <button
                        key={acc.id}
                        id={`account-option-${acc.id}`}
                        onClick={() => { setSelectedAccountId(acc.id); setDropdownOpen(false); }}
                        className={`w-full text-left px-4 py-3 text-sm transition hover:bg-white/5 flex items-center gap-2 ${
                          selectedAccountId === acc.id ? 'text-primary' : 'text-text'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full shrink-0 ${
                          acc.status === 'activa' ? 'bg-accent' :
                          acc.status === 'pausada' ? 'bg-yellow-400' :
                          acc.status === 'quemada' ? 'bg-red-400' : 'bg-blue-400'
                        }`} />
                        <div className="min-w-0">
                          <div className="truncate font-medium">{acc.name}</div>
                          <div className="text-xs text-textMuted truncate">{acc.broker_or_prop_firm || acc.account_type}</div>
                        </div>
                      </button>
                    ))
                  )}
                  <div className="border-t border-white/5 px-4 py-2">
                    <button
                      onClick={() => { navigate('/accounts'); setDropdownOpen(false); }}
                      className="text-xs text-primary hover:underline"
                    >+ Gestionar cuentas</button>
                  </div>
                </div>
              )}
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
              className="flex items-center justify-center w-8 h-8 text-textMuted hover:text-text transition rounded-lg hover:bg-white/5"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Admin */}
            {profile?.role === 'admin' && (
              <button
                onClick={() => navigate('/admin')}
                title="Panel Admin"
                className="flex items-center justify-center w-8 h-8 text-textMuted hover:text-accent transition rounded-lg hover:bg-white/5"
              >
                <Shield className="w-4 h-4" />
              </button>
            )}

            {/* Avatar */}
            <div className="w-7 h-7 bg-primary/20 border border-primary/30 rounded-full flex items-center justify-center text-primary font-bold text-xs shrink-0">
              {profile?.full_name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || '?'}
            </div>

            {/* Sign out */}
            <button
              id="nav-signout"
              onClick={handleSignOut}
              className="text-textMuted hover:text-red-400 transition p-1.5 hidden sm:block"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Hamburger mobile */}
            <button
              className="lg:hidden flex items-center justify-center w-8 h-8 text-textMuted hover:text-text transition rounded-lg hover:bg-white/5"
              onClick={() => setMobileMenuOpen(o => !o)}
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile bottom tabs */}
        <div className="lg:hidden border-t border-white/5 flex overflow-x-auto scrollbar-hide px-1 pb-1 pt-1 gap-0.5">
          {navItems.map(({ path, label, icon: Icon }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-[10px] shrink-0 transition-all font-medium ${
                location.pathname === path
                  ? 'text-primary bg-primary/10'
                  : 'text-textMuted'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="whitespace-nowrap">{label}</span>
            </button>
          ))}
          <button
            onClick={handleSignOut}
            className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-[10px] shrink-0 text-textMuted hover:text-red-400 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Salir</span>
          </button>
        </div>
      </nav>

      {/* Page content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
