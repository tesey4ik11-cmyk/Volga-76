import { EstimateResult, ConfiguratorState } from '../types';
import { formatRuble } from './calcEngine';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

/**
 * Builds a genuine Microsoft Excel (.xlsx) workbook Blob using SheetJS
 */
export function generateEstimateXlsxBlob(
  estimate: EstimateResult,
  config?: Partial<ConfiguratorState>
): Blob {
  const timestamp = new Date().toLocaleDateString('ru-RU');
  const cat = config?.category || 'object';

  // 1. Prepare worksheet rows
  const wsData: (string | number)[][] = [
    ['СТРОИТЕЛЬНАЯ КОМПАНИЯ "ВОЛГАСТРОЙ 76" // ЯРОСЛАВСКАЯ ОБЛАСТЬ'],
    ['Контакты: Андрей: +7 (999) 234-29-39; Станислав: +7 (901) 172-26-20; Email: order@volgastroy76.ru'],
    [`Дата составления: ${timestamp}; Нормативы: СП 20.13330 (IV снеговой район ЯО); СП 22.13330`],
    [`Объект: "${estimate.title}"; Параметры: "${estimate.subtitle}"`],
    [],
    [
      '№',
      'Тип позиции',
      'Наименование позиции / комплекс работ',
      'Кол-во',
      'Ед. изм.',
      'Ставка ВОЛГАСТРОЙ (руб.)',
      'Рыночная ставка ЯО (руб.)',
      'Экономия (руб.)',
      'Стоимость итого (руб.)',
      'Обоснование расценки / Норматив',
    ],
  ];

  let itemNum = 1;
  estimate.rows.forEach((row) => {
    if (row.kind === 'h') {
      wsData.push([
        '',
        'РАЗДЕЛ',
        `=== ${row.name.toUpperCase()} ===`,
        '',
        '',
        '',
        '',
        '',
        '',
        '--',
      ]);
    } else {
      const typeLabel = row.kind === 'w' ? 'Работа / Монтаж' : 'Материалы (опт)';
      const vol = row.volume !== undefined ? row.volume : 1;
      const unit = row.unit || 'компл.';
      const ratePrice = row.unitPrice !== undefined ? row.unitPrice : row.cost;
      const mPrice = row.marketPrice !== undefined ? row.marketPrice : Math.round(ratePrice / 0.9);
      const diffSavings = (mPrice - ratePrice) * vol;
      const sourceAudit = row.source ? `${row.source} (${row.assumptions || ''})` : (row.note || '');

      wsData.push([
        itemNum++,
        typeLabel,
        row.name,
        vol,
        unit,
        ratePrice,
        mPrice,
        diffSavings,
        row.cost,
        sourceAudit,
      ]);
    }
  });

  wsData.push([]);
  wsData.push(['', '', '', '', '', 'ИТОГО РАБОТЫ И СБОРКА:', '', '', estimate.workCost, 'руб.']);
  wsData.push(['', '', '', '', '', 'ИТОГО МАТЕРИАЛЫ (ОПТ):', '', '', estimate.materialCost, 'руб.']);
  wsData.push(['', '', '', '', '', 'ОБЩАЯ СТОИМОСТЬ ОБЪЕКТА:', '', '', estimate.totalCost, 'руб.']);
  wsData.push([]);
  wsData.push([
    'Примечание: Официальная спецификация ВОЛГАСТРОЙ 76. Фиксация сметы по договору 100%. Гарантия 1 год.',
  ]);

  // 2. Create Sheet and Workbook
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  ws['!cols'] = [
    { wch: 5 },
    { wch: 18 },
    { wch: 48 },
    { wch: 9 },
    { wch: 9 },
    { wch: 18 },
    { wch: 18 },
    { wch: 15 },
    { wch: 20 },
    { wch: 38 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Смета');

  // 3. Write to binary buffer
  const outBuf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([outBuf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Directly downloads genuine .xlsx Excel spreadsheet to user device
 */
export function exportEstimateExcel(estimate: EstimateResult, config: ConfiguratorState) {
  const blob = generateEstimateXlsxBlob(estimate, config);
  const filename = `Смета_Волгастрой76_${config.category}_${Date.now().toString().slice(-4)}.xlsx`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Builds a high-resolution, pixel-perfect genuine PDF Blob using canvas + jsPDF
 */
export async function generateCommercialProposalPdfBlob(
  estimate: EstimateResult,
  config?: Partial<ConfiguratorState>
): Promise<Blob> {
  const docNum = `КП-ВГС-${Date.now().toString().slice(-6)}`;
  const dateStr = new Date().toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  // Canvas dimensions: A4 proportion at high DPI (210 x 297 mm -> 1240 x 1754 px)
  const W = 1240;
  const H = 1754;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    // Fallback if canvas context fails
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    return doc.output('blob');
  }

  // 1. Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // Top header accent line
  ctx.fillStyle = '#1e40af';
  ctx.fillRect(0, 0, W, 12);

  // 2. Header: Logo & Branding
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 34px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('ВОЛГАСТРОЙ', 60, 68);
  ctx.fillStyle = '#2563eb';
  ctx.fillText(' 76', 310, 68);

  ctx.fillStyle = '#64748b';
  ctx.font = '600 13px monospace';
  ctx.fillText('ИНЖЕНЕРНО-СТРОИТЕЛЬНОЕ БЮРО // ЯРОСЛАВСКАЯ ОБЛАСТЬ', 60, 92);

  // Header Right: Document Number and Date
  ctx.textAlign = 'right';
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ', W - 60, 60);

  ctx.fillStyle = '#3b82f6';
  ctx.font = 'bold 15px monospace';
  ctx.fillText(`№ ${docNum}`, W - 60, 84);

  ctx.fillStyle = '#64748b';
  ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`Дата составления: ${dateStr}`, W - 60, 104);
  ctx.textAlign = 'left';

  // Divider
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(60, 122);
  ctx.lineTo(W - 60, 122);
  ctx.stroke();

  // 3. Contacts & Engineering Standards Pill
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(60, 138, W - 120, 68, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#1e293b';
  ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Связь с инженерами:', 78, 164);
  ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Андрей: +7 (999) 234-29-39   |   Станислав: +7 (901) 172-26-20   |   order@volgastroy76.ru', 225, 164);

  ctx.fillStyle = '#64748b';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Нормативы: СП 20.13330 (IV снеговой район), СП 22.13330 (Основания и фундаменты), СП 50.13330, ГОСТ', 78, 190);

  // 4. Object Subject Card
  ctx.fillStyle = '#eff6ff';
  ctx.strokeStyle = '#bfdbfe';
  ctx.beginPath();
  ctx.roundRect(60, 222, W - 120, 78, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#1d4ed8';
  ctx.font = 'bold 12px monospace';
  ctx.fillText('РАССЧИТАННЫЙ ОБЪЕКТ СТРОИТЕЛЬСТВА:', 78, 246);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(estimate.title, 78, 274);

  ctx.fillStyle = '#475569';
  ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(estimate.subtitle, 78, 292);

  // 5. Table of Specification Items
  const tableY = 320;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(60, tableY, W - 120, 36);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('№', 76, tableY + 23);
  ctx.fillText('Наименование конструктивного элемента / работ', 120, tableY + 23);
  ctx.fillText('Тип', W - 320, tableY + 23);
  ctx.textAlign = 'right';
  ctx.fillText('Стоимость', W - 78, tableY + 23);
  ctx.textAlign = 'left';

  let curY = tableY + 36;
  const maxRows = 16;
  const renderedRows = estimate.rows.slice(0, maxRows);

  renderedRows.forEach((row, i) => {
    const isEven = i % 2 === 0;
    const rowH = 34;

    if (row.kind === 'h') {
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(60, curY, W - 120, rowH);
      ctx.fillStyle = '#1e3a8a';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(`// РАЗДЕЛ: ${row.name.toUpperCase()}`, 78, curY + 22);
    } else {
      if (!isEven) {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(60, curY, W - 120, rowH);
      }
      ctx.strokeStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(60, curY + rowH);
      ctx.lineTo(W - 60, curY + rowH);
      ctx.stroke();

      // Number
      ctx.fillStyle = '#64748b';
      ctx.font = '12px monospace';
      ctx.fillText(String(i + 1), 76, curY + 22);

      // Name
      ctx.fillStyle = '#0f172a';
      ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const cleanName = row.name.length > 60 ? row.name.slice(0, 58) + '…' : row.name;
      ctx.fillText(cleanName, 120, curY + 22);

      // Type Badge
      if (row.kind === 'w') {
        ctx.fillStyle = '#dbeafe';
        ctx.beginPath();
        ctx.roundRect(W - 325, curY + 7, 72, 20, 4);
        ctx.fill();
        ctx.fillStyle = '#1e40af';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('РАБОТА', W - 310, curY + 21);
      } else {
        ctx.fillStyle = '#dcfce7';
        ctx.beginPath();
        ctx.roundRect(W - 325, curY + 7, 85, 20, 4);
        ctx.fill();
        ctx.fillStyle = '#166534';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('МАТЕРИАЛ', W - 314, curY + 21);
      }

      // Cost
      ctx.textAlign = 'right';
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(formatRuble(row.cost), W - 78, curY + 22);
      ctx.textAlign = 'left';
    }

    curY += rowH;
  });

  if (estimate.rows.length > maxRows) {
    ctx.fillStyle = '#64748b';
    ctx.font = 'italic 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`... и ещё ${estimate.rows.length - maxRows} позиций (полная ведомость приведена в файле Excel .xlsx)`, 78, curY + 24);
    curY += 34;
  }

  // 6. Summary Cost Box
  const sumBoxY = Math.max(curY + 20, H - 380);
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(60, sumBoxY, W - 120, 110, 8);
  ctx.fill();

  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Стоимость монтажных работ и сборки:', 90, sumBoxY + 36);
  ctx.fillText('Стоимость материалов с заводской гарантией:', 90, sumBoxY + 62);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px monospace';
  ctx.fillText(formatRuble(estimate.workCost), W - 90, sumBoxY + 36);
  ctx.fillText(formatRuble(estimate.materialCost), W - 90, sumBoxY + 62);

  // Total line
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(90, sumBoxY + 76);
  ctx.lineTo(W - 90, sumBoxY + 76);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#60a5fa';
  ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('ИТОГОВАЯ СТОИМОСТЬ ПОД КЛЮЧ:', 90, sumBoxY + 98);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 24px monospace';
  ctx.fillText(formatRuble(estimate.totalCost), W - 90, sumBoxY + 98);
  ctx.textAlign = 'left';

  // 7. Guarantees and Official Signature Box
  const footY = sumBoxY + 125;
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.roundRect(60, footY, W - 120, 120, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Гарантийные обязательства и условия:', 80, footY + 28);

  ctx.fillStyle = '#475569';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('1. Стоимость в коммерческом предложении фиксируется в договоре подряда и не подлежит увеличению.', 80, footY + 50);
  ctx.fillText('2. Гарантия на несущий конструктив и свайные основания составляет 1 год.', 80, footY + 70);
  ctx.fillText('3. Бесплатный выезд инженера по Ярославлю и Ярославской области для уточнения осей и высотных отметок.', 80, footY + 90);

  // Signatures
  ctx.textAlign = 'right';
  ctx.fillStyle = '#64748b';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Главный инженер ВОЛГАСТРОЙ 76:', W - 80, footY + 45);
  ctx.fillText('___________________ / Соколов А.В. /', W - 80, footY + 75);
  ctx.fillStyle = '#2563eb';
  ctx.font = 'bold 11px monospace';
  ctx.fillText('М.П. [ПРОВЕРЕНО И СОГЛАСОВАНО]', W - 80, footY + 95);
  ctx.textAlign = 'left';

  // 8. Convert Canvas to real PDF via jsPDF
  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
  return pdf.output('blob');
}

/**
 * Downloads genuine .pdf file to user device
 */
export async function downloadCommercialProposalPdf(
  estimate: EstimateResult,
  config: ConfiguratorState
) {
  const blob = await generateCommercialProposalPdfBlob(estimate, config);
  const filename = `КП_Волгастрой76_${config.category}_${Date.now().toString().slice(-4)}.pdf`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
