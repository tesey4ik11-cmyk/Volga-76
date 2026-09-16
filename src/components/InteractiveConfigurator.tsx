import React, { useState, useMemo } from 'react';
import { ConfiguratorState, ServiceCategory } from '../types';
import { calculateEstimate, formatRuble } from '../lib/calcEngine';
import { ObjectViewer3D, Dynamic3DOptions } from './ObjectViewer3D';
import { exportEstimateExcel, downloadCommercialProposalPdf } from '../lib/exportEstimate';
import {
  Calculator,
  Layers,
  Check,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Download,
  Printer,
  Info,
  ShieldAlert,
} from 'lucide-react';

interface InteractiveConfiguratorProps {
  initialCategory?: ServiceCategory;
  onOpenEstimateModal: (calculatedTitle: string, totalCost: number, summaryText: string) => void;
}

export const InteractiveConfigurator: React.FC<InteractiveConfiguratorProps> = ({
  initialCategory = 'house',
  onOpenEstimateModal,
}) => {
  const [config, setConfig] = useState<ConfiguratorState>({
    category: initialCategory,
    // House
    houseArea: 54,
    houseKit: 'turnkey',
    houseMaterial: 'metal',
    houseFund: true,
    houseCrane: true,
    houseMatInclude: true,

    // Pool
    poolPavilion: 'poly',
    poolPipe: true,
    poolTech: true,
    poolDeck: true,

    // Deck
    deckArea: 42,
    deckLayout: 'straight',
    deckSteps: 3,
    deckPiles: true,
    deckRail: true,

    // Pile
    pileCount: 20,
    pileDia: '89',
    pileRostverk: true,
    pileFill: true,

    // Net
    netLength: 45,
    netType: 'both',
    netDeep: true,
    netWells: 2,
    netHasWells: true,
    netWellsCount: 2,
    netHeating: false,
    netHeatingLength: 25,
    netHeatingChambers: true,
    netHeatingChambersCount: 1,
    netStorm: false,
    netStormLength: 30,
    netStormInlets: true,
    netStormInletsCount: 2,

    // Finish
    finishArea: 50,
    finishLevel: 'full',
    finishFloor: true,
    finishWarm: true,
    finishElectric: true,
  });

  const [showBreakdown, setShowBreakdown] = useState(false);
  const [breakdownFilter, setBreakdownFilter] = useState<'all' | 'w' | 'm'>('all');

  const estimate = useMemo(() => calculateEstimate(config), [config]);

  const viewerOptions = useMemo<Dynamic3DOptions>(() => {
    if (config.category === 'house') {
      const aspect = 1.33;
      const w = Math.round(Math.sqrt(config.houseArea * aspect) * 10) / 10;
      const d = Math.round((config.houseArea / w) * 10) / 10;
      return {
        category: 'house',
        metal: config.houseMaterial === 'metal',
        turnkey: config.houseKit === 'turnkey',
        w,
        d,
        h: 2.7,
        hasPiles: config.houseFund,
      };
    }
    if (config.category === 'pool') {
      return {
        category: 'pool',
        w: 5.2,
        d: 3.2,
        deck: config.poolDeck,
        pavilion: config.poolPavilion !== 'none',
        poolPavilion: config.poolPavilion,
        techRoom: config.poolTech,
      };
    }
    if (config.category === 'deck') {
      const aspect = 1.4;
      const w = Math.round(Math.sqrt(config.deckArea * aspect) * 10) / 10;
      const d = Math.round((config.deckArea / w) * 10) / 10;
      return {
        category: 'deck',
        w,
        d,
        railing: config.deckRail,
        hasSteps: (config.deckSteps || 0) > 0,
        hasPiles: config.deckPiles,
        deckLayout: config.deckLayout,
      };
    }
    if (config.category === 'pile') {
      return {
        category: 'pile',
        pilesCount: config.pileCount,
        w: 6.0,
        d: 5.0,
        pileDia: config.pileDia,
        hasRostverk: config.pileRostverk,
      };
    }
    if (config.category === 'net') {
      return {
        category: 'net',
        networkType: config.netType,
        hasWells: config.netHasWells,
        wellsCount: config.netWellsCount,
        hasHeating: config.netHeating,
        heatingChambersCount: config.netHeatingChambersCount,
        hasStorm: config.netStorm,
        stormInletsCount: config.netStormInletsCount,
      };
    }
    if (config.category === 'finish') {
      return {
        category: 'finish',
        finishLevel: config.finishLevel,
        finishFloor: config.finishFloor,
        finishWarm: config.finishWarm,
        finishElectric: config.finishElectric,
      };
    }
    return {
      category: 'house',
    };
  }, [config]);

  const tabs: { id: ServiceCategory; label: string }[] = [
    { id: 'house', label: 'Дом / Здание' },
    { id: 'pool', label: 'Бассейн' },
    { id: 'deck', label: 'Терраса ДПК' },
    { id: 'pile', label: 'Свайное поле' },
    { id: 'net', label: 'Инженерные сети' },
    { id: 'finish', label: 'Отделка' },
  ];

  const handleTabChange = (cat: ServiceCategory) => {
    setConfig((prev) => ({ ...prev, category: cat }));
  };

  const handleGetEstimate = () => {
    const summary = `${estimate.title} (${estimate.subtitle}): ${formatRuble(estimate.totalCost)}`;
    onOpenEstimateModal(estimate.title, estimate.totalCost, summary);
  };

  return (
    <section id="configurator" className="py-20 bg-[#080c14] border-b border-slate-850 relative">
      <div className="max-w-7xl mx-auto px-4">
        {/* Section Header */}
        <div className="max-w-3xl mb-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-blue-950/70 border border-blue-800/60 rounded text-xs font-mono text-blue-400 font-semibold uppercase">
            <Calculator className="w-3.5 h-3.5" />
            Интерактивный конфигуратор объекта
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            СОБЕРИТЕ <span className="text-blue-500">СВОЙ ОБЪЕКТ</span>
          </h2>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Выберите направление, настройте габариты и комплектацию. Смета пересчитывается в реальном времени,
            раскладывая работу и закупку материалов по государственным нормативам и реальным расценкам 2026 года.
          </p>
        </div>

        {/* Category Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-800 pb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-mono font-bold transition-all ${
                config.category === tab.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 border border-blue-400/40'
                  : 'bg-slate-900/70 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main Configurator Layout: Controls Left, 3D & Estimate Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Controls Column (Left, 6 cols) */}
          <div className="lg:col-span-6 space-y-6 bg-slate-900/60 border border-slate-800 p-6 rounded-xl backdrop-blur-sm">
            {/* 1. HOUSE CONFIG */}
            {config.category === 'house' && (
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-mono text-slate-300 uppercase tracking-wider">
                      Площадь строения по осям
                    </label>
                    <span className="text-sm font-mono font-bold text-blue-400 bg-blue-950/80 px-2.5 py-0.5 rounded border border-blue-800">
                      {config.houseArea} м²
                    </span>
                  </div>
                  <input
                    type="range"
                    min={18}
                    max={250}
                    step={2}
                    value={config.houseArea}
                    onChange={(e) => setConfig({ ...config, houseArea: Number(e.target.value) })}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between text-[11px] font-mono text-slate-400 mt-1">
                    <span>18 м² (пристройка)</span>
                    <span>54 м²</span>
                    <span>120 м²</span>
                    <span>250 м²</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-mono text-slate-300 uppercase tracking-wider">
                    Материал каркаса
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, houseMaterial: 'metal' })}
                      className={`p-3 rounded-lg border text-left text-xs font-mono transition-all ${
                        config.houseMaterial === 'metal'
                          ? 'border-blue-500 bg-blue-950/60 text-white font-bold'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="text-white font-semibold">Металлокаркас</div>
                      <div className="text-[11px] text-slate-400">Проф. труба + сэндвич-панели</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, houseMaterial: 'wood' })}
                      className={`p-3 rounded-lg border text-left text-xs font-mono transition-all ${
                        config.houseMaterial === 'wood'
                          ? 'border-blue-500 bg-blue-950/60 text-white font-bold'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="text-white font-semibold">Деревянный каркас</div>
                      <div className="text-[11px] text-slate-400">Сухой строганный брус 150×50</div>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-mono text-slate-300 uppercase tracking-wider">
                    Комплектация
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, houseKit: 'turnkey' })}
                      className={`p-3 rounded-lg border text-left text-xs font-mono transition-all ${
                        config.houseKit === 'turnkey'
                          ? 'border-blue-500 bg-blue-950/60 text-white font-bold'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="text-white font-semibold">Под ключ</div>
                      <div className="text-[11px] text-slate-400">С утеплением, окнами, дверями</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, houseKit: 'frame' })}
                      className={`p-3 rounded-lg border text-left text-xs font-mono transition-all ${
                        config.houseKit === 'frame'
                          ? 'border-blue-500 bg-blue-950/60 text-white font-bold'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="text-white font-semibold">Силовая коробка</div>
                      <div className="text-[11px] text-slate-400">Каркас, кровля, черновой контур</div>
                    </button>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-xs font-mono text-slate-300 uppercase tracking-wider">
                    Дополнительные опции в смету
                  </span>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-2.5 rounded bg-slate-950/60 border border-slate-800 text-xs font-mono text-slate-200 cursor-pointer hover:border-slate-700">
                      <input
                        type="checkbox"
                        checked={config.houseFund}
                        onChange={(e) => setConfig({ ...config, houseFund: e.target.checked })}
                        className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 w-4 h-4 bg-slate-900"
                      />
                      <span>Свайный фундамент Ø89 с ростверком по осям</span>
                    </label>
                    <label className="flex items-center gap-3 p-2.5 rounded bg-slate-950/60 border border-slate-800 text-xs font-mono text-slate-200 cursor-pointer hover:border-slate-700">
                      <input
                        type="checkbox"
                        checked={config.houseCrane}
                        onChange={(e) => setConfig({ ...config, houseCrane: e.target.checked })}
                        className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 w-4 h-4 bg-slate-900"
                      />
                      <span>Доставка манипулятором 7т и разгрузка на участке</span>
                    </label>
                    <label className="flex items-center gap-3 p-2.5 rounded bg-slate-950/60 border border-slate-800 text-xs font-mono text-slate-200 cursor-pointer hover:border-slate-700">
                      <input
                        type="checkbox"
                        checked={config.houseMatInclude}
                        onChange={(e) => setConfig({ ...config, houseMatInclude: e.target.checked })}
                        className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 w-4 h-4 bg-slate-900"
                      />
                      <span>Включить материалы (закупка по оптовым ценам производителей)</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 2. POOL CONFIG */}
            {config.category === 'pool' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <span className="text-xs font-mono text-slate-300 uppercase tracking-wider">
                    Защитный павильон
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'none', label: 'Без павильона', price: '0 ₽' },
                      { id: 'poly', label: 'Поликарбонат', price: '+180 000 ₽' },
                      { id: 'slide', label: 'Раздвижной', price: '+320 000 ₽' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setConfig({ ...config, poolPavilion: opt.id as any })}
                        className={`p-2.5 rounded-lg border text-left text-xs font-mono ${
                          config.poolPavilion === opt.id
                            ? 'border-blue-500 bg-blue-950/60 text-white font-bold'
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div>{opt.label}</div>
                        <div className="text-[10px] text-slate-400">{opt.price}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-xs font-mono text-slate-300 uppercase tracking-wider">
                    Инженерная комплектация
                  </span>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-2.5 rounded bg-slate-950/60 border border-slate-800 text-xs font-mono text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.poolPipe}
                        onChange={(e) => setConfig({ ...config, poolPipe: e.target.checked })}
                        className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 w-4 h-4 bg-slate-900"
                      />
                      <span>Клеевая обвязка ПВХ Aquaviva + станция песчаной фильтрации</span>
                    </label>
                    <label className="flex items-center gap-3 p-2.5 rounded bg-slate-950/60 border border-slate-800 text-xs font-mono text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.poolTech}
                        onChange={(e) => setConfig({ ...config, poolTech: e.target.checked })}
                        className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 w-4 h-4 bg-slate-900"
                      />
                      <span>Техпомещение: накопительные ёмкости, автоматика, дренаж</span>
                    </label>
                    <label className="flex items-center gap-3 p-2.5 rounded bg-slate-950/60 border border-slate-800 text-xs font-mono text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.poolDeck}
                        onChange={(e) => setConfig({ ...config, poolDeck: e.target.checked })}
                        className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 w-4 h-4 bg-slate-900"
                      />
                      <span>Прибассейновая терраса ДПК 50 м² с каркасом и ступенями</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 3. DECK CONFIG */}
            {config.category === 'deck' && (
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-mono text-slate-300 uppercase tracking-wider">
                      Площадь настила террасы
                    </label>
                    <span className="text-sm font-mono font-bold text-blue-400 bg-blue-950/80 px-2.5 py-0.5 rounded border border-blue-800">
                      {config.deckArea} м²
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={200}
                    step={2}
                    value={config.deckArea}
                    onChange={(e) => setConfig({ ...config, deckArea: Number(e.target.value) })}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between text-[11px] font-mono text-slate-400 mt-1">
                    <span>10 м²</span>
                    <span>42 м²</span>
                    <span>100 м²</span>
                    <span>200 м²</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-mono text-slate-300 uppercase tracking-wider">
                    Схема укладки доски ДПК
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, deckLayout: 'straight' })}
                      className={`p-3 rounded-lg border text-left text-xs font-mono ${
                        config.deckLayout === 'straight'
                          ? 'border-blue-500 bg-blue-950/60 text-white font-bold'
                          : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      <div className="text-white font-semibold">Прямая раскладка</div>
                      <div className="text-[11px] text-slate-400">1 000 ₽/м² · зазор 4 мм</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, deckLayout: 'diag' })}
                      className={`p-3 rounded-lg border text-left text-xs font-mono ${
                        config.deckLayout === 'diag'
                          ? 'border-blue-500 bg-blue-950/60 text-white font-bold'
                          : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      <div className="text-white font-semibold">Диагональная 45°</div>
                      <div className="text-[11px] text-slate-400">1 300 ₽/м² · увеличенный запас</div>
                    </button>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-xs font-mono text-slate-300 uppercase tracking-wider">
                    Конструктив основания и ограждения
                  </span>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-2.5 rounded bg-slate-950/60 border border-slate-800 text-xs font-mono text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.deckPiles}
                        onChange={(e) => setConfig({ ...config, deckPiles: e.target.checked })}
                        className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 w-4 h-4 bg-slate-900"
                      />
                      <span>Свайный фундамент на винтовых сваях Ø76/89 под террасу</span>
                    </label>
                    <label className="flex items-center gap-3 p-2.5 rounded bg-slate-950/60 border border-slate-800 text-xs font-mono text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.deckRail}
                        onChange={(e) => setConfig({ ...config, deckRail: e.target.checked })}
                        className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 w-4 h-4 bg-slate-900"
                      />
                      <span>Модульное ограждение и перила из композита ДПК</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 4. PILES CONFIG */}
            {config.category === 'pile' && (
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-mono text-slate-300 uppercase tracking-wider">
                      Количество винтовых свай
                    </label>
                    <span className="text-sm font-mono font-bold text-blue-400 bg-blue-950/80 px-2.5 py-0.5 rounded border border-blue-800">
                      {config.pileCount} шт
                    </span>
                  </div>
                  <input
                    type="range"
                    min={6}
                    max={64}
                    step={2}
                    value={config.pileCount}
                    onChange={(e) => setConfig({ ...config, pileCount: Number(e.target.value) })}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between text-[11px] font-mono text-slate-400 mt-1">
                    <span>6 шт (беседка)</span>
                    <span>16 шт (дом 6×8)</span>
                    <span>32 шт</span>
                    <span>64 шт</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-mono text-slate-300 uppercase tracking-wider">
                    Диаметр ствола сваи
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: '76', label: 'Ø76 мм', sub: 'Террасы, беседки, навесы' },
                      { id: '89', label: 'Ø89 мм', sub: 'Каркасники, бани, бассейны' },
                      { id: '108', label: 'Ø108 мм', sub: 'Дома из бруса и блоков' },
                      { id: '133', label: 'Ø133 мм', sub: 'Тяжелые дома и ангары' },
                    ].map((pOpt) => (
                      <button
                        key={pOpt.id}
                        type="button"
                        onClick={() => setConfig({ ...config, pileDia: pOpt.id as any })}
                        className={`p-2.5 rounded-lg border text-left text-xs font-mono transition-all ${
                          config.pileDia === pOpt.id
                            ? 'border-blue-500 bg-blue-950/60 text-white font-bold'
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="text-white font-semibold">{pOpt.label}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{pOpt.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-xs font-mono text-slate-300 uppercase tracking-wider">
                    Обработка и обвязка
                  </span>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-2.5 rounded bg-slate-950/60 border border-slate-800 text-xs font-mono text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.pileFill}
                        onChange={(e) => setConfig({ ...config, pileFill: e.target.checked })}
                        className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 w-4 h-4 bg-slate-900"
                      />
                      <span>Бетонирование полостей раствором М300 (защита от внутренней коррозии)</span>
                    </label>
                    <label className="flex items-center gap-3 p-2.5 rounded bg-slate-950/60 border border-slate-800 text-xs font-mono text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.pileRostverk}
                        onChange={(e) => setConfig({ ...config, pileRostverk: e.target.checked })}
                        className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 w-4 h-4 bg-slate-900"
                      />
                      <span>Обвязка стальным швеллером 140 по лазерному горизонту</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 5. NETS CONFIG */}
            {config.category === 'net' && (
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-mono text-slate-300 uppercase tracking-wider">
                      Длина трассы траншеи
                    </label>
                    <span className="text-sm font-mono font-bold text-blue-400 bg-blue-950/80 px-2.5 py-0.5 rounded border border-blue-800">
                      {config.netLength} м.п.
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={150}
                    step={5}
                    value={config.netLength}
                    onChange={(e) => setConfig({ ...config, netLength: Number(e.target.value) })}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between text-[11px] font-mono text-slate-400 mt-1">
                    <span>10 м</span>
                    <span>45 м</span>
                    <span>90 м</span>
                    <span>150 м</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-mono text-slate-300 uppercase tracking-wider">
                    Тип прокладываемой коммуникации
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    {[
                      { id: 'both', label: 'Канализация + Вода', sub: 'В одной траншее' },
                      { id: 'k1', label: 'Бытовая канализация', sub: 'Рыжая SN4 Ø110' },
                      { id: 'water', label: 'Водопровод питьевой', sub: 'ПНД ПЭ-100 Ø32' },
                      { id: 'heating', label: 'Теплосети и отопление', sub: 'Трубы ППУ-изоляция' },
                      { id: 'storm', label: 'Ливневая канализация', sub: 'Труба SN8 Ø160/200' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setConfig({ ...config, netType: opt.id as any })}
                        className={`p-2.5 rounded-lg border text-left text-xs font-mono transition-all ${
                          config.netType === opt.id
                            ? 'border-blue-500 bg-blue-950/60 text-white font-bold'
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="font-semibold">{opt.label}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{opt.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <span className="text-xs font-mono text-slate-300 uppercase tracking-wider">
                    Комплектация и узлы сетей
                  </span>

                  {/* Primary option for Heating */}
                  {config.netType === 'heating' && (
                    <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-3 text-xs font-mono text-slate-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.netHeatingChambers}
                            onChange={(e) => setConfig({ ...config, netHeatingChambers: e.target.checked })}
                            className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 w-4 h-4 bg-slate-900"
                          />
                          <span>Тепловые камеры УТ с запорными шаровыми кранами</span>
                        </label>
                        {config.netHeatingChambers && (
                          <div className="flex items-center gap-1.5 font-mono text-xs">
                            <span className="text-slate-400 text-[11px]">Кол-во:</span>
                            <input
                              type="number"
                              min={1}
                              max={6}
                              value={config.netHeatingChambersCount}
                              onChange={(e) => setConfig({ ...config, netHeatingChambersCount: Math.max(1, Math.min(6, Number(e.target.value))) })}
                              className="w-14 px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-center text-blue-400 font-bold"
                            />
                            <span className="text-slate-400 text-[11px]">шт</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Primary option for Stormwater */}
                  {config.netType === 'storm' && (
                    <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-3 text-xs font-mono text-slate-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.netStormInlets}
                            onChange={(e) => setConfig({ ...config, netStormInlets: e.target.checked })}
                            className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 w-4 h-4 bg-slate-900"
                          />
                          <span>Дождеприемные колодцы с чугунной щелевой решеткой</span>
                        </label>
                        {config.netStormInlets && (
                          <div className="flex items-center gap-1.5 font-mono text-xs">
                            <span className="text-slate-400 text-[11px]">Кол-во:</span>
                            <input
                              type="number"
                              min={1}
                              max={8}
                              value={config.netStormInletsCount}
                              onChange={(e) => setConfig({ ...config, netStormInletsCount: Math.max(1, Math.min(8, Number(e.target.value))) })}
                              className="w-14 px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-center text-blue-400 font-bold"
                            />
                            <span className="text-slate-400 text-[11px]">шт</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Primary option for Sewer / Water / Both */}
                  {(config.netType === 'both' || config.netType === 'k1' || config.netType === 'water') && (
                    <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-3 text-xs font-mono text-slate-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.netHasWells}
                            onChange={(e) => setConfig({ ...config, netHasWells: e.target.checked })}
                            className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 w-4 h-4 bg-slate-900"
                          />
                          <span>Смотровые ж/б колодцы КС 10-9 с чугунными люками</span>
                        </label>
                        {config.netHasWells && (
                          <div className="flex items-center gap-1.5 font-mono text-xs">
                            <span className="text-slate-400 text-[11px]">Кол-во:</span>
                            <input
                              type="number"
                              min={1}
                              max={6}
                              value={config.netWellsCount}
                              onChange={(e) => setConfig({ ...config, netWellsCount: Math.max(1, Math.min(6, Number(e.target.value))) })}
                              className="w-14 px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-center text-blue-400 font-bold"
                            />
                            <span className="text-slate-400 text-[11px]">шт</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Companion Heating network for non-heating main types */}
                  {config.netType !== 'heating' && (
                    <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800 space-y-2">
                      <label className="flex items-center gap-3 text-xs font-mono text-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.netHeating}
                          onChange={(e) => setConfig({ ...config, netHeating: e.target.checked })}
                          className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 w-4 h-4 bg-slate-900"
                        />
                        <span>Сопутствующая теплотрасса отопления и ГВС (ППУ-изоляция)</span>
                      </label>
                      {config.netHeating && (
                        <div className="pl-7 space-y-2 pt-1 border-t border-slate-800/80">
                          <div className="flex justify-between items-center text-xs font-mono">
                            <span className="text-slate-400">Длина теплотрассы:</span>
                            <span className="text-blue-400 font-bold">{config.netHeatingLength} м.п.</span>
                          </div>
                          <input
                            type="range"
                            min={10}
                            max={100}
                            step={5}
                            value={config.netHeatingLength}
                            onChange={(e) => setConfig({ ...config, netHeatingLength: Number(e.target.value) })}
                            className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-blue-500"
                          />
                          <div className="flex items-center justify-between pt-1">
                            <label className="flex items-center gap-2 text-xs font-mono text-slate-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={config.netHeatingChambers}
                                onChange={(e) => setConfig({ ...config, netHeatingChambers: e.target.checked })}
                                className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 bg-slate-900"
                              />
                              <span>Тепловые камеры УТ с арматурой</span>
                            </label>
                            {config.netHeatingChambers && (
                              <div className="flex items-center gap-1 font-mono text-xs">
                                <input
                                  type="number"
                                  min={1}
                                  max={4}
                                  value={config.netHeatingChambersCount}
                                  onChange={(e) => setConfig({ ...config, netHeatingChambersCount: Math.max(1, Math.min(4, Number(e.target.value))) })}
                                  className="w-12 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-center text-blue-400 font-bold"
                                />
                                <span className="text-slate-400 text-[10px]">шт</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Companion Storm sewer for non-storm main types */}
                  {config.netType !== 'storm' && (
                    <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800 space-y-2">
                      <label className="flex items-center gap-3 text-xs font-mono text-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.netStorm}
                          onChange={(e) => setConfig({ ...config, netStorm: e.target.checked })}
                          className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 w-4 h-4 bg-slate-900"
                        />
                        <span>Сопутствующая дождевая (ливневая) канализация SN8</span>
                      </label>
                      {config.netStorm && (
                        <div className="pl-7 space-y-2 pt-1 border-t border-slate-800/80">
                          <div className="flex justify-between items-center text-xs font-mono">
                            <span className="text-slate-400">Длина ливневки:</span>
                            <span className="text-blue-400 font-bold">{config.netStormLength} м.п.</span>
                          </div>
                          <input
                            type="range"
                            min={10}
                            max={100}
                            step={5}
                            value={config.netStormLength}
                            onChange={(e) => setConfig({ ...config, netStormLength: Number(e.target.value) })}
                            className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-blue-500"
                          />
                          <div className="flex items-center justify-between pt-1">
                            <label className="flex items-center gap-2 text-xs font-mono text-slate-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={config.netStormInlets}
                                onChange={(e) => setConfig({ ...config, netStormInlets: e.target.checked })}
                                className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 bg-slate-900"
                              />
                              <span>Дождеприемные колодцы с чугунной решеткой</span>
                            </label>
                            {config.netStormInlets && (
                              <div className="flex items-center gap-1 font-mono text-xs">
                                <input
                                  type="number"
                                  min={1}
                                  max={6}
                                  value={config.netStormInletsCount}
                                  onChange={(e) => setConfig({ ...config, netStormInletsCount: Math.max(1, Math.min(6, Number(e.target.value))) })}
                                  className="w-12 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-center text-blue-400 font-bold"
                                />
                                <span className="text-slate-400 text-[10px]">шт</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <label className="flex items-center gap-3 p-2.5 rounded bg-slate-950/60 border border-slate-800 text-xs font-mono text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.netDeep}
                      onChange={(e) => setConfig({ ...config, netDeep: e.target.checked })}
                      className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 w-4 h-4 bg-slate-900"
                    />
                    <span>Глубокое заложение 1.6–1.8 м (ниже глубины промерзания для Ярославля)</span>
                  </label>
                </div>
              </div>
            )}

            {/* 6. FINISH CONFIG */}
            {config.category === 'finish' && (
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-mono text-slate-300 uppercase tracking-wider">
                      Площадь помещений по полу
                    </label>
                    <span className="text-sm font-mono font-bold text-blue-400 bg-blue-950/80 px-2.5 py-0.5 rounded border border-blue-800">
                      {config.finishArea} м²
                    </span>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={200}
                    step={5}
                    value={config.finishArea}
                    onChange={(e) => setConfig({ ...config, finishArea: Number(e.target.value) })}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-mono text-slate-300 uppercase tracking-wider">
                    Уровень отделки
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, finishLevel: 'full' })}
                      className={`p-3 rounded-lg border text-left text-xs font-mono ${
                        config.finishLevel === 'full'
                          ? 'border-blue-500 bg-blue-950/60 text-white font-bold'
                          : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      <div className="text-white font-semibold">Чистовая под ключ</div>
                      <div className="text-[11px] text-slate-400">9 000 ₽/м² · финишные покрытия</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, finishLevel: 'base' })}
                      className={`p-3 rounded-lg border text-left text-xs font-mono ${
                        config.finishLevel === 'base'
                          ? 'border-blue-500 bg-blue-950/60 text-white font-bold'
                          : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      <div className="text-white font-semibold">Базовая подготовка</div>
                      <div className="text-[11px] text-slate-400">4 500 ₽/м² · черновой контур</div>
                    </button>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <label className="flex items-center gap-3 p-2.5 rounded bg-slate-950/60 border border-slate-800 text-xs font-mono text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.finishFloor}
                      onChange={(e) => setConfig({ ...config, finishFloor: e.target.checked })}
                      className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 w-4 h-4 bg-slate-900"
                    />
                    <span>Укладка чистового пола (кварцвинил / ламинат 33 класса со стяжкой)</span>
                  </label>
                  <label className="flex items-center gap-3 p-2.5 rounded bg-slate-950/60 border border-slate-800 text-xs font-mono text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.finishWarm}
                      onChange={(e) => setConfig({ ...config, finishWarm: e.target.checked })}
                      className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 w-4 h-4 bg-slate-900"
                    />
                    <span>Монтаж водяного / кабельного теплого пола с датчиками</span>
                  </label>
                  <label className="flex items-center gap-3 p-2.5 rounded bg-slate-950/60 border border-slate-800 text-xs font-mono text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.finishElectric}
                      onChange={(e) => setConfig({ ...config, finishElectric: e.target.checked })}
                      className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 w-4 h-4 bg-slate-900"
                    />
                    <span>Разводка электрики ГОСТ ВВГнг-LS и сборка щита</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: 3D Visualization & Calculation Breakdown (6 cols) */}
          <div className="lg:col-span-6 space-y-6">
            {/* Real-time 3D Object Model */}
            <div className="rounded-xl overflow-hidden border border-slate-800">
              <ObjectViewer3D
                category={config.category}
                options={viewerOptions}
                showHotspots={false}
                interactive={true}
                className="h-[340px] sm:h-[380px] lg:h-[420px]"
              />
            </div>

            {/* Preliminary Estimate Box */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5 shadow-2xl">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                    ПРЕДВАРИТЕЛЬНАЯ СТОИМОСТЬ ОБЪЕКТА
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800/80">
                    ГОСТ / СП 20
                  </span>
                </div>

                <div className="mt-2 text-3xl sm:text-4xl font-black font-mono text-white tracking-tight">
                  {formatRuble(estimate.totalCost)}
                </div>

                <p className="text-xs font-mono text-slate-400 mt-1">
                  {estimate.subtitle}
                </p>
              </div>

              {/* Work vs Materials split */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800 text-xs font-mono">
                <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800/80">
                  <div className="text-slate-400 text-[11px]">РАБОТЫ И МОНТАЖ</div>
                  <div className="text-white font-bold text-sm mt-0.5">
                    {formatRuble(estimate.workCost)}
                  </div>
                </div>
                <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800/80">
                  <div className="text-slate-400 text-[11px]">МАТЕРИАЛЫ (ОПТ)</div>
                  <div className="text-blue-400 font-bold text-sm mt-0.5">
                    {formatRuble(estimate.materialCost)}
                  </div>
                </div>
              </div>

              {/* Primary Call to Action */}
              <div className="space-y-2">
                <button
                  id="btn-calc-get-estimate"
                  type="button"
                  onClick={handleGetEstimate}
                  className="w-full py-3.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm uppercase tracking-wider font-mono shadow-xl shadow-blue-950/60 transition-all flex items-center justify-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Получить расчёт и вызвать инженера</span>
                </button>

                {/* PDF & Excel direct export actions */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    id="btn-calc-download-pdf"
                    type="button"
                    onClick={() => downloadCommercialProposalPdf(estimate, config)}
                    className="py-2.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white font-mono text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                    title="Сформировать и скачать официальное коммерческое предложение в PDF"
                  >
                    <Printer className="w-3.5 h-3.5 text-blue-400" />
                    <span>Скачать КП (PDF)</span>
                  </button>

                  <button
                    id="btn-calc-export-excel"
                    type="button"
                    onClick={() => exportEstimateExcel(estimate, config)}
                    className="py-2.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white font-mono text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                    title="Экспортировать смету в формат Excel (CSV UTF-8)"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Смета в Excel</span>
                  </button>
                </div>
              </div>

              {/* Toggle detailed bill of quantities */}
              <div className="pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBreakdown(!showBreakdown)}
                  className="w-full flex items-center justify-between text-xs font-mono text-slate-400 hover:text-white py-1 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-400" />
                    {showBreakdown ? 'Скрыть детализацию сметы' : 'Показать построчную детализацию позиций'}
                  </span>
                  {showBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showBreakdown && (
                  <div className="mt-3 space-y-2">
                    {/* Filter buttons */}
                    <div className="flex gap-2 text-[11px] font-mono">
                      <button
                        type="button"
                        onClick={() => setBreakdownFilter('all')}
                        className={`px-2 py-0.5 rounded ${breakdownFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                      >
                        Все ({estimate.rows.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setBreakdownFilter('w')}
                        className={`px-2 py-0.5 rounded ${breakdownFilter === 'w' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                      >
                        Работы
                      </button>
                      <button
                        type="button"
                        onClick={() => setBreakdownFilter('m')}
                        className={`px-2 py-0.5 rounded ${breakdownFilter === 'm' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                      >
                        Материалы
                      </button>
                    </div>

                    {/* Table */}
                    <div className="max-h-72 overflow-y-auto space-y-1 pr-1 text-xs font-mono divide-y divide-slate-800/60">
                      {estimate.rows
                        .filter((r) => breakdownFilter === 'all' || r.kind === 'h' || r.kind === breakdownFilter)
                        .map((row, i) => {
                          if (row.kind === 'h') {
                            return (
                              <div key={i} className="pt-3 pb-1 text-blue-400 font-bold uppercase tracking-wider text-[11px]">
                                // {row.name}
                              </div>
                            );
                          }
                          return (
                            <div key={i} className="py-1.5 flex justify-between items-start gap-2">
                              <div>
                                <div className="text-slate-200">{row.name}</div>
                                <div className="text-[10px] text-slate-400">{row.note}</div>
                              </div>
                              <div className="text-right shrink-0 font-semibold text-slate-300">
                                {formatRuble(row.cost)}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
