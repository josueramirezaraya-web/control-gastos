import { BankAccount, Category, Budget, Transaction, UserSettings, AppNotification } from '../types';

const STORAGE_KEYS = {
  TRANSACTIONS: 'savemoney_transactions_v2',
  ACCOUNTS: 'savemoney_accounts_v2',
  CATEGORIES: 'savemoney_categories_v2',
  BUDGETS: 'savemoney_budgets_v2',
  SETTINGS: 'savemoney_settings_v2',
  NOTIFICATIONS: 'savemoney_notifications_v2',
  OFFLINE_QUEUE: 'savemoney_offline_queue_v2',
  LAST_ACTIVE: 'savemoney_last_active_v2',
};

export const DEFAULT_SETTINGS: UserSettings = {
  currency: 'CLP',
  currencySymbol: '$',
  accentColor: 'emerald',
  darkTheme: 'pure-black',
  biometricsEnabled: false,
  pinCode: '1234',
  autoLockMinutes: 5,
  pushNotificationsEnabled: true,
  hideBalances: false,
};

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-food', name: 'Alimentación', icon: 'Utensils', color: '#10b981', monthlyBudget: 400000, type: 'expense' },
  { id: 'cat-trans', name: 'Transporte', icon: 'Car', color: '#06b6d4', monthlyBudget: 120000, type: 'expense' },
  { id: 'cat-home', name: 'Vivienda', icon: 'Home', color: '#8b5cf6', monthlyBudget: 500000, type: 'expense' },
  { id: 'cat-serv', name: 'Servicios', icon: 'Zap', color: '#f59e0b', monthlyBudget: 150000, type: 'expense' },
  { id: 'cat-ent', name: 'Entretenimiento', icon: 'Film', color: '#ec4899', monthlyBudget: 80000, type: 'expense' },
  { id: 'cat-health', name: 'Salud y Bienestar', icon: 'HeartPulse', color: '#ef4444', monthlyBudget: 60000, type: 'expense' },
  { id: 'cat-shop', name: 'Compras', icon: 'ShoppingBag', color: '#3b82f6', monthlyBudget: 100000, type: 'expense' },
  { id: 'cat-edu', name: 'Educación', icon: 'GraduationCap', color: '#14b8a6', monthlyBudget: 50000, type: 'expense' },
  { id: 'cat-fin', name: 'Finanzas e Inv.', icon: 'TrendingUp', color: '#84cc16', monthlyBudget: 100000, type: 'expense' },
  { id: 'cat-other', name: 'Otros', icon: 'MoreHorizontal', color: '#64748b', monthlyBudget: 50000, type: 'expense' },
  // Incomes
  { id: 'cat-sal', name: 'Nómina / Salario', icon: 'Banknote', color: '#10b981', type: 'income' },
  { id: 'cat-free', name: 'Freelance / Ventas', icon: 'Briefcase', color: '#06b6d4', type: 'income' },
  { id: 'cat-inv-inc', name: 'Dividendos / Rend.', icon: 'LineChart', color: '#8b5cf6', type: 'income' },
  { id: 'cat-oth-inc', name: 'Otros ingresos', icon: 'Banknote', color: '#22c55e', type: 'income' },
];

export const DEFAULT_ACCOUNTS: BankAccount[] = [
  {
    id: 'acc-santander',
    name: 'Cuenta Corriente',
    bankName: 'Santander',
    type: 'checking',
    balance: 0,
    currency: 'CLP',
    accountNumberMask: '•••• ----',
    color: '#ec0000',
    icon: 'Building2',
    isAutoSyncEnabled: false,
  },
  {
    id: 'acc-cash',
    name: 'Billetera Efectivo',
    bankName: 'Efectivo en mano',
    type: 'cash',
    balance: 0,
    currency: 'CLP',
    accountNumberMask: 'Efectivo',
    color: '#10b981',
    icon: 'Wallet',
    isAutoSyncEnabled: false,
  },
];

export const DEFAULT_BUDGETS: Budget[] = [
  { categoryId: 'cat-food', categoryName: 'Alimentación', limit: 400000, period: 'monthly', alertThreshold: 0.8 },
  { categoryId: 'cat-trans', categoryName: 'Transporte', limit: 120000, period: 'monthly', alertThreshold: 0.8 },
  { categoryId: 'cat-home', categoryName: 'Vivienda', limit: 500000, period: 'monthly', alertThreshold: 0.9 },
  { categoryId: 'cat-serv', categoryName: 'Servicios', limit: 150000, period: 'monthly', alertThreshold: 0.8 },
  { categoryId: 'cat-ent', categoryName: 'Entretenimiento', limit: 80000, period: 'monthly', alertThreshold: 0.8 },
  { categoryId: 'cat-shop', categoryName: 'Compras', limit: 100000, period: 'monthly', alertThreshold: 0.8 },
];

function getSampleTransactions(): Transaction[] {
  // Sin datos de ejemplo: tus movimientos reales llegan desde tu hoja de correos del banco.
  return [];
}

export const StorageService = {
  getTransactions(): Transaction[] {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!raw) {
      const initial = getSampleTransactions();
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(initial));
      return initial;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return getSampleTransactions();
    }
  },

  saveTransactions(txs: Transaction[]) {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
  },

  addTransaction(tx: Omit<Transaction, 'id' | 'createdAt'>): Transaction {
    const all = this.getTransactions();
    const newTx: Transaction = {
      ...tx,
      id: 'tx_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
      createdAt: Date.now(),
    };
    all.unshift(newTx);
    this.saveTransactions(all);

    // If offline, add to offline queue
    if (!navigator.onLine) {
      newTx.isOfflinePending = true;
      this.enqueueOffline(newTx);
    }

    // Update account balance
    this.updateAccountBalanceForTx(newTx);

    return newTx;
  },

  updateTransaction(updated: Transaction) {
    const all = this.getTransactions();
    const idx = all.findIndex((t) => t.id === updated.id);
    if (idx !== -1) {
      all[idx] = updated;
      this.saveTransactions(all);
    }
  },

  deleteTransaction(id: string) {
    const all = this.getTransactions();
    const filtered = all.filter((t) => t.id !== id);
    this.saveTransactions(filtered);
  },

  getAccounts(): BankAccount[] {
    const raw = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(DEFAULT_ACCOUNTS));
      return DEFAULT_ACCOUNTS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_ACCOUNTS;
    }
  },

  saveAccounts(accounts: BankAccount[]) {
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
  },

  updateAccountBalanceForTx(tx: Transaction) {
    const accounts = this.getAccounts();
    const account = accounts.find((a) => a.id === tx.accountId);
    if (account) {
      if (tx.type === 'expense') {
        account.balance -= tx.amount;
      } else if (tx.type === 'income') {
        account.balance += tx.amount;
      } else if (tx.type === 'transfer' && tx.toAccountId) {
        account.balance -= tx.amount;
        const target = accounts.find((a) => a.id === tx.toAccountId);
        if (target) {
          target.balance += tx.amount;
        }
      }
      this.saveAccounts(accounts);
    }
  },

  getCategories(): Category[] {
    const raw = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
      return DEFAULT_CATEGORIES;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_CATEGORIES;
    }
  },

  saveCategories(cats: Category[]) {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(cats));
  },

  getBudgets(): Budget[] {
    const raw = localStorage.getItem(STORAGE_KEYS.BUDGETS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(DEFAULT_BUDGETS));
      return DEFAULT_BUDGETS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_BUDGETS;
    }
  },

  saveBudgets(budgets: Budget[]) {
    localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
  },

  getSettings(): UserSettings {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings: UserSettings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },

  getNotifications(): AppNotification[] {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (!raw) {
      const initialNotes: AppNotification[] = [
        {
          id: 'note-welcome',
          title: 'Bienvenido',
          message: 'Tu centro financiero inteligente está activo. Modo offline y categorización automática habilitados.',
          type: 'info',
          timestamp: Date.now() - 3600000,
          read: true,
        },
      ];
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(initialNotes));
      return initialNotes;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  addNotification(note: Omit<AppNotification, 'id' | 'timestamp' | 'read'>): AppNotification {
    const all = this.getNotifications();
    const newNote: AppNotification = {
      ...note,
      id: 'notif_' + Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      read: false,
    };
    all.unshift(newNote);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(all));
    return newNote;
  },

  markNotificationsRead() {
    const all = this.getNotifications().map((n) => ({ ...n, read: true }));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(all));
  },

  // Offline queue
  getOfflineQueue(): Transaction[] {
    const raw = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
    try {
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  enqueueOffline(tx: Transaction) {
    const queue = this.getOfflineQueue();
    queue.push(tx);
    localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
  },

  clearOfflineQueue() {
    localStorage.removeItem(STORAGE_KEYS.OFFLINE_QUEUE);
  },

  recordActiveTime() {
    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE, Date.now().toString());
  },

  getLastActiveTime(): number {
    const raw = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVE);
    return raw ? parseInt(raw, 10) : Date.now();
  },
};
