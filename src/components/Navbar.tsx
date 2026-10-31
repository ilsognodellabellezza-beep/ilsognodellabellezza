import React, { useState } from 'react';
import { Sparkles, Calendar, ShieldCheck, User, ChevronDown, Menu, X } from 'lucide-react';
import { PageId } from '../types/navigation';

interface NavbarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate }) => {
  const [isGestionaleDropdownOpen, setIsGestionaleDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavClick = (page: PageId) => {
    onNavigate(page);
    setIsMobileMenuOpen(false);
    setIsGestionaleDropdownOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAF7F7]/95 backdrop-blur-md border-b border-[#EEDFE1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-6">
        
        {/* Brand / Logo */}
        <button
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-3 text-left group shrink-0"
        >
          <div className="w-11 h-11 rounded-full bg-[#261F21] text-[#D8B268] flex items-center justify-center font-serif text-lg font-bold border border-[#AA853D]/40 shadow-xs transition-transform group-hover:scale-105">
            CM
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-lg sm:text-xl font-bold tracking-tight text-[#261F21] whitespace-nowrap">
              Il Sogno della Bellezza
            </span>
            <span className="text-[11px] text-[#8F7D82] tracking-wider uppercase font-medium">
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

          <button
            onClick={() => handleNavClick('laser')}
            className={`transition-colors whitespace-nowrap hover:text-[#AA853D] flex items-center gap-1.5 ${
              currentPage === 'laser' ? 'text-[#AA853D] font-bold border-b-2 border-[#AA853D] pb-1' : ''
            }`}
          >
            <span>Laser 818NM</span>
            <span className="text-[10px] uppercase font-semibold text-[#AA853D] bg-[#F7EFEF] px-1.5 py-0.5 rounded-sm">
              Promo
            </span>
          </button>

          <button
            onClick={() => handleNavClick('recensioni')}
            className={`transition-colors whitespace-nowrap hover:text-[#AA853D] ${
              currentPage === 'recensioni' ? 'text-[#AA853D] font-bold border-b-2 border-[#AA853D] pb-1' : ''
            }`}
          >
            Recensioni
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
          
          {/* Dropdown Menu Gestionale */}
          <div className="relative">
            <button
              onClick={() => setIsGestionaleDropdownOpen(!isGestionaleDropdownOpen)}
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                currentPage === 'gestionale-dipendenti' || currentPage === 'gestionale-titolare'
                  ? 'bg-[#261F21] text-[#D8B268] border-[#261F21]'
                  : 'bg-[#FAF5F5] text-[#4A4042] border-[#DEC7CA] hover:bg-[#EEDFE1]'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#AA853D]" />
              <span>Gestionale</span>
              <ChevronDown className="w-3 h-3 ml-0.5" />
            </button>

            {isGestionaleDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-[#EEDFE1] rounded-2xl shadow-xl z-50 py-2 animate-fadeIn">
                <button
                  onClick={() => handleNavClick('gestionale-dipendenti')}
                  className="w-full text-left px-4 py-2.5 hover:bg-[#FAF7F7] flex items-center gap-2.5 text-xs text-[#261F21]"
                >
                  <User className="w-4 h-4 text-[#736266]" />
                  <div>
                    <span className="font-bold block">Account Dipendente</span>
                    <span className="text-[10px] text-[#8F7D82]">Agenda & clienti (No finanza)</span>
                  </div>
                </button>

                <div className="border-t border-[#F7EFEF] my-1" />

                <button
                  onClick={() => handleNavClick('gestionale-titolare')}
                  className="w-full text-left px-4 py-2.5 hover:bg-[#FAF7F7] flex items-center gap-2.5 text-xs text-[#261F21]"
                >
                  <ShieldCheck className="w-4 h-4 text-[#AA853D]" />
                  <div>
                    <span className="font-bold block text-[#AA853D]">Account Titolare</span>
                    <span className="text-[10px] text-[#8F7D82]">Contabilità, incassi & Cloud</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Pulsante Primario Pagina Prenotazione */}
          <button
            onClick={() => handleNavClick('prenota')}
            className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-lg shadow-xs transition-all hover:scale-[1.02] whitespace-nowrap ${
              currentPage === 'prenota'
                ? 'bg-[#AA853D] text-white shadow-md'
                : 'bg-[#261F21] text-[#FAF7F7] hover:bg-[#191415]'
            }`}
          >
            <Calendar className="w-4 h-4 text-[#D8B268]" />
            <span>Prenota Online</span>
          </button>

          {/* Toggle Menu Mobile */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-[#261F21] hover:bg-black/5 rounded-lg"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

        </div>

      </div>

      {/* Menu a Tendina Mobile */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-[#EEDFE1] px-4 py-4 space-y-2 shadow-lg animate-fadeIn text-sm">
          <button
            onClick={() => handleNavClick('home')}
            className="w-full text-left py-2 px-3 rounded-lg hover:bg-[#FAF7F7] font-medium text-[#261F21]"
          >
            Home
          </button>
          <button
            onClick={() => handleNavClick('trattamenti')}
            className="w-full text-left py-2 px-3 rounded-lg hover:bg-[#FAF7F7] font-medium text-[#261F21]"
          >
            Trattamenti & Listino
          </button>
          <button
            onClick={() => handleNavClick('laser')}
            className="w-full text-left py-2 px-3 rounded-lg hover:bg-[#FAF7F7] font-medium text-[#261F21] flex items-center justify-between"
          >
            <span>Laser EPILED 818NM</span>
            <span className="text-xs bg-[#D8B268] text-[#191415] px-2 py-0.5 rounded font-bold">
              Promo €119,99
            </span>
          </button>
          <button
            onClick={() => handleNavClick('prenota')}
            className="w-full text-left py-2 px-3 rounded-lg hover:bg-[#FAF7F7] font-medium text-[#261F21]"
          >
            Prenotazioni Online
          </button>
          <button
            onClick={() => handleNavClick('recensioni')}
            className="w-full text-left py-2 px-3 rounded-lg hover:bg-[#FAF7F7] font-medium text-[#261F21]"
          >
            Recensioni Clienti
          </button>
          <button
            onClick={() => handleNavClick('chi-siamo')}
            className="w-full text-left py-2 px-3 rounded-lg hover:bg-[#FAF7F7] font-medium text-[#261F21]"
          >
            Chi Siamo & Contatti
          </button>

          <div className="border-t border-[#EEDFE1] pt-2 space-y-1">
            <span className="text-[11px] font-bold text-[#8F7D82] uppercase tracking-wider px-3 block">
              Accesso Gestionale
            </span>
            <button
              onClick={() => handleNavClick('gestionale-dipendenti')}
              className="w-full text-left py-2 px-3 rounded-lg hover:bg-[#FAF7F7] text-xs font-semibold text-[#261F21]"
            >
              Account Dipendente (Operatrice)
            </button>
            <button
              onClick={() => handleNavClick('gestionale-titolare')}
              className="w-full text-left py-2 px-3 rounded-lg hover:bg-[#FAF7F7] text-xs font-bold text-[#AA853D]"
            >
              Account Titolare (Chiara & Melania)
            </button>
          </div>
        </div>
      )}

    </header>
  );
};
