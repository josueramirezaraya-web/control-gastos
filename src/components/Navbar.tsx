import React from 'react';
import {
  Wallet,
  Wifi,
  WifiOff,
  Eye,
  EyeOff,
  Lock,
  Bell,
  Settings,
  Sparkles,
  Layers,
  BarChart3,
  Building2,
} from 'lucide-react';
import { UserSettings } from '../types';
import { User } from 'firebase/auth';

interface NavbarProps {
  currentTab: 'dashboard' | 'reports' | 'budgets' | 'banks' | 'workspace';
  setCurrentTab: (tab: 'dashboard' | 'reports' | 'budgets' | 'banks' | 'workspace') => void;
  isOnline: boolean;
  offlineCount: number;
  settings: UserSettings;
  onToggleHideBalances: () => void;
  onLockApp: () => void;
  unreadNotifications: number;
  onOpenNotifications: () => void;
  onOpenSettings: () => void;
  onOpenAIChat: () => void;
  googleUser: User | null;
  onOpenGoogleWorkspace: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  isOnline,
  offlineCount,
  settings,
  onToggleHideBalances,
  onLockApp,
  unreadNotifications,
  onOpenNotifications,
  onOpenSettings,
  onOpenAIChat,
  googleUser,
  onOpenGoogleWorkspace,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Offline Pill */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentTab('dashboard')}
              className="flex items-center gap-2.5 text-left group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 p-0.5 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                  JERA
                  <span className="text-[10px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Pro
                  </span>
                </span>
                <span className="text-[11px] text-slate-400 block -mt-0.5">Control Inteligente</span>
              </div>
            </button>

            {/* Offline Status Badge */}
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                isOnline
                  ? 'bg-slate-900/60 border-slate-800 text-slate-400'
                  : 'bg-amber-950/40 border-amber-500/40 text-amber-300 animate-pulse'
              }`}
              title={
                isOnline
                  ? 'Conectado a la red'
                  : 'Modo Offline: las transacciones se almacenan localmente y se sincronizan al recuperar conexión'
              }
            >
              {isOnline ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <Wifi className="w-3 h-3 text-emerald-400" />
                  <span className="text-[11px]">En línea</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  <WifiOff className="w-3 h-3 text-amber-400" />
                  <span className="text-[11px]">
                    Offline {offlineCount > 0 ? `(${offlineCount} pendientes)` : ''}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/70 p-1 rounded-xl border border-slate-800/80">
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                currentTab === 'dashboard'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setCurrentTab('reports')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                currentTab === 'reports'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Reportes</span>
            </button>

            <button
              onClick={() => setCurrentTab('budgets')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                currentTab === 'budgets'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
              <span>Presupuestos</span>
            </button>

            <button
              onClick={() => setCurrentTab('banks')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                currentTab === 'banks'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Cuentas Bancarias</span>
            </button>

            <button
              onClick={() => setCurrentTab('workspace')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                currentTab === 'workspace'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              <span>Google Workspace</span>
            </button>
          </nav>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* AI Advisor Trigger */}
            <button
              onClick={onOpenAIChat}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 hover:from-emerald-500/20 hover:to-cyan-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition-all cursor-pointer shadow-sm active:scale-95"
              title="Abrir Asesor Financiero IA"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="hidden sm:inline">Asesor IA</span>
            </button>

            {/* Hide / Show Balance Toggle */}
            <button
              onClick={onToggleHideBalances}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all cursor-pointer"
              title={settings.hideBalances ? 'Mostrar saldos' : 'Ocultar saldos'}
            >
              {settings.hideBalances ? (
                <EyeOff className="w-4 h-4 text-amber-400" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>

            {/* Notification Bell */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all cursor-pointer"
              title="Centro de Notificaciones"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifications > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-slate-950 animate-ping" />
              )}
              {unreadNotifications > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-slate-950" />
              )}
            </button>

            {/* Google Workspace status indicator */}
            <button
              onClick={onOpenGoogleWorkspace}
              className="hidden lg:flex items-center gap-1.5 p-1.5 rounded-xl text-xs text-slate-300 hover:bg-slate-900 border border-slate-800 cursor-pointer"
              title="Integraciones Google (Sheets, Gmail, Calendar)"
            >
              {googleUser ? (
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-[10px]">
                    G
                  </div>
                  <span className="text-[11px] max-w-[80px] truncate text-slate-300">
                    {googleUser.displayName || 'Google'}
                  </span>
                </div>
              ) : (
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                  Workspace
                </span>
              )}
            </button>

            {/* Lock Vault Button */}
            <button
              onClick={onLockApp}
              className="p-2 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all cursor-pointer"
              title="Bloquear Bóveda ahora"
            >
              <Lock className="w-4 h-4" />
            </button>

            {/* Settings Button */}
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all cursor-pointer"
              title="Ajustes y Personalización"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-900/60 text-xs">
          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`py-1 px-2 rounded-md font-medium ${
              currentTab === 'dashboard' ? 'text-emerald-400' : 'text-slate-400'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setCurrentTab('reports')}
            className={`py-1 px-2 rounded-md font-medium ${
              currentTab === 'reports' ? 'text-emerald-400' : 'text-slate-400'
            }`}
          >
            Reportes
          </button>
          <button
            onClick={() => setCurrentTab('budgets')}
            className={`py-1 px-2 rounded-md font-medium ${
              currentTab === 'budgets' ? 'text-emerald-400' : 'text-slate-400'
            }`}
          >
            Presupuestos
          </button>
          <button
            onClick={() => setCurrentTab('banks')}
            className={`py-1 px-2 rounded-md font-medium ${
              currentTab === 'banks' ? 'text-emerald-400' : 'text-slate-400'
            }`}
          >
            Bancos
          </button>
          <button
            onClick={() => setCurrentTab('workspace')}
            className={`py-1 px-2 rounded-md font-medium ${
              currentTab === 'workspace' ? 'text-emerald-400' : 'text-slate-400'
            }`}
          >
            Google
          </button>
        </div>
      </div>
    </header>
  );
};
