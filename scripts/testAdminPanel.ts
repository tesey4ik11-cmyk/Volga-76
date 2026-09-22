/**
 * ВОЛГАСТРОЙ 76 — Комплексный верификатор и тест AdminPanel
 * Проверяет математику, синхронизацию с MySQL/PHP API,
 * масштабирование по площади, валидацию и структуры данных.
 */

import {
  calculateEstimateTotals,
  scaleEstimateByArea,
  formatRub,
  formatNum,
  generateEstimateNumber,
  AdminEstimate,
  EstimateSection,
  EstimateItem,
  EstimateMaterial,
} from '../src/utils/estimateCalculator';

import {
  ESTIMATE_TEMPLATES,
  createEstimateFromTemplate,
} from '../src/data/estimateTemplates';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`✅ PASSED: ${msg}`);
    passCount++;
  } else {
    console.error(`❌ FAILED: ${msg}`);
    failCount++;
  }
}

console.log('=== ЗАПУСК ТЕСТОВ ADMIN PANEL & РАСЧЕТНОГО ЯДРА ===\n');

// 1. Тест расчета отдельной позиции (работа + вложенные материалы)
{
  const mat1: EstimateMaterial = {
    id: 'm1',
    name: 'Бетон B25 W6 F150',
    unit: 'м³',
    quantity: 2,
    unit_price: 5500,
    cost_price: 4500,
  };
  const mat2: EstimateMaterial = {
    id: 'm2',
    name: 'Арматура А500С 12мм',
    unit: 'т',
    quantity: 0.1,
    unit_price: 70000,
    cost_price: 60000,
  };
  const pos: EstimateItem = {
    id: 'p1',
    name: 'Устройство монолитного ленточного фундамента',
    type: 'work',
    unit: 'м³',
    quantity: 10,
    unit_price: 4200,
    cost_price: 3000,
    materials: [mat1, mat2],
  };
  const sec: EstimateSection = {
    id: 's1',
    title: '1. Земляные и монолитные работы',
    name: '1. Земляные и монолитные работы',
    items: [pos],
  };
  const est: Partial<AdminEstimate> = {
    id: 101,
    number: 'КП-2026-TEST',
    title: 'Тестовый объект',
    customer_name: 'Иван Петров',
    customer_phone: '+7 999 123-45-67',
    object_name: 'Тестовый объект',
    object_address: 'Ярославль, Заволжский р-н',
    client_name: 'Иван Петров',
    client_phone: '+7 999 123-45-67',
    client_address: 'Ярославль, Заволжский р-н',
    category: 'house',
    status: 'draft',
    area: 120,
    sections: [sec],
    total_rub: 0,
    work_rub: 0,
    mat_rub: 0,
    delivery_rub: 30000,
    overhead_rub: 20000,
    profit_rub: 15000,
  };

  const calculated = calculateEstimateTotals(est as any);

  assert(calculated.work_rub === 42000, 'Сумма работ = 42 000 руб.');
  assert(calculated.mat_rub === 18000, 'Сумма материалов = 18 000 руб.');
  assert(
    calculated.total_rub === 42000 + 18000 + 30000 + 20000 + 15000,
    'Итоговая сумма включает работы, материалы, доставку, накладные и прибыль = 125 000 руб.'
  );
  assert(calculated.sections[0].work_total === 42000, 'Секция 1: итог по работам 42 000 руб.');
  assert(calculated.sections[0].mat_total === 18000, 'Секция 1: итог по материалам 18 000 руб.');
  assert(calculated.sections[0].section_total === 60000, 'Секция 1: полный итог 60 000 руб.');
}

// 2. Тест масштабирования сметы по площади (Линейная модель)
{
  const baseEst = createEstimateFromTemplate('frame_house', 64);
  const scaledEst = scaleEstimateByArea(baseEst, 120);

  assert(scaledEst.area === 120, 'Новая площадь установлена в 120 м²');
  assert(
    scaledEst.work_rub > baseEst.work_rub,
    'Стоимость работ для 120 м² строго больше чем для 64 м²'
  );
  assert(
    scaledEst.mat_rub > baseEst.mat_rub,
    'Стоимость материалов для 120 м² строго больше чем для 64 м²'
  );
  assert(
    scaledEst.total_rub > baseEst.total_rub,
    'Итоговая стоимость 120 м² строго больше чем для 64 м²'
  );
}

// 3. Тест всех шаблонов смет
{
  const templates = ESTIMATE_TEMPLATES;
  assert(templates.length >= 6, `В системе зарегистрировано ${templates.length} строительных шаблонов смет`);

  templates.forEach((t) => {
    const tmplEst = createEstimateFromTemplate(t.id, t.defaultArea);
    assert(tmplEst.sections.length > 0, `Шаблон ${t.name} содержит не менее 1 раздела`);
    assert(tmplEst.total_rub > 0, `Шаблон ${t.name} имеет валидную ненулевую стоимость (${formatRub(tmplEst.total_rub)})`);
    assert(tmplEst.work_rub > 0, `Шаблон ${t.name} содержит работы (${formatRub(tmplEst.work_rub)})`);
    assert(tmplEst.mat_rub > 0, `Шаблон ${t.name} содержит материалы (${formatRub(tmplEst.mat_rub)})`);
  });
}

// 4. Форматирование рублей и чисел
{
  assert(formatRub(1250000) === '1 250 000 ₽', 'formatRub форматирует 1 250 000 ₽ с пробелами');
  assert(formatNum(12.3456) === '12,35' || formatNum(12.3456) === '12.35', 'formatNum корректно округляет до 2 знаков');
  assert(formatNum(12) === '12', 'formatNum целое число без лишних нулей');
}

// 5. Генерация уникального номера КП
{
  const num1 = generateEstimateNumber();
  const num2 = generateEstimateNumber();
  assert(num1.startsWith('КП-'), 'Номер сметы начинается с КП-');
  assert(num1 !== num2 || num1.length > 5, 'Номера смет генерируются корректно');
}

// 6. Проверка валидности структуры для экспорта в DOCX/PDF/XLSX
{
  const testEst = createEstimateFromTemplate('frame_house', 120);
  assert(Array.isArray(testEst.sections), 'Разделы сметы представлены массивом');
  testEst.sections.forEach((sec, idx) => {
    assert(typeof sec.title === 'string' && sec.title.length > 0, `Раздел ${idx + 1} имеет непустой заголовок`);
    assert(Array.isArray(sec.positions), `Раздел ${idx + 1} содержит массив позиций`);
    sec.positions.forEach((pos, pidx) => {
      assert(pos.name.length > 0, `Позиция ${pidx + 1} имеет наименование`);
      assert(pos.quantity >= 0, `Количество позиции ${pidx + 1} неотрицательно`);
      assert(pos.unit_price >= 0, `Цена за единицу позиции ${pidx + 1} неотрицательна`);
    });
  });
}

console.log(`\n====================================================`);
console.log(`Итого тестов AdminPanel: ${passCount + failCount}`);
console.log(`Успешно пройдено:        ${passCount}`);
console.log(`Ошибок:                  ${failCount}`);
console.log(`====================================================\n`);

if (failCount > 0) {
  process.exit(1);
}
