import React, { useState } from 'react';
import { WORK_SEQUENCE } from '../data/projectsData';
import { Layers, ShieldCheck, ArrowRight, CheckCircle2, ChevronRight } from 'lucide-react';

export const SequenceConcept: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section id="sequence" className="py-20 bg-[#060a12] border-b border-slate-850 relative">
      <div className="max-w-7xl mx-auto px-4">
        {/* Section Header */}
        <div className="max-w-3xl mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-blue-950/70 border border-blue-800/60 rounded text-xs font-mono text-blue-400 font-semibold uppercase">
            <Layers className="w-3.5 h-3.5" />
            Инженерная методология ВОЛГАСТРОЙ 76
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            ОДИН УЧАСТОК. <span className="text-blue-500">ОДИН ПОДРЯДЧИК.</span>
            <br />
            ВЕСЬ ОБЪЕКТ.
          </h2>

          <p className="text-slate-300 text-base leading-relaxed">
            Вам не нужно искать 5 разных бригад: одних на сваи, вторых на каркас, третьих на трубы, а четвертых на террасу.
            Мы ведём весь строительный цикл как непрерывную инженерную систему, где каждый последующий этап строго
            стыкуется с предыдущим по осям и проектным высотам.
          </p>
        </div>

        {/* Interactive Sequence Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {WORK_SEQUENCE.map((item, idx) => {
            const isSelected = activeStep === idx;
            return (
              <div
                key={item.step}
                onClick={() => setActiveStep(idx)}
                className={`relative p-6 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 border-blue-500 shadow-xl shadow-blue-950/40'
                    : 'bg-[#0a0f1c] border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Step indicator */}
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-2xl font-black text-blue-400">
                    {item.step}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800/80 text-slate-300 border border-slate-700/60">
                    {item.badge}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white mb-1 tracking-tight">
                  {item.title}
                </h3>
                <div className="text-xs font-mono text-blue-400 mb-3 font-medium">
                  {item.subtitle}
                </div>

                <p className="text-slate-300 text-sm leading-relaxed">
                  {item.details}
                </p>

                {/* Bottom active accent line */}
                {isSelected && (
                  <div className="absolute bottom-0 left-4 right-4 h-1 bg-blue-500 rounded-t-sm" />
                )}
              </div>
            );
          })}
        </div>

        {/* Engineering Synergy Summary Banner */}
        <div className="mt-12 p-6 rounded-xl bg-slate-900/90 border border-blue-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
              <span>Единая юридическая и гарантийная ответственность</span>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl">
              Если каркас ставят те же инженеры, кто завинчивал сваи и заливал ростверк, исключены споры о «чужих кривых осях».
              Мы гарантируем геометрическую точность и передаем объект с исполнительными схемами.
            </p>
          </div>

          <a
            href="#configurator"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold font-mono uppercase tracking-wider shrink-0 transition-colors"
          >
            <span>Собрать свой комплекс</span>
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
};
