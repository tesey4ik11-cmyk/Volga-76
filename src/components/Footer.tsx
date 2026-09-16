import React from 'react';
import { Phone, MapPin, Compass, Mail, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer id="contacts" className="w-full bg-[#04070d] border-t border-slate-850 py-16 text-slate-400 text-xs font-mono">
      <div className="max-w-7xl mx-auto px-4 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Col 1: Brand & Philosophy */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <Compass className="w-4 h-4" />
              </div>
              <span className="text-base font-black text-white tracking-wider">
                ВОЛГАСТРОЙ<span className="text-blue-500"> 76</span>
              </span>
            </div>
            <p className="text-slate-400 text-xs font-sans leading-relaxed">
              Инженерно-строительное бюро и цифровая студия. Проектирование и возведение частных и коммерческих объектов
              по всей территории Ярославской области.
            </p>
            <div className="pt-2 text-[11px] text-slate-400">
              «Сначала рассчитываем. Затем показываем. Затем строим.»
            </div>
          </div>

          {/* Col 2: Contacts */}
          <div className="space-y-3">
            <div className="text-white font-bold uppercase tracking-wider text-xs border-b border-slate-800 pb-2">
              Контакты и связь
            </div>
            <div className="space-y-2.5">
              <div>
                <div className="text-[11px] text-slate-400">Производство · стройка · монтаж:</div>
                <a
                  href="tel:+79992342939"
                  className="text-white font-bold hover:text-blue-400 flex items-center gap-1.5 transition-colors text-sm"
                >
                  <Phone className="w-3.5 h-3.5 text-blue-400" />
                  Андрей: +7 (999) 234-29-39
                </a>
              </div>

              <div>
                <div className="text-[11px] text-slate-400">Объекты · сметы · организация:</div>
                <a
                  href="tel:+79011722620"
                  className="text-white font-bold hover:text-blue-400 flex items-center gap-1.5 transition-colors text-sm"
                >
                  <Phone className="w-3.5 h-3.5 text-blue-400" />
                  Станислав: +7 (901) 172-26-20
                </a>
              </div>

              <div className="pt-1">
                <div className="text-[11px] text-slate-400">Почта для заявок и чертежей:</div>
                <a
                  href="mailto:order@volgastroy76.ru"
                  className="text-blue-400 font-semibold hover:underline flex items-center gap-1.5 text-xs"
                >
                  <Mail className="w-3.5 h-3.5 text-blue-400" />
                  order@volgastroy76.ru
                </a>
              </div>

              <div className="flex items-center gap-1.5 text-slate-300 text-[11px]">
                <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Ярославль, Тутаев, Рыбинск, Ростов</span>
              </div>

              <div className="text-[11px] text-slate-400 pt-0.5">
                Режим работы: 8:00–21:00 без выходных
              </div>
            </div>
          </div>

          {/* Col 3: Norms & Standards */}
          <div className="space-y-3">
            <div className="text-white font-bold uppercase tracking-wider text-xs border-b border-slate-800 pb-2">
              Нормативная база
            </div>
            <ul className="space-y-1.5 text-[11px] text-slate-400">
              <li>• СП 20.13330 (Нагрузки и воздействия, IV снеговой район)</li>
              <li>• СП 22.13330 (Основания зданий и свайные фундаменты)</li>
              <li>• СП 31.13330 (Водоснабжение и наружные сети)</li>
              <li>• ГОСТ 8732-78 (Трубы стальные бесшовные)</li>
              <li>• СП 50.13330 (Тепловая защита зданий)</li>
            </ul>
          </div>

          {/* Col 4: Guarantees & Engineering Quality */}
          <div className="space-y-3">
            <div className="text-white font-bold uppercase tracking-wider text-xs border-b border-slate-800 pb-2">
              Гарантии и контроль
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              Официальный договор с фиксированной сметой без скрытых доплат.
              Инструментальный контроль отметок и сдача каждого этапа по актам скрытых работ.
            </p>
            <div className="pt-2 flex flex-col gap-1.5 text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5 text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Гарантия на несущий конструктив 1 год</span>
              </div>
              <div className="text-[10px] text-slate-400">
                г. Ярославль и Ярославская область · Пн–Вс 8:00–21:00
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright line */}
        <div className="pt-8 border-t border-slate-850 flex flex-wrap items-center justify-between gap-4 text-[11px] text-slate-400">
          <div>
            © {new Date().getFullYear()} ВОЛГАСТРОЙ 76. Все права защищены.
          </div>
          <div className="flex items-center gap-4">
            <span>Ярославская область</span>
            <span>·</span>
            <span>Фиксация сметы 100%</span>
            <span>·</span>
            <span className="text-blue-400">Инжиниринг полного цикла</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
