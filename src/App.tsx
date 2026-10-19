/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import {
  BankAccount,
  Budget,
  Category,
  Transaction,
  UserSettings,
  AppNotification,
} from './types';
import {
  StorageService,
  DEFAULT_SETTINGS,
} from './services/storage';
import { initAuth } from './services/firebaseAuth';
import { NotificationService } from './services/notificationService';

// Components
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { VisualReports } from './components/VisualReports';
import { BudgetsManager } from './components/BudgetsManager';
import { BankAccountsView } from './components/BankAccountsView';
import { WorkspaceHub } from './components/WorkspaceHub';
import { TransactionModal } from './components/TransactionModal';
import { ReceiptScannerModal } from './components/ReceiptScannerModal';
import { AIChatModal } from './components/AIChatModal';
import { SettingsModal } from './components/SettingsModal';
import { NotificationsDrawer } from './components/NotificationsDrawer';
import { SecurityLockScreen } from './components/SecurityLockScreen';

export default function App() {
  // App Core State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Navigation & Modals
  const [currentTab, setCurrentTab] = useState<
    'dashboard' | 'reports' | 'budgets' | 'banks' | 'workspace'
  >('dashboard');
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Security & Lock Screen
  const [isLocked, setIsLocked] = useState(false);

  // Network Offline Status
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);

  // Google Workspace User
  const [googleUser, setGoogleUser] = useState<User | null>(null);

  // Activity timer ref for auto-lock
  const lastActivityRef = useRef<number>(Date.now());

  // 1. Initial Load from LocalStorage
  useEffect(() => {
    const loadedTxs = StorageService.getTransactions();
    const loadedAccounts = StorageService.getAccounts();
    const loadedCats = StorageService.getCategories();
    const loadedBudgets = StorageService.getBudgets();
    const loadedSettings = StorageService.getSettings();
    const loadedNotes = StorageService.getNotifications();
    const queue = StorageService.getOfflineQueue();

    setTransactions(loadedTxs);
    setAccounts(loadedAccounts);
    setCategories(loadedCats);
    setBudgets(loadedBudgets);
    setSettings(loadedSettings);
    setNotifications(loadedNotes);
    setOfflineQueueCount(queue.length);

    // Initial Biometric Lock if enabled
    if (loadedSettings.biometricsEnabled) {
      setIsLocked(true);
    }
  }, []);

  // 2. Network Online / Offline Listeners & Queue Sync
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      const queue = StorageService.getOfflineQueue();
      if (queue.length > 0) {
        // Sync items
        const all = StorageService.getTransactions();
        const updated = all.map((t) => ({ ...t, isOfflinePending: false }));
        StorageService.saveTransactions(updated);
        setTransactions(updated);
        StorageService.clearOfflineQueue();
        setOfflineQueueCount(0);

        NotificationService.sendCustomAlert(
          '🌐 Conexión Restablecida',
          `Se han sincronizado ${queue.length} transacciones registradas en modo offline.`,
          'success'
        );
        setNotifications(StorageService.getNotifications());
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      NotificationService.sendCustomAlert(
        '⚡ Modo Offline Activado',
        'Puedes continuar registrando tus gastos normalmente; se sincronizarán al recuperar la señal.',
        'info'
      );
      setNotifications(StorageService.getNotifications());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 3. Auto-Lock Inactivity Tracker
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('touchstart', updateActivity);

    const interval = setInterval(() => {
      if (settings.biometricsEnabled && !isLocked && settings.autoLockMinutes > 0) {
        const elapsedMinutes = (Date.now() - lastActivityRef.current) / 60000;
        if (elapsedMinutes >= settings.autoLockMinutes) {
          setIsLocked(true);
        }
      }
    }, 15000);

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
      clearInterval(interval);
    };
  }, [settings.biometricsEnabled, settings.autoLockMinutes, isLocked]);

  // 4. Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => {
        setGoogleUser(user);
      },
      () => {
        setGoogleUser(null);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Handle adding new transaction & check budget alerts
  const handleAddTransaction = (newTxData: Omit<Transaction, 'id' | 'createdAt'>) => {
    const saved = StorageService.addTransaction(newTxData);

    // Refresh transactions and accounts
    const allTxs = StorageService.getTransactions();
    const allAccs = StorageService.getAccounts();
    setTransactions(allTxs);
    setAccounts(allAccs);

    if (!isOnline) {
      setOfflineQueueCount(StorageService.getOfflineQueue().length);
    }

    // Check budget limit alert if it's an expense
    if (newTxData.type === 'expense') {
      const budget = budgets.find((b) => b.categoryName === newTxData.category);
      if (budget) {
        // Calculate new spent amount in category for current month
        const now = new Date();
        const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
          2,
          '0'
        )}`;
        const totalCategorySpent = allTxs
          .filter((t) => t.type === 'expense' && t.category === budget.categoryName && t.date.startsWith(currentMonthPrefix))
          .reduce((sum, t) => sum + t.amount, 0);

        const ratio = totalCategorySpent / budget.limit;
        if (ratio >= (budget.alertThreshold || 0.8)) {
          NotificationService.sendBudgetAlert({
            categoryName: budget.categoryName,
            currentSpent: totalCategorySpent,
            budgetLimit: budget.limit,
            currency: settings.currencySymbol,
            thresholdRatio: ratio,
          });
          setNotifications(StorageService.getNotifications());
        }
      }
    }
  };

  const handleChangeCategory = (id: string, category: string) => {
    const tx = transactions.find((t) => t.id === id);
    if (!tx) return;
    StorageService.updateTransaction({ ...tx, category });
    setTransactions(StorageService.getTransactions());
  };

  const handleDeleteTransaction = (id: string) => {
    StorageService.deleteTransaction(id);
    setTransactions(StorageService.getTransactions());
    setAccounts(StorageService.getAccounts());
  };

  const handleUpdateBudgets = (newBudgets: Budget[]) => {
    setBudgets(newBudgets);
    StorageService.saveBudgets(newBudgets);
  };

  const handleUpdateAccounts = (newAccounts: BankAccount[]) => {
    setAccounts(newAccounts);
    StorageService.saveAccounts(newAccounts);
  };

  const handleSaveSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    StorageService.saveSettings(newSettings);
  };

  const handleResetData = () => {
    localStorage.clear();
    const loadedTxs = StorageService.getTransactions();
    const loadedAccounts = StorageService.getAccounts();
    const loadedCats = StorageService.getCategories();
    const loadedBudgets = StorageService.getBudgets();
    const loadedSettings = StorageService.getSettings();
    setTransactions(loadedTxs);
    setAccounts(loadedAccounts);
    setCategories(loadedCats);
    setBudgets(loadedBudgets);
    setSettings(loadedSettings);
  };

  const unreadNotesCount = notifications.filter((n) => !n.read).length;

  // Background darkness class based on user settings
  const bgThemeClass =
    settings.darkTheme === 'pure-black'
      ? 'bg-black text-slate-100'
      : settings.darkTheme === 'midnight-navy'
      ? 'bg-[#030712] text-slate-100'
      : 'bg-[#090d16] text-slate-100';

  return (
    <div className={`min-h-screen ${bgThemeClass} selection:bg-emerald-500 selection:text-black font-sans`}>
      {/* Biometric & PIN Security Lock Screen */}
      {isLocked && (
        <SecurityLockScreen
          settings={settings}
          onUnlock={() => {
            setIsLocked(false);
            lastActivityRef.current = Date.now();
          }}
        />
      )}

      {/* Main Top Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isOnline={isOnline}
        offlineCount={offlineQueueCount}
        settings={settings}
        onToggleHideBalances={() =>
          handleSaveSettings({ ...settings, hideBalances: !settings.hideBalances })
        }
        onLockApp={() => setIsLocked(true)}
        unreadNotifications={unreadNotesCount}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAIChat={() => setIsAIChatOpen(true)}
        googleUser={googleUser}
        onOpenGoogleWorkspace={() => setCurrentTab('workspace')}
      />

      {/* Main App Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20">
        {currentTab === 'dashboard' && (
          <Dashboard
            transactions={transactions}
            accounts={accounts}
            categories={categories}
            budgets={budgets}
            settings={settings}
            onOpenNewTransaction={() => setIsTransactionModalOpen(true)}
            onOpenReceiptScanner={() => setIsReceiptModalOpen(true)}
            onOpenAIChat={() => setIsAIChatOpen(true)}
            onOpenBanks={() => setCurrentTab('banks')}
            onOpenReports={() => setCurrentTab('reports')}
            onDeleteTransaction={handleDeleteTransaction}
            onChangeCategory={handleChangeCategory}
          />
        )}

        {currentTab === 'reports' && (
          <VisualReports
            transactions={transactions}
            categories={categories}
            currencySymbol={settings.currencySymbol}
          />
        )}

        {currentTab === 'budgets' && (
          <BudgetsManager
            budgets={budgets}
            categories={categories}
            transactions={transactions}
            currencySymbol={settings.currencySymbol}
            onUpdateBudgets={handleUpdateBudgets}
          />
        )}

        {currentTab === 'banks' && (
          <BankAccountsView
            accounts={accounts}
            onUpdateAccounts={handleUpdateAccounts}
            onAddTransaction={handleAddTransaction}
            currencySymbol={settings.currencySymbol}
          />
        )}

        {currentTab === 'workspace' && (
          <WorkspaceHub
            user={googleUser}
            onAuthChange={setGoogleUser}
            transactions={transactions}
            onAddTransaction={handleAddTransaction}
            currencySymbol={settings.currencySymbol}
          />
        )}
      </main>

      {/* Modals & Drawers */}
      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        onSave={handleAddTransaction}
        categories={categories}
        accounts={accounts}
        currencySymbol={settings.currencySymbol}
        isOnline={isOnline}
      />

      <ReceiptScannerModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        onSaveTransaction={handleAddTransaction}
        categories={categories}
        accounts={accounts}
        currencySymbol={settings.currencySymbol}
      />

      <AIChatModal
        isOpen={isAIChatOpen}
        onClose={() => setIsAIChatOpen(false)}
        transactions={transactions}
        budgets={budgets}
        currencySymbol={settings.currencySymbol}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onResetData={handleResetData}
      />

      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkAllRead={() => {
          StorageService.markNotificationsRead();
          setNotifications(StorageService.getNotifications());
        }}
      />
    </div>
  );
}
