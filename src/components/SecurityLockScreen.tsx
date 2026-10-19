import React, { useState, useEffect } from 'react';
import { Fingerprint, Lock, Shield, Delete, AlertCircle } from 'lucide-react';
import { BiometricsService } from '../services/biometrics';
import { UserSettings } from '../types';

interface SecurityLockScreenProps {
  settings: UserSettings;
  onUnlock: () => void;
}

export const SecurityLockScreen: React.FC<SecurityLockScreenProps> = ({ settings, onUnlock }) => {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const supported = BiometricsService.isAvailable();
    setIsBiometricSupported(supported);

    // Auto-prompt biometrics if enabled
    if (settings.biometricsEnabled) {
      handleBiometricPrompt();
    }
  }, []);

  const handleBiometricPrompt = async () => {
    setIsVerifying(true);
    setErrorMsg('');
    try {
      const success = await BiometricsService.authenticateBiometric();
      if (success) {
        onUnlock();
      }
    } catch {
      // User can use PIN fallback
    } finally {
      setIsVerifying(false);
    }
  };

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      setErrorMsg('');

      if (nextPin.length === 4) {
        // Validate PIN
        if (BiometricsService.verifyPin(nextPin, settings.pinCode)) {
          onUnlock();
        } else {
          setErrorMsg('PIN incorrecto. Intenta de nuevo.');
          setTimeout(() => {
            setPin('');
          }, 600);
        }
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 text-white">
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Shield Icon */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-emerald-500/30 flex items-center justify-center shadow-2xl shadow-emerald-500/20">
            <Lock className="w-9 h-9 text-emerald-400" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
            <Shield className="w-4 h-4 text-black" />
          </div>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white mb-1">JERA Bóveda</h1>
        <p className="text-sm text-slate-400 text-center mb-6">
          Ingresa tu PIN de 4 dígitos o usa tu autenticación biométrica para acceder a tus finanzas
        </p>

        {/* PIN Indicators */}
        <div className="flex items-center gap-4 mb-6">
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? 'bg-emerald-400 scale-125 shadow-lg shadow-emerald-500/50'
                    : 'bg-slate-800 border border-slate-700'
                }`}
              />
            );
          })}
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 text-rose-400 text-sm mb-4 animate-shake">
            <AlertCircle className="w-4 h-4" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-4 w-full mb-6">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              onClick={() => handleKeyPress(digit)}
              className="h-16 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700 active:scale-95 text-2xl font-medium text-white transition-all flex items-center justify-center cursor-pointer"
            >
              {digit}
            </button>
          ))}

          {/* Biometrics button */}
          <button
            onClick={handleBiometricPrompt}
            disabled={isVerifying}
            className="h-16 rounded-2xl bg-slate-900/40 hover:bg-emerald-950/40 border border-slate-800/80 hover:border-emerald-500/40 active:scale-95 text-emerald-400 transition-all flex flex-col items-center justify-center cursor-pointer group"
            title="Usar Huella o Face ID"
          >
            <Fingerprint className="w-7 h-7 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] mt-0.5 text-emerald-400/80">Biometría</span>
          </button>

          {/* Zero */}
          <button
            onClick={() => handleKeyPress('0')}
            className="h-16 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700 active:scale-95 text-2xl font-medium text-white transition-all flex items-center justify-center cursor-pointer"
          >
            0
          </button>

          {/* Delete button */}
          <button
            onClick={handleDelete}
            className="h-16 rounded-2xl bg-slate-900/40 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700 active:scale-95 text-slate-400 hover:text-white transition-all flex items-center justify-center cursor-pointer"
            title="Borrar dígito"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
