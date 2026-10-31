import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { TreatmentsPage } from './pages/TreatmentsPage';
import { LaserPage } from './pages/LaserPage';
import { BookingPage } from './pages/BookingPage';
import { ReviewsPage } from './pages/ReviewsPage';
import { AboutPage } from './pages/AboutPage';
import { StaffManagementPage } from './pages/StaffManagementPage';
import { OwnerManagementPage } from './pages/OwnerManagementPage';
import { PageId } from './types/navigation';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageId>('home');
  const [preselectedServiceId, setPreselectedServiceId] = useState<string | undefined>(undefined);

  // Sync hash routing on mount and change
  useEffect(() => {
    const parseHash = () => {
      const hash = window.location.hash.replace('#', '');
      const validPages: PageId[] = [
        'home',
        'trattamenti',
        'laser',
        'prenota',
        'recensioni',
        'chi-siamo',
        'gestionale-dipendenti',
        'gestionale-titolare'
      ];
      if (validPages.includes(hash as PageId)) {
        setCurrentPage(hash as PageId);
      }
    };

    parseHash();
    window.addEventListener('hashchange', parseHash);
    return () => window.removeEventListener('hashchange', parseHash);
  }, []);

  const navigateTo = (page: PageId, serviceId?: string) => {
    if (serviceId) {
      setPreselectedServiceId(serviceId);
    }
    setCurrentPage(page);
    window.location.hash = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#FAF7F7] flex flex-col font-sans text-[#261F21]">
      {/* Top Bar di Navigazione Multi-Pagina */}
      <Navbar
        currentPage={currentPage}
        onNavigate={navigateTo}
      />

      {/* Rendering della Pagina Dedicata Selezionata */}
      <main className="flex-1">
        {currentPage === 'home' && (
          <HomePage onNavigate={navigateTo} />
        )}

        {currentPage === 'trattamenti' && (
          <TreatmentsPage onNavigate={navigateTo} />
        )}

        {currentPage === 'laser' && (
          <LaserPage onNavigate={navigateTo} />
        )}

        {currentPage === 'prenota' && (
          <BookingPage
            preselectedServiceId={preselectedServiceId}
            onNavigate={navigateTo}
          />
        )}

        {currentPage === 'recensioni' && (
          <ReviewsPage onNavigate={navigateTo} />
        )}

        {currentPage === 'chi-siamo' && (
          <AboutPage onNavigate={navigateTo} />
        )}

        {currentPage === 'gestionale-dipendenti' && (
          <StaffManagementPage onNavigate={navigateTo} />
        )}

        {currentPage === 'gestionale-titolare' && (
          <OwnerManagementPage onNavigate={navigateTo} />
        )}
      </main>

      {/* Footer Elegante Multi-Pagina */}
      <Footer onNavigate={navigateTo} />
    </div>
  );
}
