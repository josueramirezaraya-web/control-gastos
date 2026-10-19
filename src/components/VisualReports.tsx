import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  TrendingDown,
  PieChart as PieIcon,
  BarChart2,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { Category, Transaction } from '../types';
import { ExportService } from '../services/exportService';

interface VisualReportsProps {
  transactions: Transaction[];
  categories: Category[];
  currencySymbol: string;
}

export const VisualReports: React.FC<VisualReportsProps> = ({
  transactions,
  categories,
  currencySymbol,
}) => {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth()); // 0-indexed

  const monthNames = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  // Filter transactions for selected month & year
  const monthTransactions = useMemo(() => {
    const targetMonthStr = String(selectedMonth + 1).padStart(2, '0');
    const targetPrefix = `${selectedYear}-${targetMonthStr}`;
    return transactions.filter((t) => t.date.startsWith(targetPrefix));
  }, [transactions, selectedYear, selectedMonth]);

  // Aggregate stats
  const stats = useMemo(() => {
    let income = 0;
    let expenses = 0;

    monthTransactions.forEach((t) => {
      if (t.type === 'income') income += t.amount;
      if (t.type === 'expense') expenses += t.amount;
    });

    const net = income - expenses;
    const savingsRate = income > 0 ? Math.max(0, Math.round((net / income) * 100)) : 0;
    const dailyAvg = expenses / 30;

    return {
      income,
      expenses,
      net,
      savingsRate,
      dailyAvg,
    };
  }, [monthTransactions]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { amount: number; color: string; count: number }> = {};

    monthTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const catInfo = categories.find((c) => c.name === t.category);
        const color = catInfo?.color || '#94a3b8';

        if (!map[t.category]) {
          map[t.category] = { amount: 0, color, count: 0 };
        }
        map[t.category].amount += t.amount;
        map[t.category].count += 1;
      });

    return Object.entries(map)
      .map(([name, data]) => ({
        name,
        amount: data.amount,
        percentage: stats.expenses > 0 ? (data.amount / stats.expenses) * 100 : 0,
        color: data.color,
        count: data.count,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [monthTransactions, categories, stats.expenses]);

  // Daily spending aggregation (days 1-31)
  const dailySpending = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      amount: 0,
    }));

    monthTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const dayNum = parseInt(t.date.split('-')[2], 10);
        if (dayNum >= 1 && dayNum <= daysInMonth) {
          days[dayNum - 1].amount += t.amount;
        }
      });

    const maxDayAmount = Math.max(...days.map((d) => d.amount), 50);

    return { days, maxDayAmount };
  }, [monthTransactions, selectedYear, selectedMonth]);

  // Top 5 largest expenses
  const topExpenses = useMemo(() => {
    return [...monthTransactions]
      .filter((t) => t.type === 'expense')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [monthTransactions]);

  const handleExportCSV = () => {
    ExportService.exportToCSV(
      monthTransactions,
      currencySymbol,
      `JERA_${monthNames[selectedMonth]}_${selectedYear}.csv`
    );
  };

  const handleExportPDF = () => {
    ExportService.exportToPDF(
      monthTransactions,
      {
        totalIncome: stats.income,
        totalExpenses: stats.expenses,
        netSavings: stats.net,
        currency: currencySymbol,
        periodName: `${monthNames[selectedMonth]} ${selectedYear}`,
      },
      `JERA_${monthNames[selectedMonth]}_${selectedYear}.pdf`
    );
  };

  // SVG Donut calculation
  let cumulativePercent = 0;
  const donutSlices = categoryBreakdown.map((slice) => {
    const startAngle = (cumulativePercent / 100) * 360;
    cumulativePercent += slice.percentage;
    const endAngle = (cumulativePercent / 100) * 360;

    const startRad = ((startAngle - 90) * Math.PI) / 180.0;
    const endRad = ((endAngle - 90) * Math.PI) / 180.0;

    const x1 = 100 + 75 * Math.cos(startRad);
    const y1 = 100 + 75 * Math.sin(startRad);
    const x2 = 100 + 75 * Math.cos(endRad);
    const y2 = 100 + 75 * Math.sin(endRad);

    const largeArc = slice.percentage > 50 ? 1 : 0;
    const pathData = `M 100 100 L ${x1} ${y1} A 75 75 0 ${largeArc} 1 ${x2} ${y2} Z`;

    return {
      ...slice,
      pathData,
    };
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Month Picker & Export Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Mes anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center min-w-[160px]">
            <h2 className="text-lg font-bold text-white flex items-center justify-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              {monthNames[selectedMonth]} {selectedYear}
            </h2>
            <span className="text-[11px] text-slate-400">
              {monthTransactions.length} transacciones registradas
            </span>
          </div>

          <button
            onClick={handleNextMonth}
            className="p-2 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Mes siguiente"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 hover:border-slate-600 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            title="Descargar datos en formato CSV para Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/20 active:scale-95"
            title="Descargar reporte formal en formato PDF"
          >
            <FileText className="w-4 h-4" />
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      {/* Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800/80">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
            Gastos Totales
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-rose-400">
              {currencySymbol} {stats.expenses.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4 text-rose-400" />
            </div>
          </div>
          <span className="text-[11px] text-slate-500 mt-2 block">
            Promedio diario: {currencySymbol} {stats.dailyAvg.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800/80">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
            Ingresos Totales
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-400">
              +{currencySymbol} {stats.income.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <span className="text-[11px] text-slate-500 mt-2 block">Flujo de entrada registrado</span>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800/80">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
            Ahorro Neto
          </span>
          <div className="flex items-baseline justify-between">
            <span
              className={`text-2xl font-black ${
                stats.net >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {stats.net >= 0 ? '+' : ''}
              {currencySymbol} {stats.net.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
            </span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                stats.net >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10'
              }`}
            >
              {stats.net >= 0 ? (
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-rose-400" />
              )}
            </div>
          </div>
          <span className="text-[11px] text-slate-500 mt-2 block">
            {stats.net >= 0 ? 'Superávit mensual' : 'Déficit del período'}
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800/80">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
            Tasa de Ahorro
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-cyan-400">{stats.savingsRate}%</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <BarChart2 className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <span className="text-[11px] text-slate-500 mt-2 block">
            Meta recomendada: 20% o superior
          </span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Donut Visualization */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-emerald-400" />
              Distribución por Categorías
            </h3>
            <span className="text-xs text-slate-400">{categoryBreakdown.length} categorías</span>
          </div>

          {categoryBreakdown.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-slate-500 text-xs">
              <Layers className="w-8 h-8 mb-2 stroke-1" />
              <span>Sin gastos registrados en este período</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              {/* Donut SVG */}
              <div className="relative flex items-center justify-center">
                <svg viewBox="0 0 200 200" className="w-44 h-44 transform -rotate-90">
                  {donutSlices.map((slice, i) => (
                    <path
                      key={i}
                      d={slice.pathData}
                      fill={slice.color}
                      className="hover:opacity-80 transition-opacity cursor-pointer"
                    >
                      <title>{`${slice.name}: ${currencySymbol}${slice.amount.toLocaleString('es-CL', { maximumFractionDigits: 0 })} (${slice.percentage.toFixed(1)}%)`}</title>
                    </path>
                  ))}
                  {/* Inner cut for Donut */}
                  <circle cx="100" cy="100" r="48" fill="#090d16" />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total</span>
                  <span className="text-sm font-black text-white">
                    {currencySymbol} {stats.expenses.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>

              {/* Legend List */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {categoryBreakdown.map((cat, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-slate-300 truncate">{cat.name}</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-white font-medium">
                        {currencySymbol} {cat.amount.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {cat.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Daily Spending Evolution Bars */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-cyan-400" />
                Evolución Diaria de Gastos
              </h3>
              <span className="text-xs text-slate-400">Día 1 al fin de mes</span>
            </div>

            {/* Bar chart */}
            <div className="h-44 flex items-end gap-1 pt-6 px-1 border-b border-slate-800">
              {dailySpending.days.map((d) => {
                const heightPct = (d.amount / dailySpending.maxDayAmount) * 100;
                const isPeak = d.amount > dailySpending.maxDayAmount * 0.7;

                return (
                  <div
                    key={d.day}
                    className="flex-1 flex flex-col items-center group relative h-full justify-end"
                  >
                    {/* Tooltip */}
                    <div className="absolute -top-8 hidden group-hover:flex px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-[10px] text-white whitespace-nowrap z-20 pointer-events-none shadow-lg">
                      Día {d.day}: {currencySymbol}
                      {d.amount.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                    </div>

                    <div
                      style={{ height: `${Math.max(d.amount > 0 ? 6 : 2, heightPct)}%` }}
                      className={`w-full rounded-t-sm transition-all duration-300 ${
                        d.amount === 0
                          ? 'bg-slate-800/40'
                          : isPeak
                          ? 'bg-rose-500 hover:bg-rose-400'
                          : 'bg-emerald-500/80 hover:bg-emerald-400'
                      }`}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 mt-1 px-1">
              <span>Día 1</span>
              <span>Día 15</span>
              <span>Día {dailySpending.days.length}</span>
            </div>
          </div>

          <p className="text-xs text-slate-400 mt-4">
            💡 Las barras en rojo indican días con gastos extraordinarios por encima del promedio.
          </p>
        </div>
      </div>

      {/* Top 5 Expenses of the Month */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-rose-400" />
          Gastos Mayores del Mes (Top 5)
        </h3>

        {topExpenses.length === 0 ? (
          <p className="text-xs text-slate-500">No hay gastos para mostrar en este mes.</p>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {topExpenses.map((tx, idx) => (
              <div key={tx.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-slate-800 text-xs font-bold text-slate-300 flex items-center justify-center">
                    #{idx + 1}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">{tx.merchant}</h4>
                    <span className="text-xs text-slate-400">
                      {tx.category} • {tx.date}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-rose-400">
                    -{currencySymbol} {tx.amount.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-[10px] text-slate-500 block">{tx.bankSource || 'Cuenta'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
