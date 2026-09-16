import React, { useState } from 'react';
import { YAROSLAVL_POINTS } from '../data/projectsData';
import { YaroslavlPoint } from '../types';
import { MapPin, Navigation, Compass, ChevronRight, CheckCircle2 } from 'lucide-react';

interface RegionMapProps {
  onSelectCityForConsult: (cityName: string) => void;
}

export const RegionMap: React.FC<RegionMapProps> = ({ onSelectCityForConsult }) => {
  const [selectedPoint, setSelectedPoint] = useState<YaroslavlPoint>(YAROSLAVL_POINTS[0]);

  const totalProjectsInRegion = YAROSLAVL_POINTS.reduce((acc, p) => acc + p.projectsCount, 0);

  return (
    <section id="region-map" className="py-20 bg-[#080c14] border-b border-slate-850 relative">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="max-w-3xl mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-blue-950/70 border border-blue-800/60 rounded text-xs font-mono text-blue-400 font-semibold uppercase">
            <Navigation className="w-3.5 h-3.5" />
            География присутствия 76 региона
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            КАРТА ОБЪЕКТОВ <span className="text-blue-500">ЯРОСЛАВСКОЙ ОБЛАСТИ</span>
          </h2>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Своя логистика, мобильные сваекруты и бригады со своим инструментом.
            Выезжаем на участки по всей области без наценок за отдаленность.
            Всего в регионе сдано уже <span className="text-white font-bold">{totalProjectsInRegion}+ объектов</span>.
          </p>
        </div>

        {/* Map and Details Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Visual Interactive Map Vector Canvas (7 cols) */}
          <div className="lg:col-span-7 bg-[#05080f] border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800/80">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-blue-400" />
                Схема покрытия городов и районов
              </span>
              <span className="text-xs font-mono text-blue-400 font-bold">
                Вся область · Радиус 200 км
              </span>
            </div>

            {/* Stylized Vector SVG Map of Yaroslavl Oblast & Volga River bend */}
            <div className="relative w-full aspect-[16/11] bg-[#090e1a] rounded-xl border border-slate-800 overflow-hidden select-none">
              {/* Grid lines */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:28px_28px]" />

              {/* Volga River path (stylized engineering flow) */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Volga River channel */}
                <path
                  d="M 20,40 Q 30,22 40,24 T 48,36 T 60,50 T 80,44"
                  fill="none"
                  stroke="#1d4ed8"
                  strokeWidth="2.4"
                  strokeOpacity="0.4"
                />
                <path
                  d="M 20,40 Q 30,22 40,24 T 48,36 T 60,50 T 80,44"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="0.8"
                  strokeDasharray="2,2"
                  strokeOpacity="0.8"
                />
                {/* Volga Water label */}
                <text x="64" y="47" fill="#60a5fa" fontSize="2.8" fontFamily="monospace" opacity="0.6">
                  р. Волга
                </text>
              </svg>

              {/* Interactive City Nodes */}
              {YAROSLAVL_POINTS.map((pt) => {
                const isSelected = selectedPoint.id === pt.id;
                return (
                  <button
                    key={pt.id}
                    type="button"
                    onClick={() => setSelectedPoint(pt)}
                    className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer focus:outline-none z-10"
                    style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
                  >
                    <div className="relative flex flex-col items-center">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-blue-500 ring-4 ring-blue-500/30 scale-125 text-white'
                            : 'bg-slate-800 border border-slate-600 group-hover:border-blue-400 text-slate-300'
                        }`}
                      >
                        <MapPin className="w-3 h-3" />
                      </div>

                      <span
                        className={`mt-1 px-1.5 py-0.5 rounded text-[10px] font-mono tracking-tight transition-colors whitespace-nowrap ${
                          isSelected
                            ? 'bg-blue-600 text-white font-bold'
                            : 'bg-slate-900/90 text-slate-300 border border-slate-800 group-hover:text-white'
                        }`}
                      >
                        {pt.name} ({pt.projectsCount})
                      </span>
                    </div>
                  </button>
                );
              })}

              {/* Bottom map watermark */}
              <div className="absolute bottom-2 left-3 text-[10px] font-mono text-slate-400 pointer-events-none">
                Нажмите на населённый пункт для просмотра паспортов
              </div>
            </div>

            {/* Quick Filter City Buttons */}
            <div className="flex flex-wrap gap-1.5 mt-4">
              {YAROSLAVL_POINTS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPoint(p)}
                  className={`px-2.5 py-1 rounded text-xs font-mono transition-all ${
                    selectedPoint.id === p.id
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Selected District Card (5 cols) */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
            <div className="border-b border-slate-800 pb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono uppercase tracking-wider text-blue-400 font-bold">
                  ЛОКАЦИЯ: {selectedPoint.name}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                  Выезд инженера 0 ₽
                </span>
              </div>
              <h3 className="text-2xl font-black text-white tracking-tight">
                {selectedPoint.projectsCount} реализованных объектов
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Включая свайные фундаменты, террасы из ДПК, каркасные дома и наружные инженерные сети.
              </p>
            </div>

            {/* Examples of built projects */}
            <div className="space-y-3">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">
                Недавние объекты в этом районе:
              </span>
              <div className="space-y-2">
                {selectedPoint.recentProjects.map((rp, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs font-mono flex items-center justify-between"
                  >
                    <span className="text-slate-200">{rp}</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                  </div>
                ))}
              </div>
            </div>

            {/* Action Callout */}
            <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-500/30 space-y-3">
              <div className="text-xs font-mono text-slate-300 leading-relaxed">
                Планируете строительство в {selectedPoint.name} или окрестностях?
                Инженер ВОЛГАСТРОЙ 76 приедет на участок с оптическим нивелиром,
                проверит перепад высот и грунты, а смета будет рассчитана за 24 часа.
              </div>
              <button
                type="button"
                onClick={() => onSelectCityForConsult(selectedPoint.name)}
                className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
              >
                <span>Заказать выезд инженера в {selectedPoint.name}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
