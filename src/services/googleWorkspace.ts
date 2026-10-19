import { getAccessToken } from './firebaseAuth';
import { Transaction } from '../types';

export interface GmailReceiptItem {
  id: string;
  subject: string;
  sender: string;
  date: string;
  snippet: string;
  estimatedAmount?: number;
  merchantGuess: string;
  categoryGuess: string;
  type?: 'expense' | 'income';
}

// Categorías del lector de correos (Apps Script) -> categorías de la app
const CATEGORY_MAP: Record<string, string> = {
  'Supermercado': 'Alimentación',
  'Restaurantes': 'Alimentación',
  'Transporte': 'Transporte',
  'Suscripciones': 'Servicios',
  'Hogar y cuentas': 'Servicios',
  'Salud': 'Salud y Bienestar',
  'Ocio': 'Entretenimiento',
  'Otros': 'Otros',
  'Sueldo': 'Nómina / Salario',
  'Reembolsos': 'Otros ingresos',
  'Otros ingresos': 'Otros ingresos',
};

function normalizeSheetDate(v: string): string {
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = v.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  return new Date().toISOString().split('T')[0];
}

export const GoogleWorkspaceService = {
  // 1. Google Sheets: Create and populate spreadsheet
  async exportTransactionsToSheets(transactions: Transaction[], currency: string): Promise<{ url: string; id: string }> {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('Debes iniciar sesión con Google para sincronizar con Google Sheets.');
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const title = `JERA - Gastos y Finanzas (${todayStr})`;

    // Create new spreadsheet
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title,
        },
        sheets: [
          {
            properties: {
              title: 'Transacciones',
              gridProperties: {
                frozenRowCount: 1,
              },
            },
          },
        ],
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json();
      throw new Error(err.error?.message || 'Error al crear la hoja en Google Sheets');
    }

    const sheetData = await createRes.json();
    const spreadsheetId = sheetData.spreadsheetId;
    const spreadsheetUrl = sheetData.spreadsheetUrl;

    // Prepare rows
    const headerRow = [
      'ID',
      'Fecha',
      'Hora',
      'Tipo',
      'Comercio / Concepto',
      'Categoría',
      'Subcategoría',
      `Monto (${currency})`,
      'Cuenta / Banco',
      'Notas',
      'Etiquetas',
      'IA Categorizado',
    ];

    const dataRows = transactions.map((t) => [
      t.id,
      t.date,
      t.time || '',
      t.type === 'expense' ? 'Gasto' : t.type === 'income' ? 'Ingreso' : 'Transferencia',
      t.merchant,
      t.category,
      t.subcategory || '',
      t.type === 'expense' ? -Math.abs(t.amount) : t.amount,
      t.bankSource || t.accountId,
      t.notes || '',
      (t.tags || []).join(', '),
      t.isAiCategorized ? 'Sí' : 'No',
    ]);

    const values = [headerRow, ...dataRows];

    // Append values
    const appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Transacciones!A1:L${values.length}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values,
        }),
      }
    );

    if (!appendRes.ok) {
      const err = await appendRes.json();
      throw new Error(err.error?.message || 'Error al insertar los datos en Google Sheets');
    }

    return {
      id: spreadsheetId,
      url: spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    };
  },

  // 2. Hoja "Movimientos": la llena el lector de correos del banco (Apps Script)
  async readMovimientosSheet(sheetRef: string): Promise<GmailReceiptItem[]> {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('Debes iniciar sesión con Google para leer tu hoja de movimientos.');
    }
    const match = sheetRef.match(/\/d\/([a-zA-Z0-9_-]+)/);
    const sheetId = match ? match[1] : sheetRef.trim();
    if (!sheetId) {
      throw new Error('Pega el enlace de la hoja de Google que llena tu lector de correos.');
    }

    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Movimientos!A2:G`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error?.message || 'No se pudo leer la hoja. Revisa el enlace y que exista la pestaña "Movimientos".');
    }

    const data = await res.json();
    const rows: string[][] = data.values || [];
    const items: GmailReceiptItem[] = [];
    for (const r of rows) {
      const [id, fecha, desc, monto, tipo, categoria, banco] = r;
      const amount = parseInt(String(monto || '').replace(/[^\d]/g, ''), 10) || 0;
      if (!id || !fecha || amount <= 0) continue;
      const income = String(tipo || '').toLowerCase() === 'abono';
      items.push({
        id: String(id),
        subject: desc || '',
        sender: banco || 'Banco',
        date: normalizeSheetDate(String(fecha)),
        snippet: '',
        estimatedAmount: amount,
        merchantGuess: desc || 'Movimiento',
        categoryGuess: CATEGORY_MAP[categoria] || (income ? 'Otros ingresos' : 'Otros'),
        type: income ? 'income' : 'expense',
      });
    }
    return items;
  },

  // 3. Google Calendar: Add reminder or recurring bill payment
  async createCalendarPaymentReminder(params: {
    title: string;
    description: string;
    dueDate: string; // YYYY-MM-DD
    amount?: number;
    currency?: string;
  }): Promise<{ id: string; htmlLink: string }> {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('Debes iniciar sesión con Google para agregar eventos a Google Calendar.');
    }

    const startDateTime = `${params.dueDate}T10:00:00Z`;
    const endDateTime = `${params.dueDate}T10:30:00Z`;

    const eventPayload = {
      summary: `🔔 Recordatorio de Pago: ${params.title} (${params.currency || '$'}${params.amount || ''})`,
      description: `${params.description}\n\nCreado automáticamente por JERA Control de Gastos.`,
      start: {
        dateTime: startDateTime,
      },
      end: {
        dateTime: endDateTime,
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 1440 }, // 1 day before
          { method: 'popup', minutes: 120 }, // 2 hours before
        ],
      },
      colorId: '11', // Red / bold for payment alert
    };

    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventPayload),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || 'Error al crear recordatorio en Google Calendar');
    }

    const data = await res.json();
    return {
      id: data.id,
      htmlLink: data.htmlLink,
    };
  },
};
