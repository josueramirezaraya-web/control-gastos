import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Mail,
  Calendar as CalendarIcon,
  ExternalLink,
  Check,
  AlertCircle,
  RefreshCw,
  Plus,
  Shield,
  Layers,
  Sparkles,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { googleSignIn, logoutGoogle } from '../services/firebaseAuth';
import { GoogleWorkspaceService, GmailReceiptItem } from '../services/googleWorkspace';
import { Transaction } from '../types';

interface WorkspaceHubProps {
  user: User | null;
  onAuthChange: (user: User | null) => void;
  transactions: Transaction[];
  onAddTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  currencySymbol: string;
}

export const WorkspaceHub: React.FC<WorkspaceHubProps> = ({
  user,
  onAuthChange,
  transactions,
  onAddTransaction,
  currencySymbol,
}) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showVerificationGuide, setShowVerificationGuide] = useState(false);

  // Sheets state
  const [isExportingSheets, setIsExportingSheets] = useState(false);
  const [sheetsUrl, setSheetsUrl] = useState<string | null>(null);
  const [showSheetsConfirm, setShowSheetsConfirm] = useState(false);

  // Gmail state
  const [isScanningGmail, setIsScanningGmail] = useState(false);
  const [gmailReceipts, setGmailReceipts] = useState<GmailReceiptItem[]>([]);
  const [gmailScanned, setGmailScanned] = useState(false);
  const [pendingImportItem, setPendingImportItem] = useState<GmailReceiptItem | null>(null);
  const [sheetRef, setSheetRef] = useState<string>(() => {
    try {
      return localStorage.getItem('savemoney_sheet_ref') || '';
    } catch {
      return '';
    }
  });

  // Calendar state
  const [reminderTitle, setReminderTitle] = useState('Pago de Tarjeta de Crédito');
  const [reminderDate, setReminderDate] = useState(
    new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0]
  );
  const [reminderAmount, setReminderAmount] = useState('');
  const [isAddingCalendar, setIsAddingCalendar] = useState(false);
  const [calendarEventLink, setCalendarEventLink] = useState<string | null>(null);
  const [showCalendarConfirm, setShowCalendarConfirm] = useState(false);

  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(
    null
  );

  const handleSignIn = async (includeGmail = false) => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const res = await googleSignIn({ includeGmail });
      if (res?.user) {
        onAuthChange(res.user);
        setFeedbackMsg({
          text: `Sesión iniciada con éxito (${res.user.displayName || res.user.email}).`,
          type: 'success',
        });
      }
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('popup-closed-by-user')) {
        setAuthError('La ventana de autenticación fue cerrada antes de completar el inicio de sesión.');
      } else {
        setAuthError(
          'Google bloqueó el acceso o la app está en proceso de prueba. Revisa la guía de verificación abajo para solucionarlo en 1 minuto.'
        );
        setShowVerificationGuide(true);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logoutGoogle();
    onAuthChange(null);
    setSheetsUrl(null);
    setGmailReceipts([]);
    setGmailScanned(false);
  };

  // Google Sheets Export
  const executeExportSheets = async () => {
    setShowSheetsConfirm(false);
    setIsExportingSheets(true);
    setFeedbackMsg(null);
    try {
      const res = await GoogleWorkspaceService.exportTransactionsToSheets(transactions, currencySymbol);
      setSheetsUrl(res.url);
      setFeedbackMsg({
        text: '¡Hoja de cálculo creada exitosamente en tu Google Drive!',
        type: 'success',
      });
    } catch (err: any) {
      setFeedbackMsg({ text: err.message || 'Error al sincronizar con Google Sheets', type: 'error' });
    } finally {
      setIsExportingSheets(false);
    }
  };

  // Leer la hoja "Movimientos" (la llena el lector de correos del banco)
  const handleScanGmail = async () => {
    setIsScanningGmail(true);
    setFeedbackMsg(null);
    try {
      const all = await GoogleWorkspaceService.readMovimientosSheet(sheetRef);
      try {
        localStorage.setItem('savemoney_sheet_ref', sheetRef);
      } catch {}
      const done = new Set(transactions.flatMap((t) => t.tags || []));
      const items = all.filter((i) => !done.has('sheet:' + i.id));
      setGmailReceipts(items);
      setGmailScanned(true);
      if (items.length === 0) {
        setFeedbackMsg({ text: 'No hay movimientos nuevos en tu hoja.', type: 'success' });
      }
    } catch (err: any) {
      setFeedbackMsg({ text: err.message || 'Error al leer la hoja de movimientos', type: 'error' });
    } finally {
      setIsScanningGmail(false);
    }
  };

  const buildImportedTx = (item: GmailReceiptItem) => ({
    type: (item.type || 'expense') as 'expense' | 'income',
    amount: item.estimatedAmount || 0,
    merchant: item.merchantGuess,
    category: item.categoryGuess,
    date: item.date,
    time: '12:00',
    accountId: 'acc-santander',
    bankSource: item.sender,
    notes: 'Importado desde el correo del banco',
    tags: ['correo-banco', 'auto-import', 'sheet:' + item.id],
  });

  const executeImportGmailReceipt = (item: GmailReceiptItem) => {
    onAddTransaction(buildImportedTx(item));
    setPendingImportItem(null);
    setGmailReceipts((prev) => prev.filter((r) => r.id !== item.id));
    setFeedbackMsg({
      text: `${item.type === 'income' ? 'Abono' : 'Gasto'} de ${currencySymbol}${(item.estimatedAmount || 0).toLocaleString('es-CL')} (${item.merchantGuess}) importado.`,
      type: 'success',
    });
  };

  const importAllReceipts = () => {
    const items = gmailReceipts;
    items.forEach((item) => onAddTransaction(buildImportedTx(item)));
    setGmailReceipts([]);
    setFeedbackMsg({ text: `${items.length} movimientos importados.`, type: 'success' });
  };

  // Calendar Event
  const executeAddCalendarReminder = async () => {
    setShowCalendarConfirm(false);
    setIsAddingCalendar(true);
    setFeedbackMsg(null);
    try {
      const res = await GoogleWorkspaceService.createCalendarPaymentReminder({
        title: reminderTitle,
        description: `Recordatorio financiero programado desde JERA. Monto estimado: ${currencySymbol}${reminderAmount}`,
        dueDate: reminderDate,
        amount: parseFloat(reminderAmount) || undefined,
        currency: currencySymbol,
      });
      setCalendarEventLink(res.htmlLink);
      setFeedbackMsg({
        text: 'Recordatorio programado con éxito en tu Google Calendar con alertas.',
        type: 'success',
      });
    } catch (err: any) {
      setFeedbackMsg({
        text: err.message || 'Error al programar en Google Calendar',
        type: 'error',
      });
    } finally {
      setIsAddingCalendar(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner / Auth State */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 block mb-1">
              Google Workspace Integrations
            </span>
            <h2 className="text-xl font-bold text-white">Google Sheets y Google Calendar</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Conecta tu cuenta para sincronizar con hojas de cálculo, detectar facturas por correo y
              programar alertas de pago.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {!user ? (
              <>
                {/* 1. Standard Sign-in button (Sheets & Calendar) - avoids Restricted Scope hard-block */}
                <button
                  onClick={() => handleSignIn(false)}
                  disabled={isLoggingIn}
                  className="px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-white/10 active:scale-95 cursor-pointer disabled:opacity-50"
                  title="Acceso directo a Sheets y Calendar sin bloqueo de verificación restringida"
                >
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                  <span>{isLoggingIn ? 'Conectando...' : 'Acceso Google (Sheets & Calendar)'}</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-xs font-bold text-white block">
                    {user.displayName || user.email}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-medium">● Conectado a Google</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
                >
                  Cerrar Sesión
                </button>
              </div>
            )}
          </div>
        </div>

        {authError && (
          <div className="mt-3 p-3 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{authError}</span>
            </div>
            <button
              onClick={() => setShowVerificationGuide(!showVerificationGuide)}
              className="text-xs font-bold underline hover:text-white flex items-center gap-1 cursor-pointer flex-shrink-0"
            >
              <span>Ver solución</span>
              {showVerificationGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        )}

        {/* Verification Helper & Test Users Guide */}
        <div className="mt-3">
          <button
            onClick={() => setShowVerificationGuide(!showVerificationGuide)}
            className="text-[11px] text-slate-400 hover:text-blue-400 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>¿Te aparece 'Acceso bloqueado: la app no completó la verificación'? Haz clic aquí</span>
          </button>

          {showVerificationGuide && (
            <div className="mt-3 p-4 rounded-2xl bg-slate-950 border border-blue-500/30 text-xs space-y-3 animate-fade-in">
              <div className="flex items-center gap-2 text-blue-400 font-bold">
                <Shield className="w-4 h-4" />
                <span>Cómo desbloquear el acceso de Google en 2 pasos:</span>
              </div>

              <div className="space-y-2 text-slate-300 leading-relaxed text-[11px]">
                <p>
                  <strong>Opción 1 (Inmediata sin configuración):</strong> Haz clic en el botón blanco{' '}
                  <span className="text-white font-semibold">"Acceso Google (Sheets & Calendar)"</span>. Cuando aparezca la pantalla de advertencia de Google, haz clic en{' '}
                  <span className="text-emerald-400 font-semibold">"Configuración avanzada" (Advanced)</span> abajo a la izquierda y luego en{' '}
                  <span className="text-emerald-400 font-semibold">"Ir a JERA (no seguro)"</span>.
                </p>

                
              </div>
            </div>
          )}
        </div>

        {feedbackMsg && (
          <div
            className={`mt-3 p-3 rounded-2xl text-xs flex items-center gap-2 animate-fade-in ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/40 border border-rose-500/30 text-rose-300'
            }`}
          >
            {feedbackMsg.type === 'success' ? (
              <Check className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}
      </div>

      {/* Grid of 3 Integrations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Google Sheets */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Google Sheets</h3>
            <p className="text-xs text-slate-400 mb-4">
              Crea una hoja de cálculo en vivo en tu Google Drive con todas tus transacciones, fórmulas y
              categorías organizadas.
            </p>

            {sheetsUrl && (
              <div className="mb-4 p-3 rounded-2xl bg-slate-800 border border-emerald-500/30">
                <span className="text-[11px] text-emerald-400 font-semibold block mb-1">
                  Hoja Generada con Éxito:
                </span>
                <a
                  href={sheetsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-white hover:text-emerald-400 underline flex items-center gap-1 truncate"
                >
                  <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                  Abrir Hoja de Gastos en Google Sheets
                </a>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              if (!user) {
                setAuthError('Por favor inicia sesión con Google primero (usa el botón de Sheets & Calendar arriba).');
                return;
              }
              setShowSheetsConfirm(true);
            }}
            disabled={isExportingSheets}
            className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 hover:border-emerald-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {isExportingSheets ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Exportando a Google Drive...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Sincronizar a Google Sheets</span>
              </>
            )}
          </button>
        </div>

        {/* 2. Gmail Receipt Scanner */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4">
              <Mail className="w-5 h-5 text-rose-400" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Correos del banco (tu hoja)</h3>
            <p className="text-xs text-slate-400 mb-3">
              Lee la hoja "Movimientos" que llena tu lector de correos del banco e importa lo nuevo.
            </p>
            <input
              value={sheetRef}
              onChange={(e) => setSheetRef(e.target.value)}
              placeholder="Pega el enlace de tu hoja de Google"
              aria-label="Enlace de la hoja de movimientos"
              className="w-full mb-4 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
            />
            {gmailReceipts.length > 1 && (
              <button
                onClick={importAllReceipts}
                className="mb-3 w-full py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 text-xs font-bold cursor-pointer"
              >
                Importar todos ({gmailReceipts.length})
              </button>
            )}

            {/* List of scanned receipts */}
            {gmailScanned && (
              <div className="mb-4 max-h-48 overflow-y-auto space-y-2 pr-1">
                {gmailReceipts.length === 0 ? (
                  <p className="text-xs text-slate-500">No hay movimientos nuevos.</p>
                ) : (
                  gmailReceipts.map((r) => (
                    <div
                      key={r.id}
                      className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="pr-2 truncate">
                        <span className="font-semibold text-white block truncate">
                          {r.merchantGuess}
                        </span>
                        <span className="text-[11px] text-slate-400">{r.date}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`font-bold font-mono ${r.type === 'income' ? 'text-emerald-400' : 'text-white'}`}>
                          {r.type === 'income' ? '+' : '−'}
                          {currencySymbol}
                          {(r.estimatedAmount || 0).toLocaleString('es-CL')}
                        </span>
                        <button
                          onClick={() => setPendingImportItem(r)}
                          className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 font-bold text-[10px] cursor-pointer transition-colors"
                        >
                          Importar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => {
              if (!user) {
                setAuthError('Inicia sesión con Google (Sheets) para leer tu hoja de movimientos.');
                return;
              }
              handleScanGmail();
            }}
            disabled={isScanningGmail || !sheetRef.trim()}
            className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 hover:border-rose-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {isScanningGmail ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-rose-400" />
                <span>Leyendo tu hoja...</span>
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 text-rose-400" />
                <span>Leer movimientos de mi hoja</span>
              </>
            )}
          </button>
        </div>

        {/* 3. Google Calendar Reminders */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
              <CalendarIcon className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Google Calendar</h3>
            <p className="text-xs text-slate-400 mb-4">
              Programa recordatorios automáticos de pago de tarjetas, alquiler o revisión quincenal de
              presupuestos.
            </p>

            <div className="space-y-2 mb-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Concepto:</label>
                <input
                  type="text"
                  value={reminderTitle}
                  onChange={(e) => setReminderTitle(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Fecha límite:</label>
                  <input
                    type="date"
                    value={reminderDate}
                    onChange={(e) => setReminderDate(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-[11px]"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Monto ({currencySymbol}):</label>
                  <input
                    type="number"
                    value={reminderAmount}
                    onChange={(e) => setReminderAmount(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-[11px]"
                  />
                </div>
              </div>

              {calendarEventLink && (
                <a
                  href={calendarEventLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-400 hover:underline flex items-center gap-1 pt-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Ver evento en Google Calendar
                </a>
              )}
            </div>
          </div>

          <button
            onClick={() => {
              if (!user) {
                setAuthError('Inicia sesión con Google para programar en Calendar.');
                return;
              }
              setShowCalendarConfirm(true);
            }}
            disabled={isAddingCalendar}
            className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 hover:border-blue-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {isAddingCalendar ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                <span>Programando en Calendar...</span>
              </>
            ) : (
              <>
                <CalendarIcon className="w-4 h-4 text-blue-400" />
                <span>Programar en Google Calendar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Mandatory User Confirmation Modal for Google Sheets creation */}
      {showSheetsConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-950 border border-slate-800 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              ¿Crear nueva hoja en Google Sheets?
            </h3>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Esta acción creará una nueva hoja de cálculo titulada{' '}
              <strong>"JERA - Gastos y Finanzas"</strong> en tu cuenta de Google Drive con las{' '}
              <strong>{transactions.length} transacciones</strong> actuales de tu app.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowSheetsConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={executeExportSheets}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20"
              >
                Confirmar y Exportar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory User Confirmation Modal for Gmail Import */}
      {pendingImportItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-950 border border-slate-800 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Mail className="w-5 h-5 text-rose-400" />
              ¿Importar este movimiento del banco?
            </h3>
            <p className="text-xs text-slate-300 mb-3 leading-relaxed">
              Se creará un nuevo registro de gasto en JERA con los siguientes datos:
            </p>
            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs space-y-1 mb-4">
              <div>
                <span className="text-slate-400">Comercio:</span>{' '}
                <strong className="text-white">{pendingImportItem.merchantGuess}</strong>
              </div>
              <div>
                <span className="text-slate-400">Monto estimado:</span>{' '}
                <strong className="text-emerald-400">
                  {currencySymbol}
                  {pendingImportItem.estimatedAmount?.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                </strong>
              </div>
              <div>
                <span className="text-slate-400">Categoría sugerida:</span>{' '}
                <strong className="text-white">{pendingImportItem.categoryGuess}</strong>
              </div>
              <div>
                <span className="text-slate-400">Fecha:</span>{' '}
                <strong className="text-white">{pendingImportItem.date}</strong>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setPendingImportItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={() => executeImportGmailReceipt(pendingImportItem)}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20"
              >
                Confirmar e Importar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory User Confirmation Modal for Google Calendar Event */}
      {showCalendarConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-950 border border-slate-800 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-blue-400" />
              ¿Programar recordatorio en Google Calendar?
            </h3>
            <p className="text-xs text-slate-300 mb-3 leading-relaxed">
              Se creará un evento en tu calendario principal con notificación emergente 24 horas y 2
              horas antes:
            </p>
            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs space-y-1 mb-4">
              <div>
                <span className="text-slate-400">Evento:</span>{' '}
                <strong className="text-white">{reminderTitle}</strong>
              </div>
              <div>
                <span className="text-slate-400">Fecha:</span>{' '}
                <strong className="text-white">{reminderDate}</strong>
              </div>
              <div>
                <span className="text-slate-400">Monto:</span>{' '}
                <strong className="text-emerald-400">
                  {currencySymbol}
                  {reminderAmount}
                </strong>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowCalendarConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={executeAddCalendarReminder}
                className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold shadow-lg shadow-blue-500/20"
              >
                Confirmar y Agregar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
