import React, { useState } from 'react';
import { Sparkles, Clock, Check, ShieldAlert, ArrowRight, Info } from 'lucide-react';
import { TreatmentCategory, Service } from '../types';
import { SERVICES } from '../data/mockData';

interface TreatmentGalleryProps {
  onSelectServiceToBook: (serviceId: string) => void;
}

export const TreatmentGallery: React.FC<TreatmentGalleryProps> = ({ onSelectServiceToBook }) => {
  const [activeCategory, setActiveCategory] = useState<TreatmentCategory | 'all'>('all');
  const [selectedModalService, setSelectedModalService] = useState<Service | null>(null);

  const categories: { id: TreatmentCategory | 'all'; label: string }[] = [
    { id: 'all', label: 'Tutti i Trattamenti' },
    { id: 'laser', label: 'Laser EPILED 818NM' },
    { id: 'massaggi', label: 'Massaggi (Solo Donna)' },
    { id: 'sguardo', label: 'Ciglia & Sopracciglia' },
    { id: 'viso', label: 'Viso Avanzato' },
    { id: 'mani-piedi', label: 'Mani & Piedi' },
  ];

  const filtered = activeCategory === 'all'
    ? SERVICES
    : SERVICES.filter((s) => s.category === activeCategory);

  return (
    <section id="trattamenti" className="py-16 lg:py-24 bg-[#FAF7F7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header di sezione */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-10">
          <p className="text-xs uppercase tracking-widest text-[#AA853D] font-semibold">
            Menu Trattamenti & Percorsi Personalizzati
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#261F21]">
            L'Eccellenza della Bellezza
          </h2>
          <p className="text-sm sm:text-base text-[#55474A]">
            Dalla tecnologia laser più avanzata alla cura meticolosa dello sguardo e del corpo.
            Ogni trattamento è studiato per offrirti risultati visibili e un'esperienza di relax totale.
          </p>
        </div>

        {/* Tab di Filtro Categoria */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-full transition-all ${
                activeCategory === cat.id
                  ? 'bg-[#261F21] text-[#D8B268] shadow-sm'
                  : 'bg-white text-[#55474A] border border-[#EEDFE1] hover:border-[#AA853D] hover:text-[#261F21]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Banner chiarificatore se filtrato su massaggi */}
        {activeCategory === 'massaggi' && (
          <div className="max-w-3xl mx-auto mb-8 p-4 rounded-xl bg-[#FAF0F2] border border-[#DEC7CA] text-xs sm:text-sm text-[#5C242E] flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-[#8A3B49] shrink-0 mt-0.5" />
            <div>
              <strong className="block text-sm font-semibold">Policy Esclusiva Centro: Servizio Massaggi per sole Donne</strong>
              <span>
                Per garantire il massimo livello di comfort, privacy e specializzazione, tutti i nostri massaggi corpo
                (linfodrenanti, decontratturanti, rilassanti e modellanti) sono dedicati unicamente al pubblico femminile.
              </span>
            </div>
          </div>
        )}

        {/* Griglia Card Trattamenti */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((service) => (
            <div
              key={service.id}
              className="bg-white rounded-2xl border border-[#EEDFE1] p-6 flex flex-col justify-between hover:shadow-md transition-shadow relative group"
            >
              <div className="space-y-4">
                
                {/* Header Card */}
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
                      Signature
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

                {/* Benefici chiave */}
                <ul className="space-y-1.5 pt-1">
                  {service.benefits.slice(0, 3).map((benefit, i) => (
                    <li key={i} className="text-xs text-[#55474A] flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-[#AA853D] shrink-0 mt-0.5" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>

              </div>

              {/* Footer Card con Prezzo, Durata e Azione */}
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
                    {service.durationMinutes} minuti
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedModalService(service)}
                    className="p-2 text-[#8F7D82] hover:text-[#261F21] hover:bg-[#F7EFEF] rounded-lg transition-colors"
                    title="Dettagli completi"
                  >
                    <Info className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onSelectServiceToBook(service.id)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#261F21] hover:bg-[#191415] text-[#FAF7F7] text-xs font-semibold rounded-lg shadow-2xs transition-transform hover:scale-[1.02]"
                  >
                    <span>Prenota</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#D8B268]" />
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>

        {/* Modal Dettagli Trattamento */}
        {selectedModalService && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 border border-[#EEDFE1] shadow-2xl relative">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold text-[#AA853D] uppercase tracking-wider">
                    {selectedModalService.categoryLabel}
                  </span>
                  <h3 className="font-serif text-xl font-bold text-[#261F21] mt-1">
                    {selectedModalService.name}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedModalService(null)}
                  className="text-[#8F7D82] hover:text-[#261F21] text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              <p className="text-sm text-[#55474A] leading-relaxed">
                {selectedModalService.description}
              </p>

              {selectedModalService.onlyWomen && (
                <div className="p-3 bg-[#FAF0F2] border border-[#DEC7CA] rounded-lg text-xs text-[#5C242E] flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#8A3B49] shrink-0" />
                  <span>
                    <strong>Riservato Esclusivamente alla Donna:</strong> Il trattamento viene svolto per policy interna solo per il pubblico femminile.
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-[#261F21] uppercase tracking-wider">
                  Benefici ed Effetti:
                </h4>
                <ul className="space-y-1.5">
                  {selectedModalService.benefits.map((b, i) => (
                    <li key={i} className="text-xs text-[#55474A] flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-[#AA853D] shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4 border-t border-[#F7EFEF] flex items-center justify-between">
                <div>
                  <span className="font-serif font-bold text-2xl text-[#261F21]">
                    €{(selectedModalService.promoPrice || selectedModalService.price).toFixed(2)}
                  </span>
                  <span className="block text-xs text-[#8F7D82]">
                    Durata stimata: {selectedModalService.durationMinutes} min
                  </span>
                </div>

                <button
                  onClick={() => {
                    const id = selectedModalService.id;
                    setSelectedModalService(null);
                    onSelectServiceToBook(id);
                  }}
                  className="px-6 py-2.5 bg-[#261F21] hover:bg-[#191415] text-[#FAF7F7] text-xs font-semibold rounded-lg shadow-sm"
                >
                  Procedi con la Prenotazione
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  );
};
