import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  Upload,
  Sparkles,
  Check,
  AlertCircle,
  Receipt,
  Layers,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { GeminiService, ReceiptAnalysisResult } from '../services/geminiService';
import { BankAccount, Category, Transaction } from '../types';

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  categories: Category[];
  accounts: BankAccount[];
  currencySymbol: string;
}

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  isOpen,
  onClose,
  onSaveTransaction,
  categories,
  accounts,
  currencySymbol,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<ReceiptAnalysisResult | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string>(accounts[0]?.id || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        setErrorMsg('La imagen debe ser menor a 8MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
        setResult(null);
        setErrorMsg(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage) return;
    setIsAnalyzing(true);
    setErrorMsg(null);
    try {
      const data = await GeminiService.analyzeReceipt(selectedImage);
      setResult(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al analizar la imagen con Gemini');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveAsExpense = () => {
    if (!result) return;
    const matchedAccount = accounts.find((a) => a.id === selectedAccount);

    onSaveTransaction({
      type: 'expense',
      amount: result.total,
      merchant: result.merchant || 'Ticket Escaneado',
      category: result.category || 'Alimentación',
      date: result.date || new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      accountId: selectedAccount,
      bankSource: matchedAccount?.bankName,
      notes: result.notes || `Recibo analizado con IA (${result.items?.length || 0} artículos detectados)`,
      tags: ['recibo-ia', (result.category || 'gasto').toLowerCase()],
      items: result.items,
      receiptUrl: selectedImage || undefined,
      isAiCategorized: true,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Camera className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Escanear Recibo con Gemini IA
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                  Vision 3.8
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Sube o toma una foto de tu factura o ticket para extraer montos e ítems
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* File Picker & Dropzone */}
          {!selectedImage ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-800 hover:border-emerald-500/50 rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-slate-900/30 hover:bg-slate-900/60 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="text-sm font-semibold text-white mb-1">
                Haz clic para subir o arrastra la foto del recibo
              </p>
              <p className="text-xs text-slate-400">
                Soporta tickets de supermercados, restaurantes, facturas de servicios y tiendas
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Image Preview & Retake */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/60 max-h-56 flex items-center justify-center">
                <img
                  src={selectedImage}
                  alt="Recibo"
                  className="max-h-56 w-auto object-contain"
                />
                <button
                  onClick={() => {
                    setSelectedImage(null);
                    setResult(null);
                  }}
                  className="absolute top-2 right-2 px-2.5 py-1 rounded-xl bg-black/80 hover:bg-black text-xs text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  Cambiar foto
                </button>
              </div>

              {/* Action button: Analyze */}
              {!result && (
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-xl shadow-emerald-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin" />
                      <span>Gemini analizando ticket...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Escanear y Extraer Datos con IA</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Extracted Result Card */}
          {result && (
            <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/40 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-semibold block">
                    Comercio Detectado
                  </span>
                  <h3 className="text-base font-bold text-white">{result.merchant}</h3>
                </div>
                <div className="text-right">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
                    Monto Total
                  </span>
                  <span className="text-xl font-extrabold text-emerald-400">
                    {currencySymbol} {result.total.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">Fecha Detectada:</span>
                  <span className="text-white font-medium">{result.date}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Categoría Asignada:</span>
                  <span className="inline-block px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-medium">
                    {result.category}
                  </span>
                </div>
              </div>

              {/* Items breakdown list */}
              {result.items && result.items.length > 0 && (
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-slate-400" />
                    Artículos extraídos ({result.items.length})
                  </span>
                  <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                    {result.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-950/60"
                      >
                        <span className="text-slate-300 truncate max-w-[200px]">{item.name}</span>
                        <span className="text-slate-400 font-mono">
                          {currencySymbol} {item.price.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Account to debit */}
              <div className="pt-2 border-t border-slate-800/80">
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Cuenta para debitar este gasto:
                </label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.bankName} - {a.name} ({currencySymbol}
                      {a.balance.toLocaleString('es-CL', { maximumFractionDigits: 0 })})
                    </option>
                  ))}
                </select>
              </div>

              {/* Confirm Save Button */}
              <button
                onClick={handleSaveAsExpense}
                className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer mt-3"
              >
                <Check className="w-4 h-4" />
                <span>Registrar Gasto en JERA</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
