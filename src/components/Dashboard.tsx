import React, { useState, useEffect } from 'react';
import {
  Plus,
  Camera,
  Building2,
  Sparkles,
  BarChart3,
  Search,
  Filter,
  Trash2,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowUpRight,
  ShieldAlert,
  Calendar,
} from 'lucide-react';
import { BankAccount, Budget, Category, Transaction, UserSettings } from '../types';
import { GeminiService, AIInsightItem } from '../services/geminiService';

interface DashboardProps {
  transactions: Transaction[];
  accounts: BankAccount[];
  categories: Category[];
  budgets: Budget[];
  settings: UserSettings;
  onOpenNewTransaction: () => void;
  onOpenReceiptScanner: () => void;
  onOpenAIChat: () => void;
  onOpenBanks: () => void;
  onOpenReports: () => void;
  onDeleteTransaction: (id: string) => void;
  onChangeCategory: (id: string, category: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  transactions,
  accounts,
  categories,
  budgets,
  settings,
  onOpenNewTransaction,
  onOpenReceiptScanner,
  onOpenAIChat,
  onOpenBanks,
  onOpenReports,
  onDeleteTransaction,
  onChangeCategory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  const [aiInsights, setAiInsights] = useState<AIInsightItem[]>([]);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  // Month calculations
  const now = new Date();
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthTxs = transactions.filter((t) => t.date.startsWith(currentMonthPrefix));

  let totalExpenses = 0;
  let totalIncome = 0;
  const categorySpending: Record<string, number> = {};

  currentMonthTxs.forEach((t) => {
    if (t.type === 'expense') {
      totalExpenses += t.amount;
      categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount;
    } else if (t.type === 'income') {
      totalIncome += t.amount;
    }
  });

  const totalBankBalance = accounts.reduce((acc, a) => acc + (a.type !== 'credit' ? a.balance : 0), 0);
  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

  // Filtered transactions
  const filteredTxs = transactions.filter((t) => {
    const matchesSearch =
      t.merchant.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.notes && t.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType =
      filterType === 'all' ? true : filterType === 'expense' ? t.type === 'expense' : t.type === 'income';

    return matchesSearch && matchesType;
  });

  // Check budgets at risk
  const budgetAlerts = budgets
    .map((b) => {
      const spent = categorySpending[b.categoryName] || 0;
      const ratio = b.limit > 0 ? spent / b.limit : 0;
      return {
        ...b,
        spent,
        ratio,
        pct: Math.round(ratio * 100),
      };
    })
    .filter((b) => b.ratio >= 0.75);

  // Fetch AI Insights once
  useEffect(() => {
    async function loadInsights() {
      setIsLoadingInsights(true);
      try {
        const insights = await GeminiService.getBudgetAdvice({
          totalIncome,
          totalExpenses,
          netSavings,
          savingsRate,
          budgetAlerts: budgetAlerts.map((b) => ({
            category: b.categoryName,
            spent: b.spent,
            limit: b.limit,
            pct: b.pct,
          })),
        });
        if (insights && insights.length > 0) {
          setAiInsights(insights);
        }
      } catch {
        // Fallback
      } finally {
        setIsLoadingInsights(false);
      }
    }

    loadInsights();
  }, [totalExpenses, totalIncome]);

  const formatMoney = (amount: number) => {
    if (settings.hideBalances) return '••••••';
    return `${settings.currencySymbol} ${amount.toLocaleString('es-CL', {
      maximumFractionDigits: 0,
    })}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Main Hero Financial Overview Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800/80 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        {/* Glow effect behind */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                Saldo Total en Cuentas
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                {accounts.length} Cuentas sincronizadas
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
              {formatMoney(totalBankBalance)}
            </h1>

            <p className="text-xs text-slate-400 mt-2 flex items-center gap-2">
              <span>Período actual:</span>
              <span className="text-slate-200 font-medium">
                {now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
              </span>
            </p>
          </div>

          {/* Monthly KPI Grid */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 border-t md:border-t-0 md:border-l border-slate-800/80 pt-4 md:pt-0 md:pl-8">
            {/* Gastos */}
            <div>
              <span className="text-[11px] uppercase font-bold text-slate-400 block mb-0.5">
                Gastos
              </span>
              <span className="text-base sm:text-lg font-black text-rose-400 block">
                {settings.hideBalances ? '••••' : `-${formatMoney(totalExpenses)}`}
              </span>
              <span className="text-[10px] text-slate-500 block">Este mes</span>
            </div>

            {/* Ingresos */}
            <div>
              <span className="text-[11px] uppercase font-bold text-slate-400 block mb-0.5">
                Ingresos
              </span>
              <span className="text-base sm:text-lg font-black text-emerald-400 block">
                {settings.hideBalances ? '••••' : `+${formatMoney(totalIncome)}`}
              </span>
              <span className="text-[10px] text-slate-500 block">Nóminas y extras</span>
            </div>

            {/* Tasa de Ahorro */}
            <div>
              <span className="text-[11px] uppercase font-bold text-slate-400 block mb-0.5">
                Ahorro (%)
              </span>
              <span className="text-base sm:text-lg font-black text-cyan-400 block">
                {settings.hideBalances ? '••%' : `${savingsRate}%`}
              </span>
              <span className="text-[10px] text-slate-500 block">
                {netSavings >= 0 ? `+${formatMoney(netSavings)}` : formatMoney(netSavings)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Quick Action Buttons Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={onOpenNewTransaction}
          className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Nuevo Gasto</span>
        </button>

        <button
          onClick={onOpenReceiptScanner}
          className="p-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-800 hover:border-emerald-500/40 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
        >
          <Camera className="w-4 h-4 text-emerald-400" />
          <span>Escanear Recibo (IA)</span>
        </button>

        <button
          onClick={onOpenBanks}
          className="p-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-800 hover:border-slate-700 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
        >
          <Building2 className="w-4 h-4 text-blue-400" />
          <span>Bancos & Sync</span>
        </button>

        <button
          onClick={onOpenAIChat}
          className="p-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-800 hover:border-purple-500/40 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
        >
          <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
          <span>Asesor IA</span>
        </button>

        <button
          onClick={onOpenReports}
          className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-800 hover:border-slate-700 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
        >
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          <span>Ver Reportes</span>
        </button>
      </div>

      {/* 3. Budget Alerts Warning Banner if any category is over 75% */}
      {budgetAlerts.length > 0 && (
        <div className="p-4 rounded-3xl bg-slate-900/70 border border-amber-500/40 backdrop-blur-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Presupuestos en Observación ({budgetAlerts.length})
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">
              Notificaciones push configuradas
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {budgetAlerts.map((b) => (
              <div
                key={b.categoryId}
                className={`p-3 rounded-2xl border text-xs ${
                  b.pct >= 100
                    ? 'bg-rose-950/20 border-rose-500/50'
                    : 'bg-amber-950/20 border-amber-500/30'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-white">{b.categoryName}</span>
                  <span
                    className={`font-black ${
                      b.pct >= 100 ? 'text-rose-400 animate-pulse' : 'text-amber-400'
                    }`}
                  >
                    {b.pct}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-1.5">
                  <div
                    style={{ width: `${Math.min(100, b.pct)}%` }}
                    className={`h-full ${b.pct >= 100 ? 'bg-rose-500' : 'bg-amber-400'}`}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Gastado: {formatMoney(b.spent)}</span>
                  <span>Límite: {formatMoney(b.limit)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Smart AI Financial Advice Cards */}
      {aiInsights.length > 0 && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-950/30 via-slate-900/50 to-slate-900/50 border border-emerald-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Consejos Inteligentes de JERA AI
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {aiInsights.slice(0, 2).map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80 text-slate-300"
              >
                <span className="font-bold text-emerald-400 block mb-1">💡 {item.title}</span>
                <p className="text-[11px] leading-relaxed text-slate-300">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Recent Transactions List with Search & Filters */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md space-y-4">
        {/* Header & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white">Transacciones Recientes</h2>
            <p className="text-xs text-slate-400">
              {filteredTxs.length} registros encontrados
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Pills */}
            <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <button
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
                  filterType === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterType('expense')}
                className={`px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
                  filterType === 'expense' ? 'bg-slate-800 text-rose-300 font-bold' : 'text-slate-400'
                }`}
              >
                Gastos
              </button>
              <button
                onClick={() => setFilterType('income')}
                className={`px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
                  filterType === 'income' ? 'bg-slate-800 text-emerald-300 font-bold' : 'text-slate-400'
                }`}
              >
                Ingresos
              </button>
            </div>

            {/* Search input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar gasto o comercio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-slate-700 w-40 sm:w-52"
              />
            </div>
          </div>
        </div>

        {/* Transactions Table / Cards */}
        {filteredTxs.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-500 text-xs">
            <Search className="w-8 h-8 mb-2 stroke-1" />
            <span>No se encontraron transacciones con los filtros actuales</span>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {filteredTxs.map((tx) => {
              const isExpense = tx.type === 'expense';
              const catObj = categories.find((c) => c.name === tx.category);

              return (
                <div
                  key={tx.id}
                  className="py-3 sm:py-3.5 flex items-center justify-between hover:bg-slate-800/30 px-2 rounded-2xl transition-colors group"
                >
                  {/* Left: Icon & Details */}
                  <div className="flex items-center gap-3 min-w-0 pr-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                        isExpense ? 'text-red-500' : 'text-emerald-400'
                      }`}
                    >
                      {isExpense ? (
                        <ArrowDownRight className="w-6 h-6" strokeWidth={3} aria-label="Gasto" />
                      ) : (
                        <ArrowUpRight className="w-6 h-6" strokeWidth={3} aria-label="Abono" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-white truncate">{tx.merchant}</h4>

                        {/* AI Badge */}
                        {tx.isAiCategorized && (
                          <span
                            className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-medium border border-emerald-500/20"
                            title="Categorizado automáticamente con Gemini IA"
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                            IA
                          </span>
                        )}

                        {/* Offline pending badge */}
                        {tx.isOfflinePending && (
                          <span className="hidden sm:inline-block px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-medium">
                            Offline
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <span
                            className="w-2 h-2 rounded-full inline-block"
                            style={{ backgroundColor: catObj?.color || '#94a3b8' }}
                          />
                          <select
                            value={tx.category}
                            onChange={(e) => onChangeCategory(tx.id, e.target.value)}
                            aria-label="Cambiar categoría"
                            title="Cambiar categoría"
                            className="bg-transparent text-slate-300 text-xs cursor-pointer hover:text-white focus:outline-none"
                          >
                            {categories
                              .filter((c) => c.type === (tx.type === 'income' ? 'income' : 'expense'))
                              .map((c) => (
                                <option key={c.id} value={c.name} className="bg-slate-900">
                                  {c.name}
                                </option>
                              ))}
                            {!categories.some((c) => c.name === tx.category) && (
                              <option value={tx.category} className="bg-slate-900">{tx.category}</option>
                            )}
                          </select>
                        </span>
                        <span>•</span>
                        <span>{tx.date}</span>
                        {tx.bankSource && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span className="hidden sm:inline text-slate-500">{tx.bankSource}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount & Actions */}
                  <div className="flex items-center gap-3 flex-shrink-0 text-right">
                    <div>
                      <span
                        className={`text-sm sm:text-base font-bold ${
                          isExpense ? 'text-white' : 'text-emerald-400'
                        }`}
                      >
                        {isExpense ? '-' : '+'}
                        {formatMoney(tx.amount)}
                      </span>
                      {tx.items && tx.items.length > 0 && (
                        <span className="text-[10px] text-slate-500 block">
                          {tx.items.length} artículos
                        </span>
                      )}
                    </div>

                    {/* Delete action */}
                    <button
                      onClick={() => {
                        if (window.confirm(`¿Eliminar la transacción "${tx.merchant}"?`)) {
                          onDeleteTransaction(tx.id);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-all cursor-pointer"
                      title="Eliminar transacción"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
