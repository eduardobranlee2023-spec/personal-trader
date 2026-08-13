import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAccounts, ALL_ACCOUNTS_ID } from '../../contexts/AccountContext';
import { useTheme } from '../../contexts/ThemeContext';
import type { TradingAccount, FundedPhase } from '../../contexts/AccountContext';
import {
  LogOut, ChevronDown, Wallet,
  LayoutDashboard, BarChart2, CalendarDays, Shield, PieChart, BookOpen, BadgeDollarSign,
  Sun, Moon, Settings
} from 'lucide-react';
import ThemePanel from '../theme/ThemePanel';
import BrandMark from '../brand/BrandMark';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/accounts', label: 'Cuentas', icon: Wallet },
  { path: '/trades', label: 'Operaciones', icon: BarChart2 },
  { path: '/strategies', label: 'Estrategias', icon: BookOpen },
  { path: '/funding', label: 'Fondeos', icon: BadgeDollarSign },
  { path: '/stats', label: 'Estadísticas', icon: PieChart },
  { path: '/calendar', label: 'Calendario', icon: CalendarDays },
];

const phaseTag: Record<NonNullable<FundedPhase>, string> = {
  fase_1: 'tag tag-warn',
  fase_2: 'tag tag-info',
  verificada: 'tag tag-win',
};

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, signOut } = useAuth();
  const { accounts, selectedAccountId, setSelectedAccountId, isLoading: accountsLoading } = useAccounts();
  const { theme, toggleTheme, openPanel } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
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
      <nav className="shell-topbar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 shrink-0">
            <BrandMark size={32} />
            <span className="font-bold text-text text-sm hidden sm:block tracking-tight uppercase">
              Personal <span className="text-primary">Trader</span>
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
            {navItems.map(({ path, label, icon: Icon }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`nav-link ${location.pathname === path ? 'on' : ''}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <div className="relative" ref={dropdownRef}>
              <button
                id="account-selector"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="btn btn-ghost btn-sm max-w-[140px] sm:max-w-[180px]"
              >
                <Wallet className="w-3 h-3 text-primary shrink-0" />
                <span className="truncate hidden sm:block">{accountsLoading ? '...' : selectedLabel}</span>
                <ChevronDown className={`w-3 h-3 text-textMuted shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-56 panel-card shadow-2xl z-50 overflow-hidden p-0">
                  <button
                    id="account-option-all"
                    onClick={() => { setSelectedAccountId(ALL_ACCOUNTS_ID); setDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-3 text-sm transition hover:bg-white/5 flex items-center gap-2 border-b border-white/5 ${
                      selectedAccountId === ALL_ACCOUNTS_ID ? 'text-primary' : 'text-text'
                    }`}
                  >
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
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
                          acc.status === 'activa' ? 'bg-primary' :
                          acc.status === 'pausada' ? 'bg-[var(--amb)]' :
                          acc.status === 'quemada' ? 'bg-[var(--red)]' : 'bg-[var(--blu)]'
                        }`} />
                        <div className="min-w-0">
                          <div className="truncate font-medium">{acc.name}</div>
                          <div className="flex items-center gap-1.5 text-xs text-textMuted truncate mt-0.5">
                            {acc.account_type === 'fondeada' && acc.funded_phase ? (
                              <span className={phaseTag[acc.funded_phase]}>{acc.funded_phase.replace('_', ' ')}</span>
                            ) : (
                              <span>{acc.broker_or_prop_firm || acc.account_type}</span>
                            )}
                          </div>
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

            <button
              onClick={openPanel}
              title="Personalizar tema"
              className="btn-icon"
              style={{ width: 34, height: 34 }}
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
              className="btn-icon"
              style={{ width: 34, height: 34 }}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {profile?.role === 'admin' && (
              <button
                onClick={() => navigate('/admin')}
                title="Panel Admin"
                className="btn-icon"
                style={{ width: 34, height: 34 }}
              >
                <Shield className="w-4 h-4" />
              </button>
            )}

            <div className="avatar shrink-0">
              {profile?.full_name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || '?'}
            </div>

            <button
              id="nav-signout"
              onClick={handleSignOut}
              className="btn-icon hidden sm:grid"
              style={{ width: 34, height: 34 }}
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="lg:hidden border-t border-white/5 flex overflow-x-auto scrollbar-hide px-1 pb-1 pt-1 gap-0.5">
          {navItems.map(({ path, label, icon: Icon }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-[10px] shrink-0 transition-all font-medium ${
                location.pathname === path ? 'text-primary bg-primary/10' : 'text-textMuted'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="whitespace-nowrap">{label}</span>
            </button>
          ))}
          <button
            onClick={handleSignOut}
            className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-[10px] shrink-0 text-textMuted hover:text-loss transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Salir</span>
          </button>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-6 sm:py-8">
        {children}
      </main>
      <ThemePanel />
      <div className="noise" aria-hidden="true" />
    </div>
  );
};

export default AppLayout;
