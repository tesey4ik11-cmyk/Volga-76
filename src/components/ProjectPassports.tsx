import React, { useState } from 'react';
import { PASSPORTS } from '../data/projectsData';
import { ProjectPassport } from '../types';
import { SafeImage } from './SafeImage';
import {
  FileText,
  MapPin,
  Calendar,
  Layers,
  ChevronRight,
  Maximize2,
  CheckCircle2,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

interface ProjectPassportsProps {
  onSelectPassportForEstimate: (passport: ProjectPassport) => void;
}

export const ProjectPassports: React.FC<ProjectPassportsProps> = ({
  onSelectPassportForEstimate,
}) => {
  const [activePassportId, setActivePassportId] = useState(PASSPORTS[0].id);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  const passport = PASSPORTS.find((p) => p.id === activePassportId) || PASSPORTS[0];

  const handleSelectPassport = (id: string) => {
    setActivePassportId(id);
    setActiveImageIdx(0);
  };

  return (
    <section id="passports" className="py-20 bg-[#080c14] border-b border-slate-850 relative">
      <div className="max-w-7xl mx-auto px-4">
        {/* Section Header */}
        <div className="max-w-3xl mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-blue-950/70 border border-blue-800/60 rounded text-xs font-mono text-blue-400 font-semibold uppercase">
            <FileText className="w-3.5 h-3.5" />
            Инженерная документация сданных объектов
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            ПАСПОРТА <span className="text-blue-500">ОБЪЕКТОВ VGS</span>
          </h2>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Вместо шаблонного портфолио с невнятными картинками мы публикуем паспорта объектов:
            с точными сечениями металлопроката, марками бетона, шагом свайного поля и нормативными нагрузками.
          </p>
        </div>

        {/* Passport Code Switcher Tabs */}
        <div className="flex flex-wrap gap-2.5 mb-8">
          {PASSPORTS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectPassport(item.id)}
              className={`p-3 rounded-xl border text-left transition-all ${
                activePassportId === item.id
                  ? 'bg-slate-900 border-blue-500 shadow-lg shadow-blue-950/40 text-white'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs font-bold text-blue-400">{item.code}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                  {item.status}
                </span>
              </div>
              <div className="text-xs font-medium text-white max-w-[200px] truncate">
                {item.title}
              </div>
            </button>
          ))}
        </div>

        {/* Main Passport Sheet Layout */}
        <div className="bg-[#0b101c] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          {/* Engineering Sheet Header */}
          <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-mono text-xs font-black">
                {passport.code.split('-')[1]}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono font-bold text-white tracking-wide">
                    ПАСПОРТ ОБЪЕКТА {passport.code}
                  </span>
                  <span className="text-xs font-mono text-slate-400">· ГОСТ / СНиП</span>
                </div>
                <span className="text-xs text-slate-400">{passport.district}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-slate-400 hidden sm:inline">
                Срок сдачи: {passport.duration}
              </span>
              <button
                type="button"
                onClick={() => onSelectPassportForEstimate(passport)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold transition-colors"
              >
                <span>Рассчитать аналог</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Body: Gallery Left, Specs Sheet Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 lg:p-8">
            {/* Gallery (6 cols) */}
            <div className="lg:col-span-6 space-y-4">
              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-black aspect-[16/10]">
                <SafeImage
                  src={passport.gallery[activeImageIdx] || passport.mainImage}
                  alt={passport.title}
                  fallbackTitle={passport.code}
                  fallbackSubtitle={passport.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm border border-slate-700 px-2.5 py-1 rounded text-[11px] font-mono text-slate-300 pointer-events-none">
                  Фото {activeImageIdx + 1} из {passport.gallery.length}
                </div>
              </div>

              {/* Thumbnails */}
              <div className="flex gap-2.5 overflow-x-auto pb-1">
                {passport.gallery.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveImageIdx(i)}
                    className={`relative w-20 h-14 rounded-lg overflow-hidden border shrink-0 transition-all ${
                      activeImageIdx === i ? 'border-blue-500 ring-2 ring-blue-500/40' : 'border-slate-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <SafeImage
                      src={img}
                      alt=""
                      fallbackTitle={`#${i + 1}`}
                      fallbackSubtitle={passport.code}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-sans pt-2">
                {passport.description}
              </p>
            </div>

            {/* Specifications Technical Sheet (6 cols) */}
            <div className="lg:col-span-6 space-y-6">
              <div className="space-y-3">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400 block border-b border-slate-800 pb-2">
                  Основные паспортные параметры:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">ТИП СТРОЕНИЯ</span>
                    <span className="text-white font-medium mt-1 block">{passport.type}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">ПЛОЩАДЬ / ГАБАРИТЫ</span>
                    <span className="text-white font-medium mt-1 block">{passport.area}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">КОНСТРУКЦИЯ ФУНДАМЕНТА</span>
                    <span className="text-blue-400 font-medium mt-1 block">{passport.foundation}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">МАТЕРИАЛЫ КАРКАСА</span>
                    <span className="text-white font-medium mt-1 block">{passport.materials}</span>
                  </div>
                </div>
              </div>

              {/* Engineering Specifics */}
              <div className="space-y-3">
                <span className="text-xs font-mono uppercase tracking-wider text-blue-400 block border-b border-slate-800 pb-2">
                  Инженерно-климатический расчёт:
                </span>

                <div className="space-y-2">
                  {passport.specs.map((s, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between gap-4 p-2.5 rounded bg-slate-950/40 border border-slate-850 text-xs font-mono"
                    >
                      <span className="text-slate-400">{s.label}</span>
                      <span className="text-slate-200 font-semibold text-right">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Guarantees Box */}
              <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-500/20 text-xs font-mono flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-blue-400 shrink-0" />
                <span className="text-slate-300">
                  Все скрытые работы зафиксированы актами освидетельствования. Исполнительная документация передана заказчику в день сдачи.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
