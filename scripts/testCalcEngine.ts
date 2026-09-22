import { calculateEstimate } from '../src/lib/calcEngine';
import { ConfiguratorState } from '../src/types';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${msg}`);
}

console.log('=== ЗАПУСК ТЕСТОВ РАСЧЕТНОГО ДВИЖКА ВОЛГАСТРОЙ 76 ===\n');

// Базовое состояние для тестов
const baseState: ConfiguratorState = {
  category: 'house',
  houseArea: 48,
  houseKit: 'frame',
  houseMaterial: 'wood',
  houseFund: false,
  houseCrane: false,
  houseMatInclude: true,

  poolPavilion: 'none',
  poolPipe: false,
  poolTech: false,
  poolDeck: false,

  deckArea: 24,
  deckLayout: 'straight',
  deckSteps: 0,
  deckPiles: false,
  deckRail: false,

  pileCount: 20,
  pileDia: '89',
  pileRostverk: false,
  pileFill: false,

  netLength: 25,
  netType: 'both',
  netDeep: false,
  netWells: 0,
  netHasWells: false,
  netWellsCount: 0,
  netHeating: false,
  netHeatingLength: 20,
  netHeatingChambers: false,
  netHeatingChambersCount: 0,
  netStorm: false,
  netStormLength: 25,
  netStormInlets: false,
  netStormInletsCount: 0,

  finishArea: 50,
  finishLevel: 'base',
  finishFloor: false,
  finishWarm: false,
  finishElectric: false,
};

// ТЕСТ 1: Дом «Силовая коробка» (frame)
{
  const est = calculateEstimate({ ...baseState, category: 'house', houseKit: 'frame' });
  assert(est.totalCost === est.workCost + est.materialCost, 'Дом frame: totalCost = workCost + materialCost');

  const hasWindows = est.rows.some(r => r.name.toLowerCase().includes('окно') || r.name.toLowerCase().includes('оконн'));
  const hasDoors = est.rows.some(r => r.name.toLowerCase().includes('дверь'));
  const hasInsulation = est.rows.some(r => r.name.toLowerCase().includes('утеплител'));
  const hasSandwich = est.rows.some(r => r.name.toLowerCase().includes('сэндвич'));
  const hasGutters = est.rows.some(r => r.name.toLowerCase().includes('водосточ'));

  assert(!hasWindows, 'Дом frame: НЕТ окон в смете');
  assert(!hasDoors, 'Дом frame: НЕТ дверей в смете');
  assert(!hasInsulation, 'Дом frame: НЕТ утеплителя в смете');
  assert(!hasSandwich, 'Дом frame: НЕТ сэндвич-панелей в смете');
  assert(!hasGutters, 'Дом frame: НЕТ водосточной системы в смете');
}

// ТЕСТ 2: Дом «Под ключ» (turnkey)
{
  const est = calculateEstimate({ ...baseState, category: 'house', houseKit: 'turnkey' });
  assert(est.totalCost === est.workCost + est.materialCost, 'Дом turnkey: totalCost = workCost + materialCost');

  const hasWindows = est.rows.some(r => r.name.toLowerCase().includes('окно') || r.name.toLowerCase().includes('rehau'));
  const hasDoors = est.rows.some(r => r.name.toLowerCase().includes('дверь'));
  const hasInsulation = est.rows.some(r => r.name.toLowerCase().includes('утеплител') || r.name.toLowerCase().includes('базальт'));

  assert(hasWindows, 'Дом turnkey: ЕСТЬ окна Rehau');
  assert(hasDoors, 'Дом turnkey: ЕСТЬ входная сейф-дверь');
  assert(hasInsulation, 'Дом turnkey: ЕСТЬ базальтовый утеплитель');
}

// ТЕСТ 3: Свайное поле
{
  const estNoRostverk = calculateEstimate({ ...baseState, category: 'pile', pileCount: 16, pileDia: '89', pileRostverk: false, pileFill: false });
  const estWithRostverk = calculateEstimate({ ...baseState, category: 'pile', pileCount: 16, pileDia: '89', pileRostverk: true, pileFill: true });

  assert(estNoRostverk.totalCost === estNoRostverk.workCost + estNoRostverk.materialCost, 'Сваи: баланс сметы без ростверка');
  assert(estWithRostverk.totalCost === estWithRostverk.workCost + estWithRostverk.materialCost, 'Сваи: баланс сметы с ростверком');
  assert(estWithRostverk.totalCost > estNoRostverk.totalCost, 'Сваи с ростверком и бетонированием дороже свай без них');

  const hasChannel = estWithRostverk.rows.some(r => r.name.toLowerCase().includes('швеллер'));
  const hasCps = estWithRostverk.rows.some(r => r.name.toLowerCase().includes('пескобетон') || r.name.toLowerCase().includes('бетонирование'));
  assert(hasChannel, 'Сваи: есть швеллер ростверка');
  assert(hasCps, 'Сваи: есть бетонирование полостей');
}

// ТЕСТ 4: Терраса
{
  const estStraight = calculateEstimate({ ...baseState, category: 'deck', deckArea: 30, deckLayout: 'straight', deckSteps: 0, deckRail: false, deckPiles: false });
  const estDiag = calculateEstimate({ ...baseState, category: 'deck', deckArea: 30, deckLayout: 'diag', deckSteps: 3, deckRail: true, deckPiles: true });

  assert(estStraight.totalCost === estStraight.workCost + estStraight.materialCost, 'Терраса прямая: баланс сметы');
  assert(estDiag.totalCost === estDiag.workCost + estDiag.materialCost, 'Терраса диагональная: баланс сметы');
  assert(estDiag.totalCost > estStraight.totalCost, 'Диагональная терраса со ступенями и перилами дороже прямой пустой');

  const hasRail = estDiag.rows.some(r => r.name.toLowerCase().includes('ограждени') || r.name.toLowerCase().includes('перил'));
  const hasSteps = estDiag.rows.some(r => r.name.toLowerCase().includes('ступен'));
  assert(hasRail, 'Терраса: есть ограждения при deckRail = true');
  assert(hasSteps, 'Терраса: есть ступени при deckSteps > 0');
}

// ТЕСТ 5: Бассейн
{
  const estNoPavilion = calculateEstimate({ ...baseState, category: 'pool', poolPavilion: 'none', poolTech: false });
  const estSlide = calculateEstimate({ ...baseState, category: 'pool', poolPavilion: 'slide', poolTech: true });

  assert(estNoPavilion.totalCost === estNoPavilion.workCost + estNoPavilion.materialCost, 'Бассейн без павильона: баланс');
  assert(estSlide.totalCost === estSlide.workCost + estSlide.materialCost, 'Бассейн со сдвижным павильоном: баланс');

  const hasSlide = estSlide.rows.some(r => r.name.toLowerCase().includes('раздвижн') || r.name.toLowerCase().includes('телескопическ'));
  const hasTech = estSlide.rows.some(r => r.name.toLowerCase().includes('техпомещен') || r.name.toLowerCase().includes('кессон'));
  assert(hasSlide, 'Бассейн: есть раздвижной павильон');
  assert(hasTech, 'Бассейн: есть техпомещение при poolTech = true');
}

// ТЕСТ 6: Инженерные сети
{
  const estK1 = calculateEstimate({ ...baseState, category: 'net', netType: 'k1', netLength: 30, netDeep: false, netHasWells: false });
  const estDeepHeating = calculateEstimate({ ...baseState, category: 'net', netType: 'heating', netLength: 30, netDeep: true, netHeatingChambers: true, netHeatingChambersCount: 2 });

  assert(estK1.totalCost === estK1.workCost + estK1.materialCost, 'Сети К1: баланс');
  assert(estDeepHeating.totalCost === estDeepHeating.workCost + estDeepHeating.materialCost, 'Сети теплотрасса: баланс');

  const hasHeatPipe = estDeepHeating.rows.some(r => r.name.toLowerCase().includes('ппу'));
  const hasChambers = estDeepHeating.rows.some(r => r.name.toLowerCase().includes('камер'));
  assert(hasHeatPipe, 'Сети: есть трубы ППУ для теплотрассы');
  assert(hasChambers, 'Сети: есть тепловые камеры УТ');
}

// ТЕСТ 7: Отделка
{
  const estWhiteBox = calculateEstimate({ ...baseState, category: 'finish', finishArea: 60, finishLevel: 'base', finishFloor: false, finishWarm: false, finishElectric: false });
  const estTurnkey = calculateEstimate({ ...baseState, category: 'finish', finishArea: 60, finishLevel: 'full', finishFloor: true, finishWarm: true, finishElectric: true });

  assert(estWhiteBox.totalCost === estWhiteBox.workCost + estWhiteBox.materialCost, 'Отделка White Box: баланс');
  assert(estTurnkey.totalCost === estTurnkey.workCost + estTurnkey.materialCost, 'Отделка под ключ: баланс');

  const hasWarmFloor = estTurnkey.rows.some(r => r.name.toLowerCase().includes('теплый пол') || r.name.toLowerCase().includes('pex'));
  const hasElectric = estTurnkey.rows.some(r => r.name.toLowerCase().includes('электромонтаж') || r.name.toLowerCase().includes('ввг'));
  const hasSpc = estTurnkey.rows.some(r => r.name.toLowerCase().includes('spc') || r.name.toLowerCase().includes('кварцвинил'));

  assert(hasWarmFloor, 'Отделка: есть теплый пол водяной');
  assert(hasElectric, 'Отделка: есть разводка электрики');
  assert(hasSpc, 'Отделка: есть SPC кварцвинил');
}

// ТЕСТ 8: Аудит полей и проверяемости сметы
{
  const testEst = calculateEstimate({
    ...baseState,
    category: 'house',
    houseKit: 'turnkey',
    houseFund: true,
    houseCrane: true,
  });

  const validRows = testEst.rows.filter(r => r.kind !== 'h');
  assert(validRows.length > 5, 'В смете дома под ключ есть детальные строки');

  const allHaveSource = validRows.every(r => typeof r.source === 'string' && r.source.length > 5);
  assert(allHaveSource, 'Аудит сметы: все строки содержат реальный источник по Ярославской области');

  const allHaveMarketPrice = validRows.every(r => typeof r.marketPrice === 'number' && r.marketPrice > 0);
  assert(allHaveMarketPrice, 'Аудит сметы: все строки содержат рыночную цену ЯО');

  const allHaveDiscount = validRows.every(r => (r.unitPrice || 0) <= (r.marketPrice || 0));
  assert(allHaveDiscount, 'Аудит сметы: ставка ВОЛГАСТРОЙ 76 выгоднее рыночной (дисконт -10%)');

  const allHaveAuditFields = validRows.every(
    r => typeof r.marketMin === 'number' && typeof r.marketMax === 'number' && typeof r.assumptions === 'string'
  );
  assert(allHaveAuditFields, 'Аудит сметы: присутствуют поля marketMin, marketMax и инженерное обоснование');
}

console.log('\n🎉 ВСЕ ТЕСТЫ РАСЧЕТНОГО ДВИЖКА ПРОЙДЕНЫ УСПЕШНО!');
