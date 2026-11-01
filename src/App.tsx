import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { TreatmentsPage } from './pages/TreatmentsPage';
import { LaserPage } from './pages/LaserPage';
import { BookingPage } from './pages/BookingPage';
import { ReviewsPage } from './pages/ReviewsPage';
import { AboutPage } from './pages/AboutPage';
// Il gestionale viene scaricato solo da chi ci accede
const StaffManagementPage = lazy(() => import('./pages/StaffManagementPage').then((m) => ({ default: m.StaffManagementPage })));
const OwnerManagementPage = lazy(() => import('./pages/OwnerManagementPage').then((m) => ({ default: m.OwnerManagementPage })));
import { LoginPage } from './pages/LoginPage';
import { SetPasswordPage } from './pages/SetPasswordPage';
import { AccountPage } from './pages/AccountPage';
import { IntroSplash } from './components/IntroSplash';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { PageId } from './types/navigation';
import { useAuth } from './lib/auth';
import { Loader2, ShieldAlert } from 'lucide-react';

const ManagementGate: React.FC<{
  area: 'dipendenti' | 'titolare';
  onNavigate: (page: PageId) => void;
  children: React.ReactNode;
}> = ({ area, onNavigate, children }) => {
  const { loading, profile, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-[#8F7D82]">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!profile) return <LoginPage area={area} />;

  if (profile.mustChangePassword) return <SetPasswordPage />;

  if (area === 'titolare' && profile.role !== 'titolare') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-4 bg-white border border-[#EEDFE1] rounded-3xl p-8 shadow-lg">
          <ShieldAlert className="w-10 h-10 text-[#AA853D] mx-auto" />
          <h1 className="font-serif text-xl font-bold text-[#261F21]">Area riservata alle titolari</h1>
          <p className="text-sm text-[#55474A]">
            Sei collegata come <strong>{profile.fullName}</strong> (dipendente): puoi usare il gestionale staff.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => onNavigate('gestionale-dipendenti')}
              className="px-4 py-2 bg-[#261F21] text-[#FAF7F7] text-xs font-semibold rounded-xl"
            >
              Vai al gestionale staff
            </button>
            <button
              onClick={signOut}
              className="px-4 py-2 border border-[#DEC7CA] text-[#261F21] text-xs font-semibold rounded-xl"
            >
              Cambia account
            </button>
          </div>
        </div>
      </div>
    );
  }

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
        'laser',
        'prenota',
        'recensioni',
        'chi-siamo',
        'gestionale-dipendenti',
        'gestionale-titolare',
        'account'
      ];
      if (validPages.includes(hash as PageId)) {
        setCurrentPage(hash as PageId);
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
          <ManagementGate area="dipendenti" onNavigate={navigateTo}>
            <StaffManagementPage onNavigate={navigateTo} />
          </ManagementGate>
        )}

        {currentPage === 'gestionale-titolare' && (
          <ManagementGate area="titolare" onNavigate={navigateTo}>
            <OwnerManagementPage onNavigate={navigateTo} />
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
    </div>
  );
}
