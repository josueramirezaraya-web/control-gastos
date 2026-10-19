import React, { useState } from 'react';
import {
  X,
  Shield,
  Palette,
  DollarSign,
  Bell,
  Moon,
  Fingerprint,
  Check,
  KeyRound,
  RotateCcw,
} from 'lucide-react';
import { AccentColor, DarkTheme, UserSettings } from '../types';
import { NotificationService } from '../services/notificationService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSaveSettings: (settings: UserSettings) => void;
  onResetData: () => void;
}

const ACCENT_COLORS: Array<{ id: AccentColor; name: string; hex: string; class: string }> = [
  { id: 'emerald', name: 'Esmeralda Neón', hex: '#10b981', class: 'bg-emerald-500' },
  { id: 'cyan', name: 'Cian Cibernético', hex: '#06b6d4', class: 'bg-cyan-500' },
  { id: 'violet', name: 'Violeta Real', hex: '#8b5cf6', class: 'bg-violet-500' },
  { id: 'amber', name: 'Oro Ámbar', hex: '#f59e0b', class: 'bg-amber-500' },
  { id: 'rose', name: 'Rosa Rubí', hex: '#f43f5e', class: 'bg-rose-500' },
];

const DARK_THEMES: Array<{ id: DarkTheme; name: string; desc: string }> = [
  { id: 'pure-black', name: 'OLED Pure Black', desc: 'Negro absoluto (#000000) de máximo contraste' },
  { id: 'deep-slate', name: 'Obsidiana Slate', desc: 'Gris oscuro grafito profundo y elegante' },
  { id: 'midnight-navy', name: 'Azul Medianoche', desc: 'Tono azul marino oscuro espacial' },
];

const CURRENCIES = [
  { code: 'CLP', symbol: '$', name: 'Peso Chileno (CLP $)' },
  { code: 'USD', symbol: '$', name: 'Dólar Estadounidense ($)' },
  { code: 'EUR', symbol: '€', name: 'Euro (€)' },
  { code: 'MXN', symbol: '$', name: 'Peso Mexicano (MXN $)' },
  { code: 'COP', symbol: '$', name: 'Peso Colombiano (COP $)' },
  { code: 'CRC', symbol: '₡', name: 'Colón Costarricense (₡)' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onResetData,
}) => {
  const [current, setCurrent] = useState<UserSettings>(settings);
  const [newPin, setNewPin] = useState(settings.pinCode);
  const [pinSavedMsg, setPinSavedMsg] = useState(false);

  if (!isOpen) return null;

  const handleUpdate = (patch: Partial<UserSettings>) => {
    const updated = { ...current, ...patch };
    setCurrent(updated);
    onSaveSettings(updated);
  };

  const handleSavePin = () => {
    if (newPin.length === 4 && /^\d+$/.test(newPin)) {
      handleUpdate({ pinCode: newPin });
      setPinSavedMsg(true);
      setTimeout(() => setPinSavedMsg(false), 2500);
    } else {
      alert('El PIN debe tener exactamente 4 dígitos numéricos.');
    }
  };

  const handleTogglePush = async () => {
    if (!current.pushNotificationsEnabled) {
      const granted = await NotificationService.requestPushPermission();
      handleUpdate({ pushNotificationsEnabled: granted });
    } else {
      handleUpdate({ pushNotificationsEnabled: false });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Palette className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Ajustes & Personalización</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Section 1: Dark Design & Accent Color */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Moon className="w-3.5 h-3.5 text-emerald-400" />
              Diseño Oscuro Personalizable
            </h3>

            {/* Dark Themes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {DARK_THEMES.map((theme) => {
                const isSelected = current.darkTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => handleUpdate({ darkTheme: theme.id })}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800 border-emerald-500/50 shadow-sm'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span className="font-semibold text-white block mb-0.5">{theme.name}</span>
                    <span className="text-[10px] text-slate-400 leading-tight block">
                      {theme.desc}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Accent Colors */}
            <label className="block text-slate-400 text-[11px] mt-2 mb-1">Color de acento:</label>
            <div className="flex items-center gap-2">
              {ACCENT_COLORS.map((col) => {
                const isSelected = current.accentColor === col.id;
                return (
                  <button
                    key={col.id}
                    onClick={() => handleUpdate({ accentColor: col.id })}
                    className={`flex-1 py-2 px-1 rounded-xl border flex flex-col items-center gap-1.5 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-slate-800 border-white/60 shadow-md'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full shadow-sm"
                      style={{ backgroundColor: col.hex }}
                    />
                    <span className="text-[10px] text-slate-300 font-medium truncate max-w-full">
                      {col.name.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Biometrics & Security */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <h3 className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              Seguridad & Autenticación Biométrica
            </h3>

            {/* Biometrics Toggle */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/70 border border-slate-800">
              <div className="flex items-center gap-2.5">
                <Fingerprint className="w-5 h-5 text-emerald-400" />
                <div>
                  <span className="font-semibold text-white block">Bloqueo Biométrico</span>
                  <span className="text-[10px] text-slate-400">
                    Touch ID / Face ID al abrir la app o reactivarla
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={current.biometricsEnabled}
                onChange={(e) => handleUpdate({ biometricsEnabled: e.target.checked })}
                className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
              />
            </div>

            {/* Change 4-digit PIN */}
            <div className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-white">Código PIN de 4 Dígitos</span>
                </div>
                {pinSavedMsg && (
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    ¡PIN actualizado!
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="w-28 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-center font-mono text-base tracking-widest text-white focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={handleSavePin}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Cambiar PIN
                </button>
              </div>
            </div>

            {/* Auto Lock Timer */}
            <div>
              <label className="block text-slate-400 text-[11px] mb-1">
                Tiempo de autobloqueo por inactividad:
              </label>
              <select
                value={current.autoLockMinutes}
                onChange={(e) => handleUpdate({ autoLockMinutes: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs"
              >
                <option value={0}>Inmediato al salir de la pantalla</option>
                <option value={1}>Después de 1 minuto</option>
                <option value={5}>Después de 5 minutos (Recomendado)</option>
                <option value={15}>Después de 15 minutos</option>
              </select>
            </div>
          </div>

          {/* Section 3: Currency & Notifications */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <h3 className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              Moneda & Notificaciones Push
            </h3>

            <div>
              <label className="block text-slate-400 text-[11px] mb-1">Moneda Principal:</label>
              <select
                value={current.currency}
                onChange={(e) => {
                  const sel = CURRENCIES.find((c) => c.code === e.target.value);
                  if (sel) {
                    handleUpdate({ currency: sel.code, currencySymbol: sel.symbol });
                  }
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Push Notifications Switch */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/70 border border-slate-800">
              <div className="flex items-center gap-2.5">
                <Bell className="w-5 h-5 text-emerald-400" />
                <div>
                  <span className="font-semibold text-white block">Alertas Push de Presupuesto</span>
                  <span className="text-[10px] text-slate-400">
                    Notificar al navegador cuando un gasto exceda el presupuesto
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={current.pushNotificationsEnabled}
                onChange={handleTogglePush}
                className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Danger Zone: Reset Sample Data */}
          <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
            <span className="text-slate-500 text-[10px]">Reiniciar base de datos local</span>
            <button
              onClick={() => {
                if (window.confirm('¿Deseas restablecer los datos de ejemplo predeterminados?')) {
                  onResetData();
                  onClose();
                }
              }}
              className="text-rose-400 hover:text-rose-300 text-[11px] flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Restablecer datos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
