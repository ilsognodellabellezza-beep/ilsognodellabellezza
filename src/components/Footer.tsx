import React from 'react';
import { MapPin, Phone, Clock, ShieldCheck, User, Calendar } from 'lucide-react';
import { PageId } from '../types/navigation';

interface FooterProps {
  onNavigate: (page: PageId) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const handleNav = (page: PageId) => {
    onNavigate(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#191415] text-[#FAF7F7] border-t border-[#AA853D]/30 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10">
          
          {/* Brand & Mission */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <img
                src="/brand/logo-cm-light.png"
                alt="Logo Il Sogno della Bellezza"
                className="h-12 w-auto"
              />
              <div>
                <span className="font-serif text-lg font-bold tracking-tight text-[#FAF7F7] block">
                  Il Sogno della Bellezza
                </span>
                <span className="text-[11px] text-[#DEC7CA] tracking-wider uppercase font-medium">
                  Chiara e Melania · Centro Estetico Catania
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#DEC7CA] max-w-sm leading-relaxed">
              Estetica avanzata, epilazione laser a diodo EPILED 818NM indolore, laminazione ciglia,
              cura dello sguardo e massaggi rigeneranti dedicati esclusivamente alla donna.
            </p>

            <div className="pt-2 text-xs text-[#8F7D82] space-y-1 font-mono">
              <p>P.IVA: 05839200873 · Reg. Imprese Catania</p>
              <p>www.ilsognodellabellezza.it · info@ilsognodellabellezza.it</p>
            </div>
          </div>

          {/* Pagine del Sito */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="font-serif font-bold text-sm text-[#D8B268] tracking-wide uppercase">
              Pagine del Sito
            </h4>
            <ul className="space-y-2 text-xs text-[#DEC7CA]">
              <li>
                <button onClick={() => handleNav('home')} className="hover:text-[#D8B268] transition-colors">
                  Home Page
                </button>
              </li>
              <li>
                <button onClick={() => handleNav('trattamenti')} className="hover:text-[#D8B268] transition-colors">
                  Menu Trattamenti & Listino
                </button>
              </li>
              <li>
                <button onClick={() => handleNav('laser')} className="hover:text-[#D8B268] transition-colors">
                  Laser EPILED 818NM (Promo €119,99)
                </button>
              </li>
              <li>
                <button onClick={() => handleNav('prenota')} className="hover:text-[#D8B268] transition-colors">
                  Prenota Online
                </button>
              </li>
              <li>
                <button onClick={() => handleNav('recensioni')} className="hover:text-[#D8B268] transition-colors">
                  Recensioni delle Clienti (5.0★)
                </button>
              </li>
              <li>
                <button onClick={() => handleNav('galleria')} className="hover:text-[#D8B268] transition-colors">
                  Galleria Foto
                </button>
              </li>
              <li>
                <button onClick={() => handleNav('chi-siamo')} className="hover:text-[#D8B268] transition-colors">
                  Chi Siamo & Contatti
                </button>
              </li>
            </ul>
          </div>

          {/* Sede e Accesso Gestionale */}
          <div className="lg:col-span-4 space-y-4">
            <h4 className="font-serif font-bold text-sm text-[#D8B268] tracking-wide uppercase">
              Sede e Orari Catania
            </h4>
            <div className="space-y-2 text-xs text-[#DEC7CA]">
              <p className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#AA853D] shrink-0 mt-0.5" />
                <span>Via delle Viole, 7/9 - 95124 Catania (CT)</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#AA853D] shrink-0" />
                <a href="tel:3453938087" className="hover:text-[#D8B268]">
                  Tel / WhatsApp: 345 393 8087
                </a>
              </p>
              <p className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-[#AA853D] shrink-0 mt-0.5" />
                <span>Martedì – Sabato: 09:00 – 18:30 (Domenica e Lunedì Chiuso)</span>
              </p>
            </div>

            <div className="pt-2 flex flex-wrap gap-2">
              <button
                onClick={() => handleNav('gestionale-dipendenti')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#261F21] hover:bg-[#3B3033] border border-[#AA853D]/40 rounded-lg text-xs text-[#DEC7CA] transition-colors"
              >
                <User className="w-3.5 h-3.5 text-[#8F7D82]" />
                <span>Area Staff</span>
              </button>

              <button
                onClick={() => handleNav('gestionale-titolare')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#261F21] hover:bg-[#3B3033] border border-[#AA853D]/40 rounded-lg text-xs text-[#D8B268] font-bold transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#AA853D]" />
                <span>Area Titolare</span>
              </button>
            </div>
          </div>

        </div>

        {/* Hairline Divider & Copyright */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#8F7D82]">
          <p>© {new Date().getFullYear()} Il Sogno della Bellezza di Chiara e Melania. Tutti i diritti riservati.</p>
          <div className="flex items-center gap-4">
            <button onClick={() => handleNav('trattamenti')} className="hover:text-white transition-colors">
              Listino
            </button>
            <button onClick={() => handleNav('recensioni')} className="hover:text-white transition-colors">
              Recensioni
            </button>
            <button onClick={() => handleNav('chi-siamo')} className="hover:text-white transition-colors">
              Contatti
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
};
