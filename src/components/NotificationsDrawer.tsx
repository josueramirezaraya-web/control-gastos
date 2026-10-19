import React from 'react';
import { X, Bell, AlertTriangle, AlertCircle, CheckCircle2, Info, Check } from 'lucide-react';
import { AppNotification } from '../types';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAllRead: () => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllRead,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm h-full bg-slate-950 border-l border-slate-800 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <Bell className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Centro de Notificaciones</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-3 border-b border-slate-900 flex justify-between items-center text-xs">
          <span className="text-slate-400">{notifications.length} notificaciones</span>
          <button
            onClick={onMarkAllRead}
            className="text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            Marcar todas como leídas
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {notifications.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-slate-500 text-xs">
              <Bell className="w-8 h-8 mb-2 stroke-1" />
              <span>Sin notificaciones pendientes</span>
            </div>
          ) : (
            notifications.map((note) => {
              const isDanger = note.type === 'danger';
              const isWarning = note.type === 'warning';
              const isSuccess = note.type === 'success';

              return (
                <div
                  key={note.id}
                  className={`p-3 rounded-2xl border text-xs transition-all ${
                    !note.read
                      ? 'bg-slate-900/90 border-slate-700'
                      : 'bg-slate-950/60 border-slate-900 opacity-75'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5">
                      {isDanger && <AlertCircle className="w-4 h-4 text-rose-400" />}
                      {isWarning && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                      {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                      {!isDanger && !isWarning && !isSuccess && <Info className="w-4 h-4 text-blue-400" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <h4 className="font-semibold text-white text-xs">{note.title}</h4>
                        {!note.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-slate-400 text-[11px] leading-relaxed">{note.message}</p>
                      <span className="text-[10px] text-slate-500 mt-1.5 block">
                        {new Date(note.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        • {new Date(note.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
