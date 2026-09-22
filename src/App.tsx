import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { SequenceConcept } from './components/SequenceConcept';
import { InteractiveConfigurator } from './components/InteractiveConfigurator';
import { ProjectPassports } from './components/ProjectPassports';
import { EngineeringCenter } from './components/EngineeringCenter';
import { RegionMap } from './components/RegionMap';
import { PricingTransparency } from './components/PricingTransparency';
import { ReviewsSection } from './components/ReviewsSection';
import { Footer } from './components/Footer';
import { LeadFormModal } from './components/LeadFormModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { ServiceCategory, ProjectPassport, EstimateResult, ConfiguratorState } from './types';

export function App() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('Строительный объект');
  const [modalCost, setModalCost] = useState(0);
  const [modalSummary, setModalSummary] = useState('');
  const [modalEstimate, setModalEstimate] = useState<EstimateResult | undefined>(undefined);
  const [modalConfig, setModalConfig] = useState<ConfiguratorState | undefined>(undefined);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory>('house');
  const [adminOpen, setAdminOpen] = useState(false);

  // Check URL hash or query for admin panel auto-open
  useEffect(() => {
    if (window.location.hash === '#admin' || window.location.search.includes('admin=1')) {
      setAdminOpen(true);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+A or Cmd+Shift+A shortcut for admin panel
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a' || e.key === 'Ф' || e.key === 'ф')) {
        e.preventDefault();
        setAdminOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenEstimateModal = (
    title: string,
    cost: number,
    summary: string,
    estimate?: EstimateResult,
    config?: ConfiguratorState
  ) => {
    setModalTitle(title);
    setModalCost(cost);
    setModalSummary(summary);
    setModalEstimate(estimate);
    setModalConfig(config);
    setModalOpen(true);
  };

  const handleOpenGeneralModal = () => {
    setModalTitle('Расчёт объекта под ключ');
    setModalCost(0);
    setModalSummary('Индивидуальный расчет по нормам СП 20 для участка в Ярославской области');
    setModalEstimate(undefined);
    setModalConfig(undefined);
    setModalOpen(true);
  };

  const handleSelectPassportForEstimate = (passport: ProjectPassport) => {
    setModalTitle(`Аналог объекта ${passport.code}`);
    setModalCost(0);
    setModalSummary(`${passport.title} (${passport.type}, ${passport.area})`);
    setModalEstimate(undefined);
    setModalConfig(undefined);
    setModalOpen(true);
  };

  const handleSelectCityForConsult = (cityName: string) => {
    setModalTitle(`Строительство в г. ${cityName}`);
    setModalCost(0);
    setModalSummary(`Бесплатный выезд инженера на участок в ${cityName}`);
    setModalEstimate(undefined);
    setModalConfig(undefined);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 antialiased selection:bg-blue-600 selection:text-white font-sans">
      {/* 1. Header */}
      <Header
        onOpenCalcModal={handleOpenGeneralModal}
        onOpenAdmin={() => setAdminOpen(true)}
      />

      {/* 2. Hero with Interactive 3D Model & Technical Manifesto */}
      <Hero
        onOpenCalcModal={handleOpenGeneralModal}
        onSelectCategory={(cat) => setSelectedCategory(cat)}
      />

      {/* 3. Sequence Concept: 01 Участок -> 06 Готовый объект */}
      <SequenceConcept />

      {/* 4. Interactive Configurator & Live 3D Model Synchronization */}
      <InteractiveConfigurator
        initialCategory={selectedCategory}
        onOpenEstimateModal={handleOpenEstimateModal}
      />

      {/* 5. Engineering Passports instead of generic portfolio */}
      <ProjectPassports onSelectPassportForEstimate={handleSelectPassportForEstimate} />

      {/* 7. Engineering Center: Interactive blueprint schemas */}
      <EngineeringCenter />

      {/* 8. Yaroslavl Oblast Geographical Map */}
      <RegionMap onSelectCityForConsult={handleSelectCityForConsult} />

      {/* 9. Transparent Pricing & Contract Guarantee */}
      <PricingTransparency onOpenCalc={handleOpenGeneralModal} />

      {/* 10. Real Customer Reviews from Yaroslavl Region */}
      <ReviewsSection />

      {/* 11. Footer with Requisites, Norms & admin.php link */}
      <Footer onOpenAdmin={() => setAdminOpen(true)} />

      {/* 12. Lead Form Modal (Compatible with PHP backend) */}
      <LeadFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialTitle={modalTitle}
        initialTotalCost={modalCost}
        summaryText={modalSummary}
        estimate={modalEstimate}
        config={modalConfig}
      />

      {/* 13. Admin Panel Modal (Estimates, Leads, Reviews, КП) */}
      <AdminPanelModal
        isOpen={adminOpen}
        onClose={() => setAdminOpen(false)}
      />
    </div>
  );
}

export default App;
