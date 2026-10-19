import { jsPDF } from 'jspdf';
import { Transaction } from '../types';

export const ExportService = {
  exportToCSV(transactions: Transaction[], currency: string, filename = 'jera_gastos.csv') {
    const headers = [
      'ID',
      'Fecha',
      'Hora',
      'Tipo',
      'Comercio / Concepto',
      'Categoría',
      'Subcategoría',
      `Monto (${currency})`,
      'Cuenta',
      'Notas',
      'Etiquetas',
    ];

    const rows = transactions.map((t) => [
      t.id,
      t.date,
      t.time || '',
      t.type === 'expense' ? 'Gasto' : t.type === 'income' ? 'Ingreso' : 'Transferencia',
      `"${(t.merchant || '').replace(/"/g, '""')}"`,
      `"${(t.category || '').replace(/"/g, '""')}"`,
      `"${(t.subcategory || '').replace(/"/g, '""')}"`,
      t.type === 'expense' ? -Math.abs(t.amount) : t.amount,
      `"${(t.bankSource || t.accountId || '').replace(/"/g, '""')}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
      `"${(t.tags || []).join('; ')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  exportToPDF(
    transactions: Transaction[],
    summary: {
      totalIncome: number;
      totalExpenses: number;
      netSavings: number;
      currency: string;
      periodName: string;
    },
    filename = 'jera_reporte.pdf'
  ) {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Header background banner
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.rect(0, 0, pageWidth, 42, 'F');

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(16, 185, 129); // Emerald
    doc.text('JERA', 14, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text('Reporte Financiero Mensual & Control de Gastos', 14, 27);
    doc.text(`Período: ${summary.periodName} | Generado: ${new Date().toLocaleDateString('es-ES')}`, 14, 34);

    y = 52;

    // Financial KPI Cards
    const cardWidth = (pageWidth - 28 - 8) / 3;

    // Income card
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, y, cardWidth, 22, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('INGRESOS TOTALES', 18, y + 8);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(`+${summary.currency} ${summary.totalIncome.toLocaleString('es-CL', { maximumFractionDigits: 0 })}`, 18, y + 17);

    // Expense card
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14 + cardWidth + 4, y, cardWidth, 22, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('GASTOS TOTALES', 14 + cardWidth + 8, y + 8);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(239, 68, 68);
    doc.text(`-${summary.currency} ${summary.totalExpenses.toLocaleString('es-CL', { maximumFractionDigits: 0 })}`, 14 + cardWidth + 8, y + 17);

    // Net card
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14 + (cardWidth + 4) * 2, y, cardWidth, 22, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('AHORRO NETO', 14 + (cardWidth + 4) * 2 + 4, y + 8);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const netColor = summary.netSavings >= 0 ? [16, 185, 129] : [239, 68, 68];
    doc.setTextColor(netColor[0], netColor[1], netColor[2]);
    doc.text(
      `${summary.netSavings >= 0 ? '+' : ''}${summary.currency} ${summary.netSavings.toLocaleString('es-CL', { maximumFractionDigits: 0 })}`,
      14 + (cardWidth + 4) * 2 + 4,
      y + 17
    );

    y += 32;

    // Category breakdown summary
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('Desglose de Gastos por Categoría', 14, y);
    y += 6;

    const categoryTotals: Record<string, number> = {};
    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
      });

    const sortedCats = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

    sortedCats.slice(0, 5).forEach(([cat, amount]) => {
      const pct = summary.totalExpenses > 0 ? ((amount / summary.totalExpenses) * 100).toFixed(1) : '0';
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.text(`• ${cat}: ${summary.currency} ${amount.toLocaleString('es-CL', { maximumFractionDigits: 0 })} (${pct}%)`, 18, y);
      y += 5;
    });

    y += 8;

    // Transactions Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('Historial de Transacciones', 14, y);
    y += 6;

    // Table Header
    doc.setFillColor(30, 41, 59);
    doc.rect(14, y, pageWidth - 28, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('FECHA', 16, y + 5);
    doc.text('COMERCIO / CONCEPTO', 40, y + 5);
    doc.text('CATEGORÍA', 105, y + 5);
    doc.text('TIPO', 145, y + 5);
    doc.text('MONTO', pageWidth - 16, y + 5, { align: 'right' });

    y += 8;

    // Table rows
    transactions.slice(0, 30).forEach((t, i) => {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }

      doc.setFillColor(i % 2 === 0 ? 250 : 255, i % 2 === 0 ? 250 : 255, i % 2 === 0 ? 250 : 255);
      doc.rect(14, y - 4, pageWidth - 28, 6.5, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(t.date, 16, y);

      let concept = t.merchant;
      if (concept.length > 32) concept = concept.substring(0, 30) + '...';
      doc.text(concept, 40, y);

      doc.text(t.category, 105, y);

      const typeLabel = t.type === 'expense' ? 'Gasto' : t.type === 'income' ? 'Ingreso' : 'Transf.';
      doc.text(typeLabel, 145, y);

      if (t.type === 'expense') {
        doc.setTextColor(220, 38, 38);
        doc.text(`-${summary.currency} ${t.amount.toLocaleString('es-CL', { maximumFractionDigits: 0 })}`, pageWidth - 16, y, { align: 'right' });
      } else {
        doc.setTextColor(16, 185, 129);
        doc.text(`+${summary.currency} ${t.amount.toLocaleString('es-CL', { maximumFractionDigits: 0 })}`, pageWidth - 16, y, { align: 'right' });
      }

      y += 6.5;
    });

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('JERA App - Seguridad Biométrica, Categorización IA y Modo Offline.', 14, 290);

    doc.save(filename);
  },
};
