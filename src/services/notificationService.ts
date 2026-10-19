import { StorageService } from './storage';
import { AppNotification } from '../types';

export const NotificationService = {
  async requestPushPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    if (Notification.permission === 'granted') {
      return true;
    }
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  },

  isPushEnabled(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  },

  sendBudgetAlert(params: {
    categoryName: string;
    currentSpent: number;
    budgetLimit: number;
    currency: string;
    thresholdRatio: number; // e.g. 1.0 or 0.8
  }): AppNotification {
    const isExceeded = params.thresholdRatio >= 1.0;
    const pct = Math.round((params.currentSpent / params.budgetLimit) * 100);

    const title = isExceeded
      ? `🚨 ¡Presupuesto Excedido en ${params.categoryName}!`
      : `⚠️ Alerta: 80% del Presupuesto en ${params.categoryName}`;

    const message = isExceeded
      ? `Has gastado ${params.currency} ${params.currentSpent.toLocaleString('es-CL', { maximumFractionDigits: 0 })} de tu límite de ${params.currency} ${params.budgetLimit.toLocaleString('es-CL', { maximumFractionDigits: 0 })} (${pct}% consumido).`
      : `Llevas gastado ${params.currency} ${params.currentSpent.toLocaleString('es-CL', { maximumFractionDigits: 0 })} de un tope de ${params.currency} ${params.budgetLimit.toLocaleString('es-CL', { maximumFractionDigits: 0 })} (${pct}%).`;

    // 1. Browser Native Push Notification if permitted
    if (this.isPushEnabled()) {
      try {
        new Notification(title, {
          body: message,
          icon: '/favicon.ico',
          tag: `budget-alert-${params.categoryName}`,
        });
      } catch (e) {
        console.warn('Browser push notification could not be dispatched:', e);
      }
    }

    // 2. In-App Notification Center
    return StorageService.addNotification({
      title,
      message,
      type: isExceeded ? 'danger' : 'warning',
      amount: params.currentSpent,
    });
  },

  sendCustomAlert(title: string, message: string, type: 'info' | 'warning' | 'danger' | 'success') {
    if (this.isPushEnabled()) {
      try {
        new Notification(title, { body: message });
      } catch (e) {
        console.warn('Browser push failed:', e);
      }
    }
    return StorageService.addNotification({ title, message, type });
  },
};
