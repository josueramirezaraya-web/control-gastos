import React, { useState } from 'react';
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Plus,
  Sliders,
  DollarSign,
  Zap,
} from 'lucide-react';
import { Budget, Category, Transaction } from '../types';
import { NotificationService } from '../services/notificationService';

interface BudgetsManagerProps {
  budgets: Budget[];
  categories: Category[];
  transactions: Transaction[];
  currencySymbol: string;
  onUpdateBudgets: (newBudgets: Budget[]) => void;
}

export const BudgetsManager: React.FC<BudgetsManagerProps> = ({
  budgets,
  categories,
  transactions,
  currencySymbol,
  onUpdateBudgets,
}) => {
  const [editingBudget, setEditingBudget] = useState<{ categoryId: string; limit: number } | null>(
    null
  );
  const [pushStatusMsg, setPushStatusMsg] = useState<string | null>(null);
  const [openCat, setOpenCat] = useState<string | null>(null);

  // Calculate current month spending per category
  const now = new Date();
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const currentMonthExpenses = transactions.filter(
    (t) => t.type === 'expense' && t.date.startsWith(currentMonthPrefix)
  );

  const spendingPerCategory: Record<string, number> = {};
  currentMonthExpenses.forEach((t) => {
    spendingPerCategory[t.category] = (spendingPerCategory[t.category] || 0) + t.amount;
  });

  const totalBudgeted = budgets.reduce((acc, b) => acc + b.limit, 0);
  const totalSpentInBudgets = Object.values(spendingPerCategory).reduce((acc, v) => acc + v, 0);
  const totalPercent = totalBudgeted > 0 ? (totalSpentInBudgets / totalBudgeted) * 100 : 0;

  const handleSaveBudgetLimit = (categoryId: string, newLimit: number) => {
    if (newLimit <= 0) return;
    const updated = budgets.map((b) => (b.categoryId === categoryId ? { ...b, limit: newLimit } : b));
    onUpdateBudgets(updated);
    setEditingBudget(null);
  };

  const handleTestPushNotification = async () => {
    const granted = await NotificationService.requestPushPermission();
    if (granted) {
      NotificationService.sendBudgetAlert({
        categoryName: 'Alimentación',
        currentSpent: 480500,
        budgetLimit: 450000,
        currency: currencySymbol,
        thresholdRatio: 1.07,
      });
      setPushStatusMsg('✅ Notificación push enviada con éxito');
    } else {
      setPushStatusMsg('⚠️ Por favor permite las notificaciones en tu navegador');
    }
    setTimeout(() => setPushStatusMsg(null), 4000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner with Total Budget Progress */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 block mb-1">
              Presupuesto Mensual Global
            </span>
            <h2 className="text-2xl font-black text-white">
              {currencySymbol} {totalSpentInBudgets.toLocaleString('es-CL', { maximumFractionDigits: 0 })}{' '}
              <span className="text-sm font-normal text-slate-400">
                / {currencySymbol} {totalBudgeted.toLocaleString('es-CL', { maximumFractionDigits: 0 })} presupuestado
              </span>
            </h2>
          </div>

          {/* Test Push Notifications button */}
          <button
            onClick={handleTestPushNotification}
            className="px-3.5 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 hover:border-emerald-500/40 transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
            title="Verificar permisos de notificación push del navegador"
          >
            <Bell className="w-4 h-4 text-emerald-400" />
            <span>Probar Notificación Push</span>
          </button>
        </div>

        {pushStatusMsg && (
          <div className="mb-4 text-xs p-2 rounded-xl bg-slate-800 border border-slate-700 text-emerald-300 animate-fade-in">
            {pushStatusMsg}
          </div>
        )}

        {/* Global Progress Bar */}
        <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden p-0.5">
          <div
            style={{ width: `${Math.min(100, totalPercent)}%` }}
            className={`h-full rounded-full transition-all duration-500 ${
              totalPercent > 100
                ? 'bg-rose-500 shadow-lg shadow-rose-500/50 animate-pulse'
                : totalPercent > 80
                ? 'bg-amber-400'
                : 'bg-emerald-500'
            }`}
          />
        </div>
        <div className="flex justify-between items-center text-xs text-slate-400 mt-2">
          <span>{totalPercent.toFixed(1)}% consumido este mes</span>
          <span>
            {totalBudgeted - totalSpentInBudgets >= 0
              ? `Disponible: ${currencySymbol} ${(totalBudgeted - totalSpentInBudgets).toLocaleString('es-CL', { maximumFractionDigits: 0 })}`
              : `Excedido por: ${currencySymbol} ${Math.abs(
                  totalBudgeted - totalSpentInBudgets
                ).toLocaleString('es-CL', { maximumFractionDigits: 0 })}`}
          </span>
        </div>
      </div>

      {/* Por categoría: gastos del mes en gráfico circular */}
      {(() => {
        const slices = Object.entries(spendingPerCategory)
          .filter(([, v]) => v > 0)
          .sort((a, b) => b[1] - a[1])
          .map(([name, amount]) => ({
            name,
            amount,
            pct: totalSpentInBudgets > 0 ? (amount / totalSpentInBudgets) * 100 : 0,
            color: categories.find((c) => c.name === name)?.color || '#64748b',
          }));
        const C = 2 * Math.PI * 54;
        let offset = 0;
        return (
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
            <h3 className="text-sm font-semibold text-slate-400 mb-4">Por categoría</h3>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <svg viewBox="0 0 150 150" className="w-40 h-40 flex-shrink-0" role="img" aria-label="Gastos del mes por categoría">
                <g transform="rotate(-90 75 75)">
                  <circle cx="75" cy="75" r="54" fill="none" stroke="#1e293b" strokeWidth="16" />
                  {slices.map((sl) => {
                    const len = (sl.pct / 100) * C;
                    const gap = slices.length > 1 ? 2 : 0;
                    const el = (
                      <circle
                        key={sl.name}
                        cx="75"
                        cy="75"
                        r="54"
                        fill="none"
                        stroke={sl.color}
                        strokeWidth="16"
                        strokeDasharray={`${Math.max(len - gap, 0.1)} ${C}`}
                        strokeDashoffset={-offset}
                      />
                    );
                    offset += len;
                    return el;
                  })}
                </g>
                <text x="75" y="70" textAnchor="middle" fill="#94a3b8" fontSize="9">Gastado</text>
                <text x="75" y="86" textAnchor="middle" fill="#f1f5f9" fontSize="13" fontWeight="700">
                  {currencySymbol}{totalSpentInBudgets.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                </text>
              </svg>
              <div className="flex-1 w-full space-y-2 text-sm">
                {slices.length === 0 ? (
                  <p className="text-xs text-slate-500">Sin gastos este mes.</p>
                ) : (
                  slices.map((sl) => (
                    <div key={sl.name} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: sl.color }} />
                      <span className="text-slate-200 truncate">{sl.name}</span>
                      <span className="ml-auto font-mono text-slate-300">
                        {currencySymbol} {sl.amount.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                      </span>
                      <span className="w-12 text-right font-semibold text-white">{sl.pct.toFixed(0)}%</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Individual Category Budgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {budgets.map((b) => {
          const categoryObj = categories.find((c) => c.id === b.categoryId || c.name === b.categoryName);
          const currentSpent = spendingPerCategory[b.categoryName] || 0;
          const ratio = b.limit > 0 ? currentSpent / b.limit : 0;
          const pct = Math.round(ratio * 100);

          const isExceeded = ratio >= 1.0;
          const isWarning = ratio >= (b.alertThreshold || 0.8) && !isExceeded;

          return (
            <div
              key={b.categoryId}
              className={`p-5 rounded-3xl bg-slate-900/60 border transition-all ${
                isExceeded
                  ? 'border-rose-500/60 bg-rose-950/10 shadow-lg shadow-rose-950/20'
                  : isWarning
                  ? 'border-amber-500/40 bg-amber-950/10'
                  : 'border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: categoryObj?.color || '#10b981' }}
                  />
                  <div>
                    <h3 className="text-sm font-bold text-white">{b.categoryName}</h3>
                    <span className="text-[11px] text-slate-400">
                      Alerta al {Math.round((b.alertThreshold || 0.8) * 100)}%
                    </span>
                  </div>
                </div>

                {/* Status Badge */}
                {isExceeded ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[11px] font-semibold border border-rose-500/30">
                    <AlertCircle className="w-3 h-3 text-rose-400 animate-pulse" />
                    Excedido ({pct}%)
                  </span>
                ) : isWarning ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-semibold border border-amber-500/30">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    Cuidado ({pct}%)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 text-[11px] font-medium border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    En rango ({pct}%)
                  </span>
                )}
              </div>

              {/* Amount Progress */}
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-lg font-extrabold text-white">
                  {currencySymbol} {currentSpent.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                </span>
                <span className="text-xs text-slate-400">
                  Tope: {currencySymbol} {b.limit.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-3">
                <div
                  style={{ width: `${Math.min(100, pct)}%` }}
                  className={`h-full rounded-full transition-all duration-300 ${
                    isExceeded
                      ? 'bg-rose-500'
                      : isWarning
                      ? 'bg-amber-400'
                      : 'bg-emerald-500'
                  }`}
                />
              </div>

              {/* Desglose de movimientos considerados en esta categoría */}
              {(() => {
                const catTxs = currentMonthExpenses
                  .filter((t) => t.category === b.categoryName)
                  .sort((x, y) => (y.date + (y.time || '')).localeCompare(x.date + (x.time || '')));
                const open = openCat === b.categoryId;
                return (
                  <div className="mb-3">
                    <button
                      onClick={() => setOpenCat(open ? null : b.categoryId)}
                      aria-expanded={open}
                      className="w-full flex items-center justify-between text-xs text-slate-300 hover:text-white cursor-pointer"
                    >
                      <span>
                        {catTxs.length} movimiento{catTxs.length === 1 ? '' : 's'} considerado
                        {catTxs.length === 1 ? '' : 's'} este mes
                      </span>
                      <span className={`transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
                    </button>
                    {open && (
                      <div className="mt-2 rounded-2xl bg-slate-950/60 border border-slate-800 divide-y divide-slate-800/70">
                        {catTxs.length === 0 ? (
                          <p className="p-3 text-xs text-slate-500">
                            Sin movimientos en esta categoría este mes.
                          </p>
                        ) : (
                          catTxs.map((t) => (
                            <div key={t.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                              <div className="min-w-0 flex items-center gap-2">
                                <span className="text-red-500 font-bold">↘</span>
                                <div className="min-w-0">
                                  <span className="block truncate text-white">{t.merchant}</span>
                                  <span className="text-[11px] text-slate-500">{t.date}</span>
                                </div>
                              </div>
                              <span className="font-mono text-slate-200 flex-shrink-0">
                                −{currencySymbol} {t.amount.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Edit Limit Controls */}
              {editingBudget?.categoryId === b.categoryId ? (
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                  <span className="text-xs text-slate-400">Nuevo tope:</span>
                  <input
                    type="number"
                    min="1"
                    defaultValue={b.limit}
                    onChange={(e) =>
                      setEditingBudget({
                        categoryId: b.categoryId,
                        limit: parseFloat(e.target.value) || b.limit,
                      })
                    }
                    className="w-24 px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                  />
                  <button
                    onClick={() =>
                      handleSaveBudgetLimit(b.categoryId, editingBudget.limit)
                    }
                    className="px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 cursor-pointer"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => setEditingBudget(null)}
                    className="px-2 py-1 rounded-lg text-slate-400 text-xs hover:text-white cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                  <span className="text-slate-400">
                    Restante:{' '}
                    <strong
                      className={
                        b.limit - currentSpent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }
                    >
                      {currencySymbol} {(b.limit - currentSpent).toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                    </strong>
                  </span>
                  <button
                    onClick={() =>
                      setEditingBudget({ categoryId: b.categoryId, limit: b.limit })
                    }
                    className="text-slate-400 hover:text-emerald-400 text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Sliders className="w-3 h-3" />
                    Ajustar límite
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
