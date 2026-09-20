import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAccounts, ALL_ACCOUNTS_ID } from '../../contexts/AccountContext';
import { useTheme } from '../../contexts/ThemeContext';
import type { TradingAccount, FundedPhase } from '../../contexts/AccountContext';
import {
  LogOut, ChevronDown, Wallet,
  LayoutDashboard, BarChart2, CalendarDays, Shield, PieChart, BookOpen, BadgeDollarSign, Target,
  Sun, Moon, Settings, PanelLeftClose, PanelLeftOpen, Menu, X
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
  { path: '/goals', label: 'Metas', icon: Target },
];

const phaseTag: Record<NonNullable<FundedPhase>, string> = {
  fase_1: 'tag tag-warn',
  fase_2: 'tag tag-info',
  verificada: 'tag tag-win',
};

const SIDEBAR_COLLAPSED_KEY = 'pt_sidebar_collapsed';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, signOut } = useAuth();
  const { accounts, selectedAccountId, setSelectedAccountId, isLoading: accountsLoading } = useAccounts();
  const { theme, toggleTheme, openPanel } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sidebar state
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'; } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  // Detect mobile
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Persist collapsed state
  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0'); } catch {}
      return next;
    });
  };

  // Close dropdown on outside click
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

  const sidebarClass = [
    'shell-sidebar',
    !isMobile && collapsed ? 'collapsed' : '',
    isMobile && mobileOpen ? 'mobile-open' : '',
  ].filter(Boolean).join(' ');

  const contentClass = [
    'shell-content',
    !isMobile && collapsed ? 'sidebar-collapsed' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="shell-root">
      {/* ── Overlay mobile ── */}
      {isMobile && mobileOpen && (
        <div
          className="shell-overlay visible"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={sidebarClass} aria-label="Navegación principal">
        {/* Brand */}
        <div className="ss-brand">
          <BrandMark size={30} />
          <span className="ss-brand-text">
            Personal <span style={{ color: 'var(--acc)' }}>Trader</span>
          </span>
        </div>

        {/* Nav items */}
        <nav className="shell-side">
          {navItems.map(({ path, label, icon: Icon }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`ss-item ${location.pathname === path ? 'on' : ''}`}
              title={collapsed && !isMobile ? label : undefined}
            >
              <Icon />
              <span className="ss-item-label">{label}</span>
            </button>
          ))}
        </nav>

        {/* Footer — collapse toggle (desktop only) */}
        {!isMobile && (
          <div className="ss-footer">
            <button
              onClick={toggleCollapsed}
              className="ss-item"
              title={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
            >
              {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
              <span className="ss-item-label">Colapsar</span>
            </button>
          </div>
        )}
      </aside>

      {/* ── Content area (topbar + page) ── */}
      <div className={contentClass}>
        {/* Slim topbar — utilities only */}
        <header className="shell-topbar">
          <div className="w-full px-4 sm:px-6 flex items-center justify-between gap-3">
            {/* Left: hamburger on mobile */}
            <div className="flex items-center gap-2">
              {isMobile && (
                <button
                  id="nav-hamburger"
                  onClick={() => setMobileOpen(prev => !prev)}
                  className="btn-icon"
                  style={{ width: 34, height: 34 }}
                  aria-label="Abrir menú"
                >
                  {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </button>
              )}
            </div>

            {/* Right: utilities */}
            <div className="flex items-center gap-1.5 ml-auto">
              {/* Account selector */}
              <div className="relative" ref={dropdownRef}>
                <button
                  id="account-selector"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="btn btn-ghost btn-sm max-w-[140px] sm:max-w-[200px]"
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
                              <span className="capitalize">{acc.status}</span>
                              <span>·</span>
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

              {/* Settings */}
              <button
                onClick={openPanel}
                title="Personalizar tema"
                className="btn-icon"
                style={{ width: 34, height: 34 }}
              >
                <Settings className="w-4 h-4" />
              </button>

              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                className="btn-icon"
                style={{ width: 34, height: 34 }}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Admin */}
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

              {/* Avatar */}
              <div className="avatar shrink-0">
                {profile?.full_name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || '?'}
              </div>

              {/* Logout */}
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
        </header>

        {/* Page content */}
        <main className="px-3 sm:px-6 py-6 sm:py-8">
          {children}
        </main>
        <ThemePanel />
        <div className="noise" aria-hidden="true" />
      </div>
    </div>
  );
};

export default AppLayout;
