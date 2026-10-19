export type TransactionType = 'expense' | 'income' | 'transfer';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  subcategory?: string;
  merchant: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  accountId: string;
  toAccountId?: string;
  notes?: string;
  tags?: string[];
  receiptUrl?: string;
  items?: Array<{ name: string; price: number; qty?: number }>;
  isOfflinePending?: boolean;
  isAiCategorized?: boolean;
  bankSource?: string;
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  monthlyBudget?: number;
  type: 'expense' | 'income';
}

export interface Budget {
  categoryId: string;
  categoryName: string;
  limit: number;
  period: 'monthly' | 'weekly';
  alertThreshold: number; // e.g. 0.8 for 80%
}

export interface BankAccount {
  id: string;
  name: string;
  bankName: string;
  type: 'checking' | 'savings' | 'credit' | 'cash' | 'investment';
  balance: number;
  currency: string;
  accountNumberMask: string;
  color: string;
  icon: string;
  lastSyncedAt?: string;
  isAutoSyncEnabled: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'warning' | 'danger' | 'info' | 'success';
  timestamp: number;
  read: boolean;
  categoryId?: string;
  amount?: number;
}

export type AccentColor = 'emerald' | 'cyan' | 'violet' | 'amber' | 'rose';
export type DarkTheme = 'pure-black' | 'deep-slate' | 'midnight-navy';

export interface UserSettings {
  currency: string;
  currencySymbol: string;
  accentColor: AccentColor;
  darkTheme: DarkTheme;
  biometricsEnabled: boolean;
  pinCode: string; // 4 digits
  autoLockMinutes: number; // 0 = immediate, 1, 5, 15
  pushNotificationsEnabled: boolean;
  hideBalances: boolean;
}

export interface AIInsight {
  type: 'warning' | 'tip' | 'alert' | 'opportunity';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'danger' | 'success';
  category?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}
