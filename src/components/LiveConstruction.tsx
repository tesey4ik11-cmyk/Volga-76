import React, { useState } from 'react';
import { LIVE_PROJECTS } from '../data/projectsData';
import { Activity, Clock, MapPin, CheckCircle2, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { SafeImage } from './SafeImage';

interface LiveConstructionProps {
  onSelectProjectForCalc: (projectName: string) => void;
}

export const LiveConstruction: React.FC<LiveConstructionProps> = ({ onSelectProjectForCalc }) => {
  const [selectedProjectId, setSelectedProjectId] = useState(LIVE_PROJECTS[0].id);

  const activeProject = LIVE_PROJECTS.find((p) => p.id === selectedProjectId) || LIVE_PROJECTS[0];

  return (
    <section id="live-construction" className="py-20 bg-[#060a12] border-b border-slate-850 relative">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-12">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-emerald-950/60 border border-emerald-800/60 rounded text-xs font-mono text-emerald-400 font-semibold uppercase">
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              Мониторинг текущих объектов · Онлайн статус
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              ЖИВАЯ <span className="text-blue-500">СТРОЙКА</span>
            </h2>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Мы не прячем процесс за красивыми рендерами. Каждый заказчик ВОЛГАСТРОЙ 76 получает доступ
              к регулярным фотоотчетам с площадки, контролю лазерных отметок и фиксации скрытых работ.
            </p>
          </div>

          <div className="flex gap-2">
            {LIVE_PROJECTS.map((proj) => (
              <button
                key={proj.id}
                type="button"
                onClick={() => setSelectedProjectId(proj.id)}
                className={`px-4 py-2.5 rounded-lg text-xs font-mono font-bold transition-all border ${
                  selectedProjectId === proj.id
                    ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-950/40'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                {proj.code}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Live Object Detail Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 lg:p-8 backdrop-blur-sm space-y-8">
          {/* Top Meta Bar */}
          <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono font-bold text-blue-400 uppercase tracking-wider">
                  {activeProject.code}
                </span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  В ПРОЦЕССЕ СТРОИТЕЛЬСТВА
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight">
                {activeProject.title}
              </h3>
              <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 mt-1">
                <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>{activeProject.location}</span>
              </div>
            </div>

            {/* Overall Progress Widget */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 min-w-[200px]">
              <div className="flex justify-between items-center mb-1.5 text-xs font-mono">
                <span className="text-slate-400">ОБЩАЯ ГОТОВНОСТЬ</span>
                <span className="text-blue-400 font-bold">{activeProject.progress}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${activeProject.progress}%` }}
                />
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-2 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                Обновлено: {activeProject.lastUpdate}
              </div>
            </div>
          </div>

          {/* Current Stage Highlight Box */}
          <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-blue-400 font-semibold">
                ТЕКУЩИЙ ЭТАП РАБОТ НА ОБЪЕКТЕ:
              </span>
              <p className="text-base font-bold text-white">
                {activeProject.currentStage}
              </p>
              <p className="text-xs text-slate-300">
                Следующий шаг: {activeProject.nextStep}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onSelectProjectForCalc(activeProject.title)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-mono font-bold shrink-0 transition-colors"
            >
              Рассчитать похожий объект
            </button>
          </div>

          {/* Construction Stage Steps */}
          <div>
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-3">
              Инженерные этапы реализации:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {activeProject.stages.map((st, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg border text-xs font-mono flex items-center gap-2.5 ${
                    st.completed
                      ? 'bg-slate-950/80 border-slate-800 text-slate-300'
                      : st.current
                      ? 'bg-blue-950/60 border-blue-500 text-white font-semibold'
                      : 'bg-slate-950/30 border-slate-850 text-slate-400'
                  }`}
                >
                  {st.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : st.current ? (
                    <span className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin shrink-0" />
                  ) : (
                    <span className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />
                  )}
                  <span className="truncate">{st.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Photo Reports from Field */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                Свежие фотографии с площадки:
              </span>
              <span className="text-xs font-mono text-slate-400">
                Спецификация: {activeProject.specsSummary}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {activeProject.images.map((img, idx) => (
                <div
                  key={idx}
                  className="group relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-[4/3]"
                >
                  <SafeImage
                    src={img.url}
                    alt={img.caption}
                    fallbackTitle={activeProject.code}
                    fallbackSubtitle={img.caption}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3 flex flex-col justify-end">
                    <span className="text-[10px] font-mono text-blue-400">{img.date}</span>
                    <p className="text-xs text-white font-medium leading-tight">{img.caption}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
