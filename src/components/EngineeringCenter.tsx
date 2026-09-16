import React, { useState } from 'react';
import { Cpu, CheckCircle2, ChevronRight, Layers, Ruler, ShieldCheck, Thermometer } from 'lucide-react';

export const EngineeringCenter: React.FC = () => {
  const [activeSchema, setActiveSchema] = useState<'pile' | 'wall' | 'pool' | 'nets'>('pile');

  const schemas = [
    {
      id: 'pile',
      title: 'Винтовая свая в грунтах ЯО',
      subtitle: 'Несущая способность и глубина промерзания',
    },
    {
      id: 'wall',
      title: 'Пирог стены каркаса',
      subtitle: 'Вентилируемый контур и пароизоляция',
    },
    {
      id: 'pool',
      title: 'Терраса вокруг бассейна',
      subtitle: 'Двойная обрешетка ДПК и дренаж',
    },
    {
      id: 'nets',
      title: 'Инженерные сети 1.6–1.8 м',
      subtitle: 'Бесперебойная работа в морозы -35°C',
    },
  ];

  return (
    <section id="engineering-center" className="py-20 bg-[#060a12] border-b border-slate-850 relative">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="max-w-3xl mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-blue-950/70 border border-blue-800/60 rounded text-xs font-mono text-blue-400 font-semibold uppercase">
            <Cpu className="w-3.5 h-3.5" />
            Инженерный центр ВОЛГАСТРОЙ 76
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            ТЕХНИЧЕСКИЕ СХЕМЫ <span className="text-blue-500">И УЗЛЫ</span>
          </h2>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Мы не строим «на глаз». Каждый узел проектируется под суглинки и снеговые мешки Ярославской области
            по действующим строительным нормам и правилам (СНиП / СП 20 / СП 22).
          </p>
        </div>

        {/* Schema Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-8">
          {schemas.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveSchema(s.id as any)}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                activeSchema === s.id
                  ? 'bg-slate-900 border-blue-500 text-white shadow-lg shadow-blue-950/40'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <div className="text-xs font-mono font-bold text-white mb-0.5">{s.title}</div>
              <div className="text-[11px] text-slate-400 truncate">{s.subtitle}</div>
            </button>
          ))}
        </div>

        {/* Interactive Diagram Card */}
        <div className="bg-[#0b101c] border border-slate-800 rounded-2xl p-6 lg:p-8 backdrop-blur-sm">
          {/* 1. SCREW PILE SCHEME */}
          {activeSchema === 'pile' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 bg-[#05080f] border border-slate-800 p-6 rounded-xl font-mono text-xs space-y-4">
                <div className="text-blue-400 font-bold uppercase tracking-wider text-[11px] pb-2 border-b border-slate-800">
                  УЗЕЛ 01 // ВИНТОВАЯ СВАЯ С БЕТОНИРОВАНИЕМ В СУГЛИНКАХ
                </div>

                {/* Visual Schematic Diagram */}
                <div className="space-y-2 py-2">
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-700 flex justify-between items-center">
                    <span className="text-slate-200">Огоровок 200×200 + Швеллер 140</span>
                    <span className="text-blue-400">+0.40 м над грунтом</span>
                  </div>
                  <div className="h-4 border-l-2 border-dashed border-blue-500 ml-6" />

                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex justify-between items-center text-amber-300">
                    <span>Поверхность грунта (суглинок ЯО)</span>
                    <span>Отметка 0.00 м</span>
                  </div>

                  <div className="p-2 rounded bg-red-950/30 border border-red-900/40 text-red-300 text-[11px] flex justify-between">
                    <span>Нормативная глубина промерзания (СП 131.13330)</span>
                    <span className="font-bold">1.45 м</span>
                  </div>

                  <div className="h-6 border-l-2 border-blue-500 ml-6" />

                  <div className="p-3 rounded bg-blue-950/60 border border-blue-600 text-white flex justify-between items-center">
                    <div>
                      <div className="font-bold text-blue-300">Несущий пласт плотного грунта</div>
                      <div className="text-[10px] text-slate-400">Ствол Ø89×4.0 мм + Литая лопасть 250 мм</div>
                    </div>
                    <span className="text-emerald-400 font-bold">2.50 – 3.00 м</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                  Бетонирование ствола раствором М300 вытесняет кислород, предотвращая внутреннюю коррозию стали на 50+ лет.
                </div>
              </div>

              <div className="lg:col-span-5 space-y-4">
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Почему сваи ВОЛГАСТРОЙ 76 не выдавливает морозным пучением?
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  Почти вся Ярославская область — это водонасыщенные глины и суглинки.
                  Если закрутить сваю на 1.5 метра, весной её выпрет пучением.
                  Мы закручиваем сваи на глубину не менее 2.5 м — глубоко за горизонт промерзания,
                  где лопасть работает как неизвлекаемый анкер с несущей способностью до 4.5 тонн на одну опору.
                </p>

                <div className="space-y-2 pt-2 text-xs font-mono">
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Толщина стенки трубы 4.0 мм (ГОСТ 8732)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Двухкомпонентная эпоксидная антикоррозия</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Нивелирование горизонта с точностью ±2 мм</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. WALL PIE SCHEME */}
          {activeSchema === 'wall' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 bg-[#05080f] border border-slate-800 p-6 rounded-xl font-mono text-xs space-y-3">
                <div className="text-blue-400 font-bold uppercase tracking-wider text-[11px] pb-2 border-b border-slate-800">
                  УЗЕЛ 02 // ЭНЕРГОЭФФЕКТИВНЫЙ ПИРОГ СТЕНЫ (200 ММ УТЕПЛЕНИЯ)
                </div>

                <div className="space-y-1.5">
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300 flex justify-between">
                    <span>1. Наружная фасадная отделка (сайдинг / имитация бруса)</span>
                    <span className="text-blue-400">20 мм</span>
                  </div>
                  <div className="p-2 rounded bg-slate-950 border border-slate-800 text-slate-400 flex justify-between">
                    <span>2. Вентилируемый зазор (контрбрус 50×30)</span>
                    <span className="text-blue-400">30 мм</span>
                  </div>
                  <div className="p-2 rounded bg-blue-950/40 border border-blue-800/60 text-blue-300 flex justify-between">
                    <span>3. Ветровлагозащитная паропроницаемая мембрана Tyvek</span>
                    <span className="text-emerald-400">SD 0.02м</span>
                  </div>
                  <div className="p-3 rounded bg-amber-950/40 border border-amber-800/60 text-amber-200 flex justify-between font-bold">
                    <span>4. Несущий каркас 150×50 + Базальтовый утеплитель Rockwool</span>
                    <span>150 мм</span>
                  </div>
                  <div className="p-2 rounded bg-amber-950/20 border border-amber-900/40 text-amber-300 flex justify-between">
                    <span>5. Перекрестное утепление (устранение мостиков холода)</span>
                    <span>+50 мм</span>
                  </div>
                  <div className="p-2 rounded bg-cyan-950/40 border border-cyan-800/60 text-cyan-300 flex justify-between">
                    <span>6. Пароизоляционная пленка 200 мкм с проклейкой скотчем Delta</span>
                    <span className="text-emerald-400">Герметично</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300 flex justify-between">
                    <span>7. Внутренняя обрешетка под кабель-каналы и чистовую отделку</span>
                    <span className="text-blue-400">25 мм</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 space-y-4">
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Никакого конденсата в утеплителе и сквозняков
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  Мы строго соблюдаем физику здания: паропроницаемость слоев возрастает изнутри наружу.
                  Влага из помещения блокируется сертифицированной пароизоляцией 200 мкм с проклейкой всех нахлестов,
                  а перекрестный каркас 50 мм полностью исключает промерзание через стойки.
                </p>

                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono space-y-1">
                  <div className="text-slate-400">СОПРОТИВЛЕНИЕ ТЕПЛОПЕРЕДАЧЕ:</div>
                  <div className="text-emerald-400 font-bold text-sm">R = 4.2 м²·°С/Вт</div>
                  <div className="text-[10px] text-slate-400">Норма для Ярославля 3.15 м²·°С/Вт (+33% запаса)</div>
                </div>
              </div>
            </div>
          )}

          {/* 3. POOL DECK SCHEME */}
          {activeSchema === 'pool' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 bg-[#05080f] border border-slate-800 p-6 rounded-xl font-mono text-xs space-y-3">
                <div className="text-blue-400 font-bold uppercase tracking-wider text-[11px] pb-2 border-b border-slate-800">
                  УЗЕЛ 03 // ПРИБАССЕЙНОВАЯ ТЕРРАСА НА СВАЙНОМ ОСНОВАНИИ
                </div>

                <div className="space-y-2">
                  <div className="p-2.5 rounded bg-amber-950/40 border border-amber-800/60 text-amber-300 flex justify-between">
                    <span>Полнотелая доска ДПК 160×25 с антискользящим брашингом</span>
                    <span className="font-bold">Зазор 4 мм</span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-slate-300 flex justify-between">
                    <span>Скрытый нержавеющий кляймер AISI 304</span>
                    <span>Без саморезов насквозь</span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-slate-400 flex justify-between">
                    <span>Алюминиевая / композитная лага сечением 40×50 мм</span>
                    <span className="text-blue-400">Шаг 380 мм</span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-slate-300 flex justify-between">
                    <span>Сварной стальной ростверк из швеллера 140 с антикоррозией</span>
                    <span>Жесткая рама</span>
                  </div>
                  <div className="p-2.5 rounded bg-blue-950/50 border border-blue-800 text-blue-300 flex justify-between">
                    <span>Геотекстиль плотностью 200 г/м² + отсыпка мытым щебнем фр. 5-20</span>
                    <span>Дренаж под настилом</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 space-y-4">
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Стабильность геометрии при любой влажности и морозе
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  Вокруг чаши бассейна действуют экстремальные условия: хлорированная вода, брызги, обледенение зимой.
                  Мы используем полнотелый композит ДПК с шагом лаг не более 38 см (вместо стандартных 50 см, где доска «гуляет»),
                  а под настилом формируем правильный дренажный уклон и песчано-щебеночную подушку.
                </p>
              </div>
            </div>
          )}

          {/* 4. NETS SCHEME */}
          {activeSchema === 'nets' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 bg-[#05080f] border border-slate-800 p-6 rounded-xl font-mono text-xs space-y-3">
                <div className="text-blue-400 font-bold uppercase tracking-wider text-[11px] pb-2 border-b border-slate-800">
                  УЗЕЛ 04 // ТРАНШЕЙНАЯ ПРОКЛАДКА СЕТЕЙ НИЖЕ 1.6 МЕТРА
                </div>

                <div className="space-y-2">
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300 flex justify-between">
                    <span>Отметка грунта 0.00 м (газон, благоустройство)</span>
                    <span>Планировка</span>
                  </div>
                  <div className="p-2 rounded bg-red-950/30 border border-red-900/50 text-red-300 flex justify-between">
                    <span>Зона сезонного промерзания грунта (0.00 – 1.45 м)</span>
                    <span className="font-bold">Опасная зона</span>
                  </div>
                  <div className="p-2.5 rounded bg-blue-950/60 border border-blue-600 text-white flex justify-between">
                    <span>Труба ПНД Ø32 в энергофлексе 13 мм + саморегулирующийся кабель</span>
                    <span className="font-bold text-blue-300">1.60 – 1.80 м</span>
                  </div>
                  <div className="p-2.5 rounded bg-orange-950/50 border border-orange-800/60 text-orange-200 flex justify-between">
                    <span>Труба канализации SN4 Ø110 на песчаной подушке 150 мм</span>
                    <span className="font-bold text-orange-400">Уклон строго 2 см/м</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 space-y-4">
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Лазерный контроль уклона и исполнительная геодезия
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  Водопровод закладывается на глубину 1.7–1.8 м — ниже границы промерзания.
                  На выходе из земли монтируется резервный саморегулирующийся нагревательный кабель Raychem.
                  Канализация укладывается по оптическому нивелиру строго 20 мм на 1 метр длины:
                  это обеспечивает оптимальную скорость самоочищения потока без заиливания.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
