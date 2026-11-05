import React, { useState } from 'react';
import { Calendar, User, Menu, X, Home, Sparkles } from 'lucide-react';
import { PageId } from '../types/navigation';
import { useAuth } from '../lib/auth';
import { useSalon } from '../lib/salon';

interface NavbarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { customer } = useAuth();
  const { activePromotions } = useSalon();
  const hasPromo = activePromotions.length > 0;
  const accountLabel = customer ? (customer.fullName.split(' ')[0] || 'Il mio account') : 'Accedi';

  const handleNavClick = (page: PageId) => {
    onNavigate(page);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
    <header className="sticky top-0 z-40 bg-[#FAF7F7]/95 backdrop-blur-md border-b border-[#EEDFE1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 lg:h-20 flex items-center justify-between gap-3 lg:gap-6">
        
        {/* Brand / Logo */}
        <button
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-2.5 lg:gap-3 text-left group min-w-0"
        >
          <img
            src="/brand/logo-cm.png"
            alt="Logo Il Sogno della Bellezza – Chiara e Melania"
            className="h-10 lg:h-12 w-auto transition-transform group-hover:scale-105"
          />
          <div className="flex flex-col min-w-0">
            <span className="font-serif text-[15px] leading-tight sm:text-xl font-bold tracking-tight text-[#261F21] truncate">
              Il Sogno della Bellezza
            </span>
            <span className="text-[10px] lg:text-[11px] text-[#8F7D82] tracking-wider uppercase font-medium truncate">
              Chiara e Melania · Catania
            </span>
          </div>
        </button>

        {/* Pagine di Navigazione Desktop (Una pagina per ogni cosa) */}
        <nav className="hidden lg:flex items-center gap-6 text-xs sm:text-sm font-medium text-[#4A4042]">
          <button
            onClick={() => handleNavClick('home')}
            className={`transition-colors whitespace-nowrap hover:text-[#AA853D] ${
              currentPage === 'home' ? 'text-[#AA853D] font-bold border-b-2 border-[#AA853D] pb-1' : ''
            }`}
          >
            Home
          </button>

          <button
            onClick={() => handleNavClick('trattamenti')}
            className={`transition-colors whitespace-nowrap hover:text-[#AA853D] ${
              currentPage === 'trattamenti' ? 'text-[#AA853D] font-bold border-b-2 border-[#AA853D] pb-1' : ''
            }`}
          >
            Trattamenti
          </button>

          {hasPromo && (
            <button
              onClick={() => handleNavClick('promo')}
              className={`transition-colors whitespace-nowrap hover:text-[#AA853D] flex items-center gap-1.5 ${
                currentPage === 'promo' ? 'text-[#AA853D] font-bold border-b-2 border-[#AA853D] pb-1' : ''
              }`}
            >
              <span>Promo</span>
              <span className="text-[10px] uppercase font-semibold text-[#AA853D] bg-[#F7EFEF] px-1.5 py-0.5 rounded-sm">
                {activePromotions.length}
              </span>
            </button>
          )}

          <button
            onClick={() => handleNavClick('recensioni')}
            className={`transition-colors whitespace-nowrap hover:text-[#AA853D] ${
              currentPage === 'recensioni' ? 'text-[#AA853D] font-bold border-b-2 border-[#AA853D] pb-1' : ''
            }`}
          >
            Recensioni
          </button>

          <button
            onClick={() => handleNavClick('galleria')}
            className={`transition-colors whitespace-nowrap hover:text-[#AA853D] ${
              currentPage === 'galleria' ? 'text-[#AA853D] font-bold border-b-2 border-[#AA853D] pb-1' : ''
            }`}
          >
            Galleria
          </button>

          <button
            onClick={() => handleNavClick('chi-siamo')}
            className={`transition-colors whitespace-nowrap hover:text-[#AA853D] ${
              currentPage === 'chi-siamo' ? 'text-[#AA853D] font-bold border-b-2 border-[#AA853D] pb-1' : ''
            }`}
          >
            Chi Siamo
          </button>
        </nav>

        {/* Azioni Destra: Gestionale (Dipendenti vs Titolare) + Prenota */}
        <div className="flex items-center gap-3 shrink-0">
          
          {/* Account cliente */}
          <button
            onClick={() => handleNavClick('account')}
            className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors max-w-[160px] ${
              currentPage === 'account'
                ? 'bg-[#261F21] text-[#D8B268] border-[#261F21]'
                : 'bg-[#FAF5F5] text-[#4A4042] border-[#DEC7CA] hover:bg-[#EEDFE1]'
            }`}
          >
            <User className="w-3.5 h-3.5 text-[#AA853D] shrink-0" />
            <span className="truncate">{accountLabel}</span>
          </button>

          {/* Pulsante Primario Pagina Prenotazione */}
          <button
            onClick={() => handleNavClick('prenota')}
            className={`hidden lg:inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-lg shadow-xs transition-all hover:scale-[1.02] whitespace-nowrap ${
              currentPage === 'prenota'
                ? 'bg-[#AA853D] text-white shadow-md'
                : 'bg-[#261F21] text-[#FAF7F7] hover:bg-[#191415]'
            }`}
          >
            <Calendar className="w-4 h-4 text-[#D8B268]" />
            <span>Prenota Online</span>
          </button>

        </div>

      </div>

    </header>

      {/* Menu mobile: pannello dal basso */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl px-4 pt-3 shadow-2xl animate-fadeIn"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[#DEC7CA]" />
            <div className="grid grid-cols-1 gap-1 text-base">
              {([
                ['home', 'Home'],
                ['trattamenti', 'Trattamenti & Listino'],
                ['promo', 'Promozioni in corso'],
                ['prenota', 'Prenotazioni Online'],
                ['recensioni', 'Recensioni Clienti'],
                ['galleria', 'Galleria Foto'],
                ['chi-siamo', 'Chi Siamo & Contatti'],
                ['account', customer ? `Il mio account (${accountLabel})` : 'Accedi o registrati'],
              ] as [PageId, string][]).filter(([page]) => page !== 'promo' || hasPromo).map(([page, label]) => (
                <button
                  key={page}
                  onClick={() => handleNavClick(page)}
                  className={`w-full text-left min-h-12 px-4 rounded-xl font-medium active:bg-[#F7EFEF] ${
                    currentPage === page ? 'bg-[#F7EFEF] text-[#AA853D] font-bold' : 'text-[#261F21]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Barra di navigazione in basso (solo telefono) */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#EEDFE1]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Navigazione principale"
      >
        <div className="grid grid-cols-5 h-16 text-[10px] font-semibold">
          {([
            ['home', 'Home', Home],
            ['trattamenti', 'Trattamenti', Sparkles],
            ['prenota', 'Prenota', Calendar],
            ['account', accountLabel, User],
          ] as [PageId, string, React.ComponentType<{ className?: string }>][]).map(([page, label, Icon]) => {
            const active = currentPage === page;
            const isBook = page === 'prenota';
            return (
              <button
                key={page}
                onClick={() => handleNavClick(page)}
                className={`flex flex-col items-center justify-center gap-1 min-w-0 px-1 ${
                  active ? 'text-[#AA853D]' : 'text-[#736266]'
                }`}
              >
                <span
                  className={`flex items-center justify-center ${
                    isBook ? 'w-11 h-11 -mt-5 rounded-full bg-[#261F21] text-[#D8B268] shadow-lg ring-4 ring-white' : ''
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </span>
                <span className="truncate max-w-full">{label}</span>
              </button>
            );
          })}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex flex-col items-center justify-center gap-1 text-[#736266]"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            <span>Menu</span>
          </button>
        </div>
      </nav>
    </>

  );
};
