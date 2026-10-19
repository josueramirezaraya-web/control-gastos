import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Calendar,
  Clock,
  Tag,
  CreditCard,
  FileText,
  AlertCircle,
  Check,
} from 'lucide-react';
import { BankAccount, Category, Transaction, TransactionType } from '../types';
import { GeminiService } from '../services/geminiService';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  categories: Category[];
  accounts: BankAccount[];
  currencySymbol: string;
  isOnline: boolean;
  initialData?: Partial<Transaction>;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  categories,
  accounts,
  currencySymbol,
  isOnline,
  initialData,
}) => {
  const [type, setType] = useState<TransactionType>(initialData?.type || 'expense');
  const [amount, setAmount] = useState<string>(initialData?.amount ? String(initialData.amount) : '');
  const [merchant, setMerchant] = useState<string>(initialData?.merchant || '');
  const [category, setCategory] = useState<string>(initialData?.category || 'Alimentación');
  const [subcategory, setSubcategory] = useState<string>(initialData?.subcategory || '');
  const [accountId, setAccountId] = useState<string>(initialData?.accountId || accounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState<string>(initialData?.toAccountId || accounts[1]?.id || '');
  const [date, setDate] = useState<string>(
    initialData?.date || new Date().toISOString().split('T')[0]
  );
  const [time, setTime] = useState<string>(
    initialData?.time ||
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  );
  const [notes, setNotes] = useState<string>(initialData?.notes || '');
  const [tagInput, setTagInput] = useState<string>('');
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [isAiPredicting, setIsAiPredicting] = useState<boolean>(false);
  const [aiSuggestion, setAiSuggestion] = useState<{
    category: string;
    subcategory: string;
    confidence: number;
  } | null>(null);

  const debounceTimer = useRef<any>(null);

  useEffect(() => {
    if (initialData) {
      if (initialData.type) setType(initialData.type);
      if (initialData.amount) setAmount(String(initialData.amount));
      if (initialData.merchant) setMerchant(initialData.merchant);
      if (initialData.category) setCategory(initialData.category);
      if (initialData.subcategory) setSubcategory(initialData.subcategory);
      if (initialData.accountId) setAccountId(initialData.accountId);
      if (initialData.date) setDate(initialData.date);
      if (initialData.notes) setNotes(initialData.notes);
      if (initialData.tags) setTags(initialData.tags);
    }
  }, [initialData]);

  // Real-time AI categorization suggestion on merchant/concept typing
  useEffect(() => {
    if (type !== 'expense' || merchant.trim().length < 3) {
      setAiSuggestion(null);
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      setIsAiPredicting(true);
      try {
        const res = await GeminiService.categorize({
          description: merchant,
          amount: parseFloat(amount) || undefined,
        });

        if (res && res.category && res.category !== category) {
          setAiSuggestion({
            category: res.category,
            subcategory: res.subcategory || '',
            confidence: res.confidence || 0.85,
          });
        } else {
          setAiSuggestion(null);
        }
      } catch {
        setAiSuggestion(null);
      } finally {
        setIsAiPredicting(false);
      }
    }, 450);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [merchant, type, amount]);

  if (!isOpen) return null;

  const handleApplyAiSuggestion = () => {
    if (aiSuggestion) {
      setCategory(aiSuggestion.category);
      if (aiSuggestion.subcategory) setSubcategory(aiSuggestion.subcategory);
      setAiSuggestion(null);
    }
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const clean = tagInput.trim().replace(/^#/, '');
      if (clean && !tags.includes(clean)) {
        setTags([...tags, clean]);
        setTagInput('');
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Por favor ingresa un monto válido mayor a 0');
      return;
    }
    if (!merchant.trim()) {
      alert('Por favor ingresa un comercio o descripción');
      return;
    }

    const selectedAccount = accounts.find((a) => a.id === accountId);

    onSave({
      type,
      amount: numAmount,
      merchant: merchant.trim(),
      category: type === 'transfer' ? 'Transferencia' : category,
      subcategory: subcategory.trim() || undefined,
      accountId,
      toAccountId: type === 'transfer' ? toAccountId : undefined,
      date,
      time,
      notes: notes.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
      bankSource: selectedAccount?.bankName,
      isAiCategorized: !!aiSuggestion || !!initialData?.isAiCategorized,
    });

    onClose();
  };

  const filteredCategories = categories.filter((c) =>
    type === 'expense' ? c.type === 'expense' : c.type === 'income'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
              {type === 'expense' && <ArrowDownLeft className="w-4 h-4 text-rose-400" />}
              {type === 'income' && <ArrowUpRight className="w-4 h-4 text-emerald-400" />}
              {type === 'transfer' && <ArrowRightLeft className="w-4 h-4 text-blue-400" />}
            </div>
            <h2 className="text-lg font-bold text-white">
              {type === 'expense'
                ? 'Nuevo Gasto'
                : type === 'income'
                ? 'Nuevo Ingreso'
                : 'Nueva Transferencia'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Transaction Type Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-900/90 border border-slate-800">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                type === 'expense'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Gasto</span>
            </button>

            <button
              type="button"
              onClick={() => setType('income')}
              className={`py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                type === 'income'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Ingreso</span>
            </button>

            <button
              type="button"
              onClick={() => setType('transfer')}
              className={`py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                type === 'transfer'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Transferencia</span>
            </button>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Monto</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">
                {currencySymbol}
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                autoFocus
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-white text-2xl font-bold placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
              />
            </div>
          </div>

          {/* Merchant / Concept Input with AI prediction */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-400">
                {type === 'expense'
                  ? 'Comercio o Concepto'
                  : type === 'income'
                  ? 'Emisor o Concepto'
                  : 'Concepto de Transferencia'}
              </label>
              {isAiPredicting && (
                <span className="text-[11px] text-emerald-400 flex items-center gap-1 animate-pulse">
                  <Sparkles className="w-3 h-3" />
                  Analizando categoría con IA...
                </span>
              )}
            </div>
            <input
              type="text"
              required
              placeholder={
                type === 'expense'
                  ? 'Ej: Uber al aeropuerto, Starbucks, Mercadona...'
                  : 'Ej: Nómina mensual, Pago cliente...'
              }
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all"
            />

            {/* AI Smart Suggestion Banner */}
            {aiSuggestion && (
              <div className="mt-2 p-2.5 rounded-xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/40 flex items-center justify-between animate-fade-in">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-xs text-slate-200">
                    Sugerencia IA: <strong className="text-emerald-400">{aiSuggestion.category}</strong>
                    {aiSuggestion.subcategory ? ` (${aiSuggestion.subcategory})` : ''}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleApplyAiSuggestion}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3 h-3" />
                  Aplicar
                </button>
              </div>
            )}
          </div>

          {/* Category Selector (if not transfer) */}
          {type !== 'transfer' && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Categoría</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto pr-1">
                {filteredCategories.map((cat) => {
                  const isSelected = category === cat.name;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.name)}
                      className={`p-2 rounded-xl text-xs font-medium text-left border transition-all flex items-center gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500/20 border-emerald-500/60 text-white'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="truncate">{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Account selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                {type === 'transfer' ? 'Cuenta Origen' : 'Cuenta / Método'}
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500/50"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.bankName} - {acc.name} ({currencySymbol}
                    {acc.balance.toLocaleString('es-CL', { maximumFractionDigits: 0 })})
                  </option>
                ))}
              </select>
            </div>

            {type === 'transfer' ? (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Cuenta Destino</label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500/50"
                >
                  {accounts
                    .filter((a) => a.id !== accountId)
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.bankName} - {acc.name} ({currencySymbol}
                        {acc.balance.toLocaleString('es-CL', { maximumFractionDigits: 0 })})
                      </option>
                    ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Fecha</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            )}
          </div>

          {/* Notes & Tags */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Notas adicionales</label>
            <input
              type="text"
              placeholder="Detalle opcional..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs placeholder:text-slate-600 focus:outline-none"
            />
          </div>

          {/* Tags list */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Etiquetas (presiona Enter)
            </label>
            <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-slate-900 border border-slate-800">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-[11px]"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-rose-400 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                placeholder="Añadir etiqueta..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-600 focus:outline-none min-w-[120px]"
              />
            </div>
          </div>

          {/* Offline notice */}
          {!isOnline && (
            <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>
                Estás en <strong>modo offline</strong>. Este registro se guardará en tu dispositivo y se
                sincronizará automáticamente al conectarte.
              </span>
            </div>
          )}

          {/* Footer Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Guardar Registro</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
