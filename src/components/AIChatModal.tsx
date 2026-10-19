import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Sparkles,
  Send,
  Bot,
  User,
  ArrowRight,
  TrendingDown,
  RefreshCw,
  Lightbulb,
} from 'lucide-react';
import { GeminiService } from '../services/geminiService';
import { Budget, Category, Transaction } from '../types';

interface AIChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  budgets: Budget[];
  currencySymbol: string;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  '¿En qué categoría he gastado más dinero este mes?',
  '¿Qué gastos puedo recortar para ahorrar un 15% extra?',
  '¿Cómo voy con mis presupuestos fijados?',
  'Dame una estrategia de ahorro según la regla 50/30/20.',
];

export const AIChatModal: React.FC<AIChatModalProps> = ({
  isOpen,
  onClose,
  transactions,
  budgets,
  currencySymbol,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      content:
        '¡Hola! Soy **JERA AI**, tu asesor financiero personal. He analizado tus transacciones y presupuestos. ¿Qué te gustaría consultar o mejorar hoy?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  // Build financial context
  const now = new Date();
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentTxs = transactions.filter((t) => t.date.startsWith(currentMonthPrefix));

  let totalExpenses = 0;
  let totalIncome = 0;
  const categoryTotals: Record<string, number> = {};

  currentTxs.forEach((t) => {
    if (t.type === 'expense') {
      totalExpenses += t.amount;
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    }
    if (t.type === 'income') {
      totalIncome += t.amount;
    }
  });

  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;
  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([cat, amt]) => ({ category: cat, spent: amt }));

  const context = {
    currency: currencySymbol,
    totalIncome,
    totalExpenses,
    netSavings,
    savingsRate,
    budgets,
    topCategories,
    transactionCount: currentTxs.length,
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const userMsg: Message = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    try {
      const payload = newHistory.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const reply = await GeminiService.sendChatMessage(payload, context);

      const aiMsg: Message = {
        id: 'msg_ai_' + Date.now(),
        role: 'model',
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'msg_err_' + Date.now(),
          role: 'model',
          content: 'Disculpa, no pude procesar tu mensaje en este momento. Inténtalo de nuevo.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg h-full bg-slate-950 border-l border-slate-800 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-md shadow-emerald-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                JERA AI Asesor
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono">
                  Gemini 3.8
                </span>
              </h2>
              <span className="text-[11px] text-slate-400">
                Contexto activo: {currencySymbol}
                {totalExpenses.toLocaleString('es-CL', { maximumFractionDigits: 0 })} en gastos este mes
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m) => {
            const isModel = m.role === 'model';
            return (
              <div
                key={m.id}
                className={`flex gap-3 ${isModel ? 'items-start' : 'items-end justify-end'}`}
              >
                {isModel && (
                  <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                    isModel
                      ? 'bg-slate-900 border border-slate-800 text-slate-200'
                      : 'bg-emerald-600 text-white font-medium ml-auto'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.content}</div>
                  <span
                    className={`text-[10px] mt-1.5 block text-right ${
                      isModel ? 'text-slate-500' : 'text-emerald-200'
                    }`}
                  >
                    {m.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 items-center text-xs text-slate-400 animate-pulse">
              <div className="w-7 h-7 rounded-xl bg-slate-900 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <span>JERA AI analizando tus finanzas...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick prompt suggestions chips */}
        <div className="px-4 py-2 border-t border-slate-900 overflow-x-auto flex gap-2 no-scrollbar">
          {QUICK_PROMPTS.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(qp)}
              disabled={isLoading}
              className="text-[11px] whitespace-nowrap px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-emerald-500/40 transition-colors flex-shrink-0 cursor-pointer disabled:opacity-50"
            >
              {qp}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Pregúntale a tu asesor financiero..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all cursor-pointer disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
