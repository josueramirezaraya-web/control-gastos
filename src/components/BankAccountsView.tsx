import React, { useState } from 'react';
import {
  Building2,
  RefreshCw,
  Plus,
  CreditCard,
  Wallet,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { BankAccount, Transaction } from '../types';
import { NotificationService } from '../services/notificationService';

interface BankAccountsViewProps {
  accounts: BankAccount[];
  onUpdateAccounts: (accounts: BankAccount[]) => void;
  onAddTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  currencySymbol: string;
}

const POPULAR_BANKS = [
  { name: 'BBVA', color: '#004481', type: 'checking', icon: 'Building2' },
  { name: 'Banco Santander', color: '#ec0000', type: 'checking', icon: 'Building2' },
  { name: 'Chase Bank', color: '#1170cf', type: 'checking', icon: 'Building2' },
  { name: 'Revolut Digital', color: '#19b2f6', type: 'savings', icon: 'ShieldCheck' },
  { name: 'Nubank', color: '#820ad1', type: 'credit', icon: 'CreditCard' },
  { name: 'Bank of America', color: '#dc1431', type: 'checking', icon: 'Building2' },
  { name: 'American Express', color: '#006fcf', type: 'credit', icon: 'CreditCard' },
];

export const BankAccountsView: React.FC<BankAccountsViewProps> = ({
  accounts,
  onUpdateAccounts,
  onAddTransaction,
  currencySymbol,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [newBankName, setNewBankName] = useState('Banco Santander');
  const [newAccountName, setNewAccountName] = useState('Cuenta Corriente');
  const [newInitialBalance, setNewInitialBalance] = useState('1500');

  const totalLiquidity = accounts.reduce((acc, a) => acc + (a.type !== 'credit' ? a.balance : 0), 0);
  const totalCreditDebt = accounts.reduce((acc, a) => acc + (a.type === 'credit' ? Math.abs(a.balance) : 0), 0);

  // La sincronización real llega desde el lector de correos del banco (Workspace -> Correos del banco)
  const handleLiveBankSync = () => {
    setSyncStatusMsg('ℹ️ Los movimientos del banco se importan desde Google Workspace → "Correos del banco": ahí lees tu hoja de movimientos.');
    setTimeout(() => setSyncStatusMsg(null), 8000);
  };

  const handleConnectBank = (e: React.FormEvent) => {
    e.preventDefault();
    const bankConfig = POPULAR_BANKS.find((b) => b.name === newBankName) || POPULAR_BANKS[0];

    const newAcc: BankAccount = {
      id: 'acc_' + Math.random().toString(36).substring(2, 9),
      name: newAccountName,
      bankName: bankConfig.name,
      type: bankConfig.type as any,
      balance: parseFloat(newInitialBalance) || 0,
      currency: 'USD',
      accountNumberMask: `•••• ${Math.floor(1000 + Math.random() * 9000)}`,
      color: bankConfig.color,
      icon: bankConfig.icon,
      lastSyncedAt: new Date().toISOString(),
      isAutoSyncEnabled: true,
    };

    onUpdateAccounts([...accounts, newAcc]);
    setShowConnectModal(false);
    setSyncStatusMsg(`✅ Cuenta de ${newAcc.bankName} conectada con éxito.`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with liquidity overview and Real-Time Sync button */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 block mb-1">
              Hub de Cuentas & Sincronización Bancaria
            </span>
            <div className="flex items-baseline gap-4">
              <div>
                <span className="text-2xl font-black text-white">
                  {currencySymbol} {totalLiquidity.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                </span>
                <span className="text-xs text-slate-400 block">Liquidez total en bancos</span>
              </div>
              {totalCreditDebt > 0 && (
                <div className="border-l border-slate-800 pl-4">
                  <span className="text-xl font-bold text-rose-400">
                    -{currencySymbol} {totalCreditDebt.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-xs text-slate-400 block">Deuda crédito corriente</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConnectModal(true)}
              className="px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 hover:border-slate-600 transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Conectar Banco</span>
            </button>

            <button
              onClick={handleLiveBankSync}
              disabled={isSyncing}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sincronizando bancos...' : 'Cómo sincronizar'}</span>
            </button>
          </div>
        </div>

        {syncStatusMsg && (
          <div className="mt-4 p-3 rounded-2xl bg-slate-800/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{syncStatusMsg}</span>
          </div>
        )}
      </div>

      {/* Connected Accounts Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((acc) => {
          const isCredit = acc.type === 'credit';
          return (
            <div
              key={acc.id}
              className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-md"
                      style={{ backgroundColor: acc.color || '#334155' }}
                    >
                      {acc.bankName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{acc.bankName}</h3>
                      <span className="text-[11px] text-slate-400">{acc.name}</span>
                    </div>
                  </div>

                  <span className="text-xs font-mono px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400">
                    {acc.accountNumberMask}
                  </span>
                </div>

                <div className="my-3">
                  <span className="text-xs text-slate-400 block mb-0.5">
                    {isCredit ? 'Saldo dispuesto' : 'Saldo disponible'}
                  </span>
                  <span
                    className={`text-2xl font-black ${
                      isCredit
                        ? acc.balance < 0
                          ? 'text-rose-400'
                          : 'text-slate-200'
                        : acc.balance >= 0
                        ? 'text-white'
                        : 'text-rose-400'
                    }`}
                  >
                    {currencySymbol} {Math.abs(acc.balance).toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Sincronización activa</span>
                </div>
                <span>
                  {acc.lastSyncedAt
                    ? `Hoy ${new Date(acc.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Sin sincronizar'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Connect Bank Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-950 border border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                Conectar Cuenta Bancaria
              </h3>
              <button
                onClick={() => setShowConnectModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConnectBank} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Selecciona tu entidad financiera:
                </label>
                <select
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs"
                >
                  {POPULAR_BANKS.map((b) => (
                    <option key={b.name} value={b.name}>
                      {b.name} ({b.type === 'checking' ? 'Cuenta Corriente' : b.type === 'credit' ? 'Tarjeta Crédito' : 'Ahorros'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Nombre descriptivo:
                </label>
                <input
                  type="text"
                  required
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Saldo inicial ({currencySymbol}):
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newInitialBalance}
                  onChange={(e) => setNewInitialBalance(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  Vincular y Sincronizar Cuenta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
