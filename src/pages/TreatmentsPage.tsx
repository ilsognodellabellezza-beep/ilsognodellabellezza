import React, { useState } from 'react';
import { Clock, Check, ShieldAlert, ArrowRight, Search, Sparkles } from 'lucide-react';
import { TreatmentCategory, Service } from '../types';
import { useSiteConfig } from '../lib/siteSettings';
import { PageId } from '../types/navigation';

interface TreatmentsPageProps {
  onNavigate: (page: PageId, serviceId?: string) => void;
}

export const TreatmentsPage: React.FC<TreatmentsPageProps> = ({ onNavigate }) => {
  const { services: SERVICES } = useSiteConfig();
  const [activeCategory, setActiveCategory] = useState<TreatmentCategory | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const categories: { id: TreatmentCategory | 'all'; label: string }[] = [
    { id: 'all', label: 'Tutti i Trattamenti' },
    { id: 'laser', label: 'Laser EPILED 818NM' },
    { id: 'massaggi', label: 'Massaggi (Solo Donna)' },
    { id: 'sguardo', label: 'Ciglia & Sopracciglia' },
    { id: 'viso', label: 'Viso Avanzato' },
    { id: 'mani-piedi', label: 'Mani & Piedi' },
  ];

  const filtered = SERVICES.filter((s) => {
    const matchesCategory = activeCategory === 'all' || s.category === activeCategory;
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="py-12 lg:py-16 bg-[#FAF7F7] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Intestazione di Pagina */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-mono uppercase tracking-widest text-[#AA853D] font-bold">
            Listino Ufficiale & Schede Trattamenti
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#261F21]">
            I Nostri Trattamenti
          </h1>
          <p className="text-sm sm:text-base text-[#55474A]">
            Ogni trattamento è personalizzato per garantire massima efficacia, benessere profondo e risultati visibili.
            Tutti i prezzi sono trasparenti con saldo direttamente in salone.
          </p>
        </div>

        {/* Barra di Ricerca e Filtri Categoria */}
        <div className="space-y-4 max-w-4xl mx-auto">
          <div className="relative">
            <Search className="w-4 h-4 text-[#8F7D82] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cerca trattamento (es. Laser, Massaggio, Laminazione, Acido Ialuronico)..."
              className="w-full pl-9.5 pr-4 py-3 bg-white border border-[#DEC7CA] rounded-xl text-xs sm:text-sm focus:outline-none focus:border-[#AA853D] shadow-2xs"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#8F7D82] hover:text-[#261F21]"
              >
                Cancella
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-full transition-all ${
                  activeCategory === cat.id
                    ? 'bg-[#261F21] text-[#D8B268] shadow-xs'
                    : 'bg-white text-[#55474A] border border-[#EEDFE1] hover:border-[#AA853D] hover:text-[#261F21]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Banner Informativo Vincolante su Massaggi Donna */}
        {(activeCategory === 'massaggi' || activeCategory === 'all') && (
          <div className="max-w-4xl mx-auto p-4 rounded-xl bg-[#FAF0F2] border border-[#DEC7CA] text-xs sm:text-sm text-[#5C242E] flex items-start gap-3 shadow-2xs">
            <ShieldAlert className="w-5 h-5 text-[#8A3B49] shrink-0 mt-0.5" />
            <div>
              <strong className="block text-sm font-semibold">Policy Salone: Massaggi Riservati Solo per Donne</strong>
              <span>
                Per garantire il massimo livello di riservatezza, comfort e atmosfera rilassante,
                tutti i massaggi corpo de <em>Il Sogno della Bellezza</em> sono dedicati ed eseguiti esclusivamente
                a un pubblico femminile da operatrici specializzate.
              </span>
            </div>
          </div>
        )}

        {/* Griglia Trattamenti */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((service) => (
            <div
              key={service.id}
              className="bg-white rounded-2xl border border-[#EEDFE1] p-6 flex flex-col justify-between hover:shadow-md transition-shadow relative group"
            >
              <div className="space-y-4">
                
                {/* Header Scheda */}
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] font-semibold text-[#AA853D] uppercase tracking-wider">
                    {service.categoryLabel}
                  </span>
                  {service.onlyWomen && (
                    <span className="text-[10px] font-bold text-[#8A3B49] bg-[#FAF0F2] px-2 py-0.5 rounded">
                      Solo Donna
                    </span>
                  )}
                  {service.isPopular && !service.onlyWomen && (
                    <span className="text-[10px] font-semibold text-[#191415] bg-[#D8B268] px-2 py-0.5 rounded">
                      Più Richiesto
                    </span>
                  )}
                </div>

                {/* Titolo e Descrizione */}
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#261F21] group-hover:text-[#AA853D] transition-colors">
                    {service.name}
                  </h3>
                  <p className="text-xs text-[#55474A] mt-2 line-clamp-3 leading-relaxed">
                    {service.description}
                  </p>
                </div>

                {/* Benefici */}
                <ul className="space-y-1.5 pt-1">
                  {service.benefits.map((b, i) => (
                    <li key={i} className="text-xs text-[#55474A] flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-[#AA853D] shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

              </div>

              {/* Prezzo e Bottone Prenota Diretto */}
              <div className="pt-6 mt-4 border-t border-[#F7EFEF] flex items-center justify-between">
                <div>
                  {service.promoPrice ? (
                    <div className="flex items-baseline gap-2">
                      <span className="font-serif font-bold text-xl text-[#AA853D]">
                        €{service.promoPrice.toFixed(2)}
                      </span>
                      <span className="text-xs text-[#8F7D82] line-through">
                        €{service.price.toFixed(2)}
                      </span>
                    </div>
                  ) : (
                    <span className="font-serif font-bold text-xl text-[#261F21]">
                      €{service.price.toFixed(2)}
                    </span>
                  )}
                  <span className="text-[11px] text-[#8F7D82] flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {service.durationMinutes} min
                  </span>
                </div>

                <button
                  onClick={() => onNavigate('prenota', service.id)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#261F21] hover:bg-[#191415] text-[#FAF7F7] text-xs font-semibold rounded-lg shadow-2xs transition-transform hover:scale-[1.02]"
                >
                  <span>Prenota Questo</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#D8B268]" />
                </button>
              </div>

            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-[#DEC7CA] p-8">
            <p className="text-sm font-semibold text-[#261F21]">Nessun trattamento trovato</p>
            <p className="text-xs text-[#8F7D82] mt-1">Prova a cambiare i filtri o il termine di ricerca.</p>
          </div>
        )}

      </div>
    </div>
  );
};
