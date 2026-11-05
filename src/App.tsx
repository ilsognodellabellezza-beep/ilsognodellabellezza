import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { TreatmentsPage } from './pages/TreatmentsPage';
import { PromoPage } from './pages/PromoPage';
import { BookingPage } from './pages/BookingPage';
import { ReviewsPage } from './pages/ReviewsPage';
import { AboutPage } from './pages/AboutPage';
import { GalleryPage } from './pages/GalleryPage';
// Il gestionale viene scaricato solo da chi ci accede
const ManagementPage = lazy(() => import('./pages/ManagementPage').then((m) => ({ default: m.ManagementPage })));
import { LoginPage } from './pages/LoginPage';
import { SetPasswordPage } from './pages/SetPasswordPage';
import { AccountPage } from './pages/AccountPage';
import { IntroSplash } from './components/IntroSplash';
import { WhatsAppButton } from './components/WhatsAppButton';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { PageId } from './types/navigation';
import { useAuth } from './lib/auth';
import { Loader2 } from 'lucide-react';

/** Un solo account: chi è collegata accede al gestionale, senza ruoli. */
const ManagementGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading, profile } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-[#8F7D82]">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!profile) return <LoginPage />;

  if (profile.mustChangePassword) return <SetPasswordPage />;

  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center text-[#8F7D82]">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
};

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
        'promo',
        'prenota',
        'recensioni',
        'galleria',
        'chi-siamo',
        'gestionale',
        'account'
      ];
      // vecchi collegamenti salvati dalle clienti
      const legacy: Record<string, PageId> = {
        laser: 'promo',
        'gestionale-dipendenti': 'gestionale',
        'gestionale-titolare': 'gestionale',
      };
      const page = (legacy[hash] ?? hash) as PageId;
      if (validPages.includes(page)) {
        setCurrentPage(page);
      }
    };

    parseHash();
    window.addEventListener('hashchange', parseHash);
    return () => window.removeEventListener('hashchange', parseHash);
  }, []);

  const reduceMotion = useReducedMotion();

  const navigateTo = (page: PageId, serviceId?: string) => {
    if (serviceId) {
      setPreselectedServiceId(serviceId);
    }
    setCurrentPage(page);
    window.location.hash = page;
    // la nuova pagina entra con una dissolvenza: si parte subito dall'alto
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  return (
    <div className="min-h-dvh bg-[#FAF7F7] flex flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0 font-sans text-[#261F21]">
      {/* Top Bar di Navigazione Multi-Pagina */}
      <Navbar
        currentPage={currentPage}
        onNavigate={navigateTo}
      />

      {/* Animazione di apertura del sito */}
      <IntroSplash />

      {/* Rendering della Pagina Dedicata Selezionata (transizione leggera) */}
      <main className="flex-1">
        <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={currentPage}
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
        {currentPage === 'home' && (
          <HomePage onNavigate={navigateTo} />
        )}

        {currentPage === 'trattamenti' && (
          <TreatmentsPage onNavigate={navigateTo} />
        )}

        {currentPage === 'promo' && (
          <PromoPage onNavigate={navigateTo} />
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

        {currentPage === 'galleria' && (
          <GalleryPage onNavigate={navigateTo} />
        )}

        {currentPage === 'chi-siamo' && (
          <AboutPage onNavigate={navigateTo} />
        )}

        {currentPage === 'gestionale' && (
          <ManagementGate>
            <ManagementPage onNavigate={navigateTo} />
          </ManagementGate>
        )}

        {currentPage === 'account' && (
          <AccountPage onNavigate={navigateTo} />
        )}
        </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer Elegante Multi-Pagina */}
      <Footer onNavigate={navigateTo} />

      {/* WhatsApp sempre a portata di mano (non nel gestionale) */}
      {currentPage !== 'gestionale' && <WhatsAppButton />}
    </div>
  );
}
