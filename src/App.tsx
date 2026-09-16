import React, { useState } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { SequenceConcept } from './components/SequenceConcept';
import { InteractiveConfigurator } from './components/InteractiveConfigurator';
import { LiveConstruction } from './components/LiveConstruction';
import { ProjectPassports } from './components/ProjectPassports';
import { EngineeringCenter } from './components/EngineeringCenter';
import { RegionMap } from './components/RegionMap';
import { PricingTransparency } from './components/PricingTransparency';
import { ReviewsSection } from './components/ReviewsSection';
import { Footer } from './components/Footer';
import { LeadFormModal } from './components/LeadFormModal';
import { ServiceCategory, ProjectPassport } from './types';

export function App() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('Строительный объект');
  const [modalCost, setModalCost] = useState(0);
  const [modalSummary, setModalSummary] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory>('house');

  const handleOpenEstimateModal = (title: string, cost: number, summary: string) => {
    setModalTitle(title);
    setModalCost(cost);
    setModalSummary(summary);
    setModalOpen(true);
  };

  const handleOpenGeneralModal = () => {
    setModalTitle('Расчёт объекта под ключ');
    setModalCost(0);
    setModalSummary('Индивидуальный расчет по нормам СП 20 для участка в Ярославской области');
    setModalOpen(true);
  };

  const handleSelectPassportForEstimate = (passport: ProjectPassport) => {
    setModalTitle(`Аналог объекта ${passport.code}`);
    setModalCost(0);
    setModalSummary(`${passport.title} (${passport.type}, ${passport.area})`);
    setModalOpen(true);
  };

  const handleSelectCityForConsult = (cityName: string) => {
    setModalTitle(`Строительство в г. ${cityName}`);
    setModalCost(0);
    setModalSummary(`Бесплатный выезд инженера на участок в ${cityName} с лазерным нивелиром`);
    setModalOpen(true);
  };

  const handleSelectProjectForCalc = (projectName: string) => {
    setModalTitle(`Расчёт по объекту: ${projectName}`);
    setModalCost(0);
    setModalSummary(`Комплекс аналогичный текущей живой стройке: ${projectName}`);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 antialiased selection:bg-blue-600 selection:text-white font-sans">
      {/* 1. Header */}
      <Header onOpenCalcModal={handleOpenGeneralModal} />

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

      {/* 5. Live Construction: Real field updates, progress %, stages */}
      <LiveConstruction onSelectProjectForCalc={handleSelectProjectForCalc} />

      {/* 6. Engineering Passports instead of generic portfolio */}
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
      <Footer />

      {/* 12. Lead Form Modal (Compatible with PHP backend) */}
      <LeadFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialTitle={modalTitle}
        initialTotalCost={modalCost}
        summaryText={modalSummary}
      />
    </div>
  );
}

export default App;
