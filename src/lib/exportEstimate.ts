import { EstimateResult, ConfiguratorState } from '../types';
import { formatRuble } from './calcEngine';

/**
 * Exports estimate data to Excel-compatible CSV file with UTF-8 BOM.
 * Directly opens in MS Excel and 1C with correct Cyrillic encoding and column separation.
 */
export function exportEstimateExcel(estimate: EstimateResult, config: ConfiguratorState) {
  const timestamp = new Date().toLocaleDateString('ru-RU');
  const filename = `Смета_Волгастрой76_${config.category}_${Date.now().toString().slice(-4)}.csv`;

  let csvContent = '\uFEFF'; // UTF-8 BOM for Excel
  csvContent += 'СТРОИТЕЛЬНАЯ КОМПАНИЯ "ВОЛГАСТРОЙ 76" // ЯРОСЛАВСКАЯ ОБЛАСТЬ\n';
  csvContent += `Контакты: Андрей: +7 (999) 234-29-39; Станислав: +7 (901) 172-26-20; Email: order@volgastroy76.ru\n`;
  csvContent += `Дата составления: ${timestamp}; Нормативы: СП 20.13330 (IV снеговой район); СП 22.13330\n`;
  csvContent += `Объект: "${estimate.title}"; Характеристики: "${estimate.subtitle}"\n\n`;

  csvContent += '№;Тип;Наименование позиции / работ;Техническое описание / примечание;Стоимость (руб.)\n';

  let itemNum = 1;
  estimate.rows.forEach((row) => {
    if (row.kind === 'h') {
      csvContent += `;"РАЗДЕЛ";"=== ${row.name.toUpperCase()} ===";;"--"\n`;
    } else {
      const typeLabel = row.kind === 'w' ? 'Работа / Монтаж' : 'Материалы (опт)';
      const cleanName = row.name.replace(/"/g, '""');
      const cleanNote = (row.note || '').replace(/"/g, '""');
      csvContent += `${itemNum++};"${typeLabel}";"${cleanName}";"${cleanNote}";${row.cost}\n`;
    }
  });

  csvContent += '\n;;;"ИТОГО РАБОТЫ И СБОРКА:";' + estimate.workCost + '\n';
  csvContent += ';;;"ИТОГО МАТЕРИАЛЫ (ОПТОВЫЙ СКЛАД):";' + estimate.materialCost + '\n';
  csvContent += ';;;"ОБЩАЯ СТОИМОСТЬ ОБЪЕКТА ПОД КЛЮЧ:";' + estimate.totalCost + '\n';
  csvContent += '\nПримечание: Предварительная стоимость. Точная смета с фиксированной ценой фиксируется в договоре после лазерного нивелирования участка.\n';

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
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
 * Generates an official printable Commercial Proposal (Коммерческое предложение / PDF)
 * Opens an isolated print preview with engineering branding and print stylesheet.
 */
export function downloadCommercialProposalPdf(estimate: EstimateResult, config: ConfiguratorState) {
  const dateStr = new Date().toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const docNum = `КП-ВГС-${Date.now().toString().slice(-6)}`;

  const printWindow = window.open('', '_blank', 'width=960,height=800');
  if (!printWindow) {
    alert('Пожалуйста, разрешите открытие всплывающих окон для формирования PDF коммерческого предложения.');
    return;
  }

  const rowsHtml = estimate.rows
    .map((row, idx) => {
      if (row.kind === 'h') {
        return `
          <tr class="header-row">
            <td colspan="4"><strong>// ${row.name.toUpperCase()}</strong></td>
          </tr>
        `;
      }
      const typeLabel = row.kind === 'w' ? '<span class="badge badge-work">РАБОТА</span>' : '<span class="badge badge-mat">МАТЕРИАЛ</span>';
      return `
        <tr>
          <td class="num">${idx + 1}</td>
          <td>
            <div class="item-name">${row.name}</div>
            <div class="item-note">${row.note || ''}</div>
          </td>
          <td class="type">${typeLabel}</td>
          <td class="price">${formatRuble(row.cost)}</td>
        </tr>
      `;
    })
    .join('');

  const html = `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="utf-8" />
      <title>${docNum} - Коммерческое предложение ВОЛГАСТРОЙ 76</title>
      <style>
        @page {
          size: A4;
          margin: 15mm 15mm 15mm 15mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          background: #ffffff;
          margin: 0;
          padding: 24px;
          font-size: 12px;
          line-height: 1.45;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #2563eb;
          padding-bottom: 16px;
          margin-bottom: 20px;
        }
        .brand-title {
          font-size: 22px;
          font-weight: 900;
          letter-spacing: 0.5px;
          color: #0f172a;
          margin: 0;
        }
        .brand-title span {
          color: #2563eb;
        }
        .brand-sub {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #64748b;
          font-family: monospace;
          margin-top: 3px;
        }
        .header-contacts {
          text-align: right;
          font-size: 11px;
          color: #334155;
          font-family: monospace;
        }
        .header-contacts strong {
          color: #0f172a;
        }
        .doc-title-block {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-left: 4px solid #2563eb;
          padding: 12px 16px;
          margin-bottom: 20px;
          border-radius: 4px;
        }
        .doc-num {
          font-family: monospace;
          font-size: 11px;
          color: #2563eb;
          font-weight: bold;
        }
        .doc-heading {
          font-size: 16px;
          font-weight: 800;
          margin: 4px 0 2px 0;
          color: #0f172a;
        }
        .doc-specs {
          font-size: 12px;
          color: #475569;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th {
          background: #0f172a;
          color: #ffffff;
          text-align: left;
          font-size: 10px;
          font-family: monospace;
          text-transform: uppercase;
          padding: 8px 10px;
          border: 1px solid #0f172a;
        }
        td {
          padding: 7px 10px;
          border: 1px solid #e2e8f0;
          font-size: 11px;
          vertical-align: top;
        }
        tr:nth-child(even) td {
          background: #fafafa;
        }
        .header-row td {
          background: #f1f5f9 !important;
          color: #1e3a8a;
          font-family: monospace;
          font-size: 10px;
          padding: 6px 10px;
        }
        .num {
          width: 32px;
          text-align: center;
          font-family: monospace;
          color: #64748b;
        }
        .type {
          width: 90px;
          text-align: center;
        }
        .price {
          width: 120px;
          text-align: right;
          font-family: monospace;
          font-weight: 700;
          white-space: nowrap;
        }
        .item-name {
          font-weight: 600;
          color: #0f172a;
        }
        .item-note {
          font-size: 10px;
          color: #64748b;
          margin-top: 1px;
        }
        .badge {
          display: inline-block;
          font-size: 8px;
          font-family: monospace;
          padding: 2px 5px;
          border-radius: 3px;
          font-weight: bold;
        }
        .badge-work {
          background: #e0f2fe;
          color: #0369a1;
        }
        .badge-mat {
          background: #fef3c7;
          color: #b45309;
        }
        .totals-block {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 24px;
        }
        .totals-table {
          width: 320px;
          border-collapse: collapse;
        }
        .totals-table td {
          padding: 6px 10px;
          font-size: 11px;
          border: 1px solid #e2e8f0;
        }
        .totals-table .total-final {
          background: #0f172a;
          color: #ffffff;
          font-weight: 900;
          font-size: 14px;
        }
        .totals-table .total-final td {
          border-color: #0f172a;
          color: #ffffff;
        }
        .conditions {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          padding: 12px 16px;
          font-size: 10px;
          color: #475569;
          line-height: 1.6;
          margin-bottom: 30px;
        }
        .conditions h4 {
          margin: 0 0 4px 0;
          font-size: 11px;
          color: #0f172a;
          font-weight: 700;
        }
        .signatures {
          display: flex;
          justify-content: space-between;
          padding-top: 20px;
          border-top: 1px dashed #cbd5e1;
          font-size: 11px;
        }
        .sig-block {
          width: 45%;
        }
        .sig-line {
          margin-top: 36px;
          border-top: 1px solid #475569;
          padding-top: 4px;
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #64748b;
        }
        .btn-print-bar {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: #0f172a;
          color: #ffffff;
          padding: 12px 20px;
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.3);
          font-family: sans-serif;
          font-size: 13px;
          font-weight: bold;
          cursor: pointer;
          border: none;
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 1000;
        }
        @media print {
          .btn-print-bar {
            display: none !important;
          }
        }
      </style>
    </head>
    <body>
      <button class="btn-print-bar" onclick="window.print()">
        🖨️ Распечатать или Сохранить в PDF
      </button>

      <div class="header">
        <div>
          <h1 class="brand-title">ВОЛГАСТРОЙ <span>76</span></h1>
          <div class="brand-sub">СТРОИТЕЛЬНАЯ КОМПАНИЯ И ИНЖЕНЕРНОЕ БЮРО // ЯРОСЛАВСКАЯ ОБЛ.</div>
        </div>
        <div class="header-contacts">
          <div><strong>Андрей:</strong> +7 (999) 234-29-39 (Производство · стройка)</div>
          <div><strong>Станислав:</strong> +7 (901) 172-26-20 (Сметы · организация)</div>
          <div><strong>Email:</strong> order@volgastroy76.ru · 8:00–21:00 без выходных</div>
          <div><strong>Геолокация:</strong> Ярославль, Тутаев, Рыбинск, Ростов</div>
        </div>
      </div>

      <div class="doc-title-block">
        <div class="doc-num">${docNum} от ${dateStr}</div>
        <div class="doc-heading">КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ: ${estimate.title.toUpperCase()}</div>
        <div class="doc-specs">Параметры и комплектация: ${estimate.subtitle} · Расчёт по СП 20.13330 (IV снеговой район)</div>
      </div>

      <table>
        <thead>
          <tr>
            <th class="num">№</th>
            <th>Наименование работ и комплектующих</th>
            <th class="type">Категория</th>
            <th class="price">Стоимость, руб.</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="totals-block">
        <table class="totals-table">
          <tr>
            <td>Итого Работы и Монтаж:</td>
            <td class="price">${formatRuble(estimate.workCost)}</td>
          </tr>
          <tr>
            <td>Итого Материалы (оптовые базы):</td>
            <td class="price">${formatRuble(estimate.materialCost)}</td>
          </tr>
          <tr class="total-final">
            <td>ВСЕГО К ОПЛАТЕ ПОД КЛЮЧ:</td>
            <td class="price">${formatRuble(estimate.totalCost)}</td>
          </tr>
        </table>
      </div>

      <div class="conditions">
        <h4>ИНЖЕНЕРНЫЕ УСЛОВИЯ И ГАРАНТИЙНЫЕ ОБЯЗАТЕЛЬСТВА:</h4>
        1. <strong>Фиксация стоимости:</strong> Предварительный расчёт. Окончательная смета фиксируется в договоре подряда без последующих доплат.<br />
        2. <strong>Нормативы:</strong> Все несущие конструкции рассчитываются строго по СП 20.13330 (снеговой район IV — 2.0 кПа для Ярославской области). Сваи — с заглублением 2.5–3.0 м ниже нормативной глубины промерзания 1.45 м.<br />
        3. <strong>Бесплатный выезд:</strong> Инженер ВОЛГАСТРОЙ 76 бесплатно выезжает на участок с лазерным нивелиром по Ярославлю и области для высотной съёмки и привязки осей.<br />
        4. <strong>Гарантия:</strong> 12 месяцев на все несущие каркасы, сварные швы и узлы примыканий по официальному договору.
      </div>

      <div class="signatures">
        <div class="sig-block">
          <div><strong>Исполнитель:</strong> Строительная компания «ВОЛГАСТРОЙ 76»</div>
          <div>Инженер проекта: _______________________ / Тягунов С. П. /</div>
          <div class="sig-line">
            <span>М.П.</span>
            <span>«____» ________________ 2026 г.</span>
          </div>
        </div>
        <div class="sig-block">
          <div><strong>Заказчик:</strong></div>
          <div>Подпись: _______________________ / _______________________ /</div>
          <div class="sig-line">
            <span>Согласовано</span>
            <span>«____» ________________ 2026 г.</span>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
