import React, { useState } from 'react';
import { ObjectViewer3D } from './ObjectViewer3D';
import { TechnicalScheme2D } from './TechnicalScheme2D';
import { ServiceCategory, ConfiguratorState } from '../types';
import {
  Compass,
  CheckCircle2,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Layers,
  Sparkles,
} from 'lucide-react';

interface HeroProps {
  onOpenCalcModal: () => void;
  onSelectCategory: (cat: ServiceCategory) => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenCalcModal, onSelectCategory }) => {
  const [activeTab, setActiveTab] = useState<ServiceCategory>('house');
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');

  const categories: { id: ServiceCategory; label: string; sub: string }[] = [
    { id: 'house', label: 'ДОМ И ЗДАНИЕ', sub: 'Каркас, сэндвич, кровля' },
    { id: 'pool', label: 'БАССЕЙН', sub: 'Чаша, обвязка, павильон' },
    { id: 'deck', label: 'ТЕРРАСА', sub: 'Доска ДПК 160×25' },
    { id: 'pile', label: 'СВАЙНОЕ ПОЛЕ', sub: 'Винтовые сваи Ø89–108' },
    { id: 'net', label: 'ИНЖЕНЕРНЫЕ СЕТИ', sub: 'Канализация и вода 1.6м' },
  ];

  const hero2DConfig: ConfiguratorState = {
    category: activeTab,
    // House
    houseArea: 54,
    houseKit: 'turnkey',
    houseMaterial: 'wood',
    houseFund: true,
    houseCrane: true,
    houseMatInclude: true,

    // Pool
    poolPavilion: 'poly',
    poolPipe: true,
    poolTech: true,
    poolDeck: true,

    // Deck
    deckArea: 32,
    deckLayout: 'straight',
    deckSteps: 2,
    deckPiles: true,
    deckRail: true,

    // Pile
    pileCount: 20,
    pileDia: '108',
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
    finishArea: 54,
    finishLevel: 'full',
    finishFloor: true,
    finishWarm: true,
    finishElectric: true,
  };

  const handleCategorySwitch = (cat: ServiceCategory) => {
    setActiveTab(cat);
    onSelectCategory(cat);
  };

  return (
    <section id="hero-3d" className="relative w-full pt-6 pb-14 border-b border-slate-850 blueprint-grid overflow-hidden">
      {/* Subtle decorative radial blur */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        {/* Top Architectural Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-mono bg-blue-950/80 text-blue-400 border border-blue-800/60 font-semibold tracking-wide">
              VGS // 2026 СИСТЕМА
            </span>
            <span className="text-xs font-mono text-slate-400 hidden sm:inline">
              СТРОИТЕЛЬСТВО В ЯРОСЛАВЛЕ, РЫБИНСКЕ, ТУТАЕВЕ И ВСЕЙ ОБЛАСТИ
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5 text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              Фиксация сметы в договоре
            </span>
            <span className="hidden md:flex items-center gap-1.5 text-slate-300">
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
              СП 20.13330 (Снег IV район)
            </span>
          </div>
        </div>

        {/* Hero Grid: Main Manifesto Left, 3D Object Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Architectural Manifesto */}
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900/90 border border-slate-700/70 rounded-full text-xs font-mono text-slate-300">
                <Compass className="w-3.5 h-3.5 text-blue-400" />
                <span>ЦИФРОВОЕ ИНЖЕНЕРНОЕ БЮРО</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-black text-white tracking-tight leading-[1.08]">
                ВОЛГАСТРОЙ 76
              </h1>

              <div className="text-xl sm:text-2xl md:text-3xl font-extrabold text-blue-400 tracking-tight leading-snug">
                СТРОИМ. СЧИТАЕМ.
                <br />
                <span className="text-white">ПОКАЗЫВАЕМ РЕЗУЛЬТАТ</span> ДО НАЧАЛА РАБОТ.
              </div>
            </div>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl font-normal">
              Мы отказались от шаблонных подходов. Прежде чем закрутить первую сваю или привезти каркас,
              мы рассчитываем несущие нагрузки по нормативам Ярославской области, строим цифровую модель
              и раскладываем прозрачную смету до последнего крепежного узла.
            </p>

            {/* Direction Selector Tabs */}
            <div className="space-y-2 pt-2">
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-blue-400" />
                <span>Исследуйте объект в 3D (выберите направление):</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategorySwitch(cat.id)}
                    className={`text-left p-2.5 rounded-lg border transition-all ${
                      activeTab === cat.id
                        ? 'bg-blue-950/80 border-blue-500 text-white shadow-md shadow-blue-950/40'
                        : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-bold font-mono tracking-tight">{cat.label}</div>
                    <div className="text-[10px] text-slate-400 truncate">{cat.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-3">
              <button
                id="btn-hero-calc"
                type="button"
                onClick={onOpenCalcModal}
                className="flex items-center gap-2 px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg shadow-blue-900/40 transition-all group"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Рассчитать мой объект</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <a
                href="#sequence"
                className="flex items-center gap-2 px-4 py-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-750 text-slate-200 text-sm font-medium transition-colors"
              >
                <span>Концепция «Один подрядчик»</span>
              </a>
            </div>

            {/* Quick Fact Metrics */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-800/80 text-xs font-mono">
              <div className="p-2.5 rounded bg-slate-900/40 border border-slate-800">
                <div className="text-slate-400 text-[10px]">СПЕЦИФИКАЦИЯ</div>
                <div className="text-white font-bold text-sm mt-0.5">ГОСТ / СП 20</div>
                <div className="text-slate-400 text-[10px]">Расчёт нагрузок</div>
              </div>
              <div className="p-2.5 rounded bg-slate-900/40 border border-slate-800">
                <div className="text-slate-400 text-[10px]">СМЕТА</div>
                <div className="text-emerald-400 font-bold text-sm mt-0.5">Без скрытых</div>
                <div className="text-slate-400 text-[10px]">Фиксация в акте</div>
              </div>
              <div className="p-2.5 rounded bg-slate-900/40 border border-slate-800">
                <div className="text-slate-400 text-[10px]">ГЕОГРАФИЯ</div>
                <div className="text-blue-400 font-bold text-sm mt-0.5">Вся обл. 76</div>
                <div className="text-slate-400 text-[10px]">Выезд по области</div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive 3D / 2D Canvas Stage */}
          <div className="lg:col-span-6 relative">
            {/* Top View Mode Switcher */}
            <div className="flex items-center justify-between pb-2.5 px-1">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-semibold">Инженерный просмотр объекта:</span>
              </div>
              <div className="inline-flex rounded-lg p-0.5 bg-slate-900 border border-slate-800 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setViewMode('3d')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    viewMode === '3d'
                      ? 'bg-blue-600 text-white font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  3D Модель
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('2d')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    viewMode === '2d'
                      ? 'bg-blue-600 text-white font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  2D Чертёж (ЕСКД)
                </button>
              </div>
            </div>

            <div className="relative">
              {/* Corner Engineering Framing Markers */}
              <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-blue-500/70 z-20 pointer-events-none" />
              <div className="absolute -top-2 -right-2 w-4 h-4 border-t-2 border-r-2 border-blue-500/70 z-20 pointer-events-none" />
              <div className="absolute -bottom-2 -left-2 w-4 h-4 border-b-2 border-l-2 border-blue-500/70 z-20 pointer-events-none" />
              <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-blue-500/70 z-20 pointer-events-none" />

              {viewMode === '3d' ? (
                <ObjectViewer3D
                  category={activeTab}
                  showHotspots={true}
                  interactive={true}
                  className="h-[360px] sm:h-[440px] lg:h-[520px]"
                />
              ) : (
                <div className="h-[360px] sm:h-[440px] lg:h-[520px] bg-[#070b14] rounded-2xl border border-slate-800 overflow-hidden flex flex-col relative">
                  <TechnicalScheme2D
                    config={hero2DConfig}
                    className="w-full h-full flex-1"
                  />
                </div>
              )}
            </div>

            {/* Quick Annotation Pill */}
            <div className="mt-3 flex items-center justify-between text-xs font-mono text-slate-400 px-1">
              <span className="flex items-center gap-1 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                {viewMode === '3d'
                  ? 'Вращайте модель мышью или пальцем, изучайте узлы'
                  : 'Чертёж по ЕСКД с привязкой осей и шагов конструктива'}
              </span>
              <a href="#configurator" className="text-blue-400 hover:underline">
                Перейти в конструктор сметы →
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
