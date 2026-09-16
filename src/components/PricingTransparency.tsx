import React from 'react';
import { ShieldCheck, FileSpreadsheet, Check, AlertCircle, ArrowRight } from 'lucide-react';

interface PricingTransparencyProps {
  onOpenCalc: () => void;
}

export const PricingTransparency: React.FC<PricingTransparencyProps> = ({ onOpenCalc }) => {
  const priceCards = [
    {
      title: 'Винтовые сваи с монтажом',
      norm: 'ГОСТ 8732 / СП 22',
      price: 'от 3 800 ₽',
      unit: 'за сваю под ключ',
      details: 'Свая Ø89×2500 мм + литая лопасть 250 мм + механизированное завинчивание + срезка в уровень + бетонирование ствола М300 + оголовок 200×200.',
    },
    {
      title: 'Терраса из ДПК под ключ',
      norm: 'ГОСТ 160×25 полнотелая',
      price: 'от 6 500 ₽',
      unit: 'за 1 м² с материалом',
      details: 'Доска ДПК (брашинг), нержавеющие кляймеры AISI 304, шаг лаг 38 см, сварной металлокаркас, геотекстиль и щебеночный дренажный слой.',
    },
    {
      title: 'Силовой каркас здания',
      norm: 'СП 20 (Снег 2.0 кПа)',
      price: 'от 14 000 ₽',
      unit: 'за 1 м² строения',
      details: 'Профильная труба 100×50 или сухой строганный брус 150×50 камерной сушки 12%, стропильная система, ветрозащита, огнебиозащита 1 группы.',
    },
    {
      title: 'Наружные сети (вода / кан.)',
      norm: 'Глубина 1.6–1.8 м',
      price: 'от 1 800 ₽',
      unit: 'за 1 м.п. трассы',
      details: 'Рыжая труба SN4 Ø110 или ПНД Ø32 SDR11, разработка траншеи, песчаная подушка 150 мм, уклон 2 см/м по лазеру, обратная засыпка.',
    },
    {
      title: 'Бассейн с обвязкой',
      norm: 'Aquaviva / Морозостойкий',
      price: 'от 450 000 ₽',
      unit: 'комплекс под ключ',
      details: 'Композитная чаша, клеевая обвязка трубами ПВХ, фильтровальная станция 14 м³/ч, закладные детали, утепление ППУ 50 мм, пусконаладка.',
    },
    {
      title: 'Сэндвич-панели под склад',
      norm: 'PIR / Минвата 100–120 мм',
      price: 'от 3 200 ₽',
      unit: 'за 1 м² с монтажом',
      details: 'Панели с замком Z-lock, герметизация стыков бутиловой лентой, доборные элементы, саморезы с EPDM-шайбой.',
    },
  ];

  return (
    <section id="pricing" className="py-20 bg-[#080c14] border-b border-slate-850 relative">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="max-w-3xl mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-blue-950/70 border border-blue-800/60 rounded text-xs font-mono text-blue-400 font-semibold uppercase">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Прозрачная ценовая политика
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            ОРИЕНТИРЫ ЦЕН <span className="text-blue-500">БЕЗ СКРЫТЫХ НАЦЕНОК</span>
          </h2>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            В договоре ВОЛГАСТРОЙ 76 сумма фиксируется до начала работ. Никаких «ой, тут грунт твердый, доплатите 50 000 ₽»
            или «металл подорожал». Все закупки производятся по прямым дилерским договорам с заводами.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {priceCards.map((card, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl bg-[#0b101c] border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
                  <span className="text-blue-400 font-semibold">{card.norm}</span>
                  <span>ПОД КЛЮЧ</span>
                </div>

                <h3 className="text-lg font-bold text-white mb-3">
                  {card.title}
                </h3>

                <div className="mb-4">
                  <span className="text-2xl sm:text-3xl font-black font-mono text-white">
                    {card.price}
                  </span>
                  <span className="text-xs font-mono text-slate-400 ml-2">
                    {card.unit}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {card.details}
                </p>
              </div>

              <div className="pt-4 mt-6 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
                <span className="text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> В смете без скрытых доплат
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Contract Guarantee Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-950/60 to-slate-900 border border-blue-500/30 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
              <span>Правило ВОЛГАСТРОЙ 76: «Смета в договоре окончательная»</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Все риски непредвиденных расходов на объекте (погодные условия, корректировка инструмента, поставки)
              мы берем на себя. Вы платите ровно ту сумму, которая согласована и подписана в приложении к договору.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenCalc}
            className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-mono font-bold uppercase tracking-wider shrink-0 transition-all shadow-lg shadow-blue-950/50 flex items-center gap-2"
          >
            <span>Рассчитать точную смету</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};
