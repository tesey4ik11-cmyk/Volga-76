import React, { useState } from 'react';
import {
  Phone,
  Compass,
  Menu,
  X,
  FileText,
  Calculator,
  Layers,
  MapPin,
  Activity,
  Send,
} from 'lucide-react';

interface HeaderProps {
  onOpenCalcModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenCalcModal }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: '3D Объект', href: '#hero-3d' },
    { label: 'Концепция', href: '#sequence' },
    { label: 'Конструктор', href: '#configurator' },
    { label: 'Живая стройка', href: '#live-construction' },
    { label: 'Паспорта', href: '#passports' },
    { label: 'Инженерный центр', href: '#engineering-center' },
    { label: 'Карта объектов', href: '#region-map' },
    { label: 'Цены', href: '#pricing' },
    { label: 'Отзывы', href: '#reviews' },
    { label: 'Контакты', href: '#contacts' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-[#080c14]/95 backdrop-blur-md border-b border-slate-800/80">
      {/* Top Engineering Coordinates Bar */}
      <div className="w-full bg-[#05080f] border-b border-slate-850 py-1.5 px-4 text-[11px] font-mono text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-300">
              <MapPin className="w-3 h-3 text-blue-400" />
              Ярославская область · 57.6261° N, 39.8845° E
            </span>
            <span className="hidden md:inline text-slate-400">
              Климатический район: Снег IV (2.0 кПа) · СП 20
            </span>
            <span className="hidden lg:inline text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Дежурный инженер на связи
            </span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="mailto:order@volgastroy76.ru"
              className="text-slate-300 hover:text-blue-400 transition-colors flex items-center gap-1"
            >
              <FileText className="w-3 h-3 text-blue-400" />
              order@volgastroy76.ru
            </a>
            <span className="hidden sm:inline text-slate-600">|</span>
            <div className="flex items-center gap-3">
              <a
                href="tel:+79992342939"
                className="text-slate-200 hover:text-blue-400 font-medium transition-colors flex items-center gap-1 text-[11px]"
                title="Андрей — производство, стройка, монтаж"
              >
                <Phone className="w-3 h-3 text-blue-400" />
                <span>Андрей: <strong className="text-white">+7 999 234-29-39</strong></span>
              </a>
              <span className="text-slate-600">·</span>
              <a
                href="tel:+79011722620"
                className="text-slate-200 hover:text-blue-400 font-medium transition-colors flex items-center gap-1 text-[11px]"
                title="Стас — объекты, сметы, организация"
              >
                <span>Стас: <strong className="text-white">+7 901 172-26-20</strong></span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Nav Bar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo & Subtitle */}
        <a href="#top" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 group-hover:border-blue-400 group-hover:bg-blue-600/30 transition-all">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-black tracking-wider text-white">
                ВОЛГАСТРОЙ<span className="text-blue-500"> 76</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-blue-950/60 text-blue-300 border border-blue-800/60 rounded">
                ИНЖИНИРИНГ
              </span>
            </div>
            <p className="text-[10px] font-mono text-slate-400 hidden sm:block tracking-tight">
              ЦИФРОВАЯ СТРОИТЕЛЬНАЯ СТУДИЯ И ИНЖЕНЕРНОЕ БЮРО
            </p>
          </div>
        </a>

        {/* Desktop Navigation */}
        <nav className="hidden xl:flex items-center gap-1 text-[13px] font-medium text-slate-300">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="px-2.5 py-1.5 rounded-md hover:text-white hover:bg-slate-800/80 transition-colors font-sans"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* CTA & Mobile trigger */}
        <div className="flex items-center gap-2">
          <button
            id="btn-header-calc"
            type="button"
            onClick={onOpenCalcModal}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-blue-950/50 transition-all"
          >
            <Calculator className="w-4 h-4" />
            <span>Рассчитать смету</span>
          </button>

          <button
            id="btn-mobile-menu-toggle"
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Меню"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-slate-800 bg-[#080c14] px-4 py-4 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded bg-slate-900/60 border border-slate-800 text-slate-200 hover:border-blue-500/50 hover:text-blue-400 text-xs font-mono"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="pt-2 flex flex-col gap-1 text-xs font-mono text-slate-300 border-t border-slate-850">
            <div className="flex justify-between items-center">
              <span>Андрей: <a href="tel:+79992342939" className="text-white hover:underline">+7 999 234-29-39</a></span>
              <span>Стас: <a href="tel:+79011722620" className="text-white hover:underline">+7 901 172-26-20</a></span>
            </div>
            <div className="flex justify-between items-center text-slate-400 text-[11px]">
              <a href="mailto:order@volgastroy76.ru" className="text-blue-400 hover:underline">order@volgastroy76.ru</a>
              <span>Ярославская обл.</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
