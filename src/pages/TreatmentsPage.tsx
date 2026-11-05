import React, { useEffect, useMemo, useState } from 'react';
import { Clock, Check, ShieldAlert, ArrowRight, Search, X } from 'lucide-react';
import { TreatmentCategory, Service } from '../types';
import { useSiteConfig, CATEGORY_LIST } from '../lib/siteSettings';
import { useSalon } from '../lib/salon';
import { PageId } from '../types/navigation';

interface TreatmentsPageProps {
  onNavigate: (page: PageId, serviceId?: string) => void;
}

const norm = (v: string) => v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const PriceTag: React.FC<{ service: Service; big?: boolean }> = ({ service, big }) =>
  service.promoPrice ? (
    <div className="flex items-baseline gap-2">
      <span className={`font-serif font-bold text-[#AA853D] ${big ? 'text-2xl' : 'text-lg'}`}>€{service.promoPrice.toFixed(2)}</span>
      <span className="text-xs text-[#8F7D82] line-through">€{service.price.toFixed(2)}</span>
    </div>
  ) : (
    <span className={`font-serif font-bold text-[#261F21] ${big ? 'text-2xl' : 'text-lg'}`}>€{service.price.toFixed(2)}</span>
  );

export const TreatmentsPage: React.FC<TreatmentsPageProps> = ({ onNavigate }) => {
  const { services: SERVICES } = useSiteConfig();
  useSalon(); // per le foto
  const [activeCategory, setActiveCategory] = useState<TreatmentCategory | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  // solo le categorie che hanno almeno un trattamento
  const categories = useMemo(
    () => [{ id: 'all' as const, label: 'Tutti i trattamenti' }, ...CATEGORY_LIST.filter((c) => SERVICES.some((s) => s.category === c.id))],
    [SERVICES]
  );

  // risultati in tempo reale: per nome e per categoria
  const filtered = useMemo(() => {
    const q = norm(searchTerm.trim());
    return SERVICES.filter((s) => {
      if (activeCategory !== 'all' && s.category !== activeCategory) return false;
      if (!q) return true;
      return norm(s.name).includes(q) || norm(s.categoryLabel).includes(q);
    });
  }, [SERVICES, activeCategory, searchTerm]);

  const opened = SERVICES.find((s) => s.id === openId) ?? null;

  useEffect(() => {
    if (!opened) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenId(null);
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [opened]);

  return (
    <div className="py-10 lg:py-16 bg-[#FAF7F7] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-mono uppercase tracking-widest text-[#AA853D] font-bold">Listino & Schede Trattamenti</span>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#261F21]">I Nostri Trattamenti</h1>
          <p className="text-sm sm:text-base text-[#55474A]">
            Cerca un trattamento per nome o sfoglia le foto: tocca l’immagine per vedere la scheda e prenotare. Prezzi trasparenti, saldo direttamente in salone.
          </p>
        </div>

        {/* Ricerca e categorie */}
        <div className="space-y-4 max-w-4xl mx-auto">
          <div className="relative">
            <Search className="w-4 h-4 text-[#8F7D82] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cerca per nome o categoria (es. viso, pedicure, ciglia)…"
              aria-label="Cerca un trattamento"
              className="w-full pl-10 pr-20 py-3 bg-white border border-[#DEC7CA] rounded-xl text-sm focus:outline-none focus:border-[#AA853D] shadow-2xs"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#8F7D82] hover:text-[#261F21]">
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

        {(activeCategory === 'corpo' || activeCategory === 'all') && SERVICES.some((s) => s.category === 'corpo') && (
          <div className="max-w-4xl mx-auto p-4 rounded-xl bg-[#FAF0F2] border border-[#DEC7CA] text-xs sm:text-sm text-[#5C242E] flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-[#8A3B49] shrink-0 mt-0.5" />
            <div>
              <strong className="block text-sm font-semibold">Trattamento corpo: riservato solo alle donne</strong>
              <span>Per garantire riservatezza e comfort, i trattamenti corpo sono dedicati ed eseguiti esclusivamente a un pubblico femminile.</span>
            </div>
          </div>
        )}

        {/* Griglia */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {filtered.map((service) => (
            <button
              key={service.id}
              type="button"
              onClick={() => setOpenId(service.id)}
              className="group text-left bg-white rounded-2xl border border-[#EEDFE1] overflow-hidden hover:shadow-lg hover:border-[#AA853D] transition-all flex flex-col"
            >
              <div className="p-4 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AA853D]">{service.categoryLabel}</span>
                  {service.onlyWomen && <span className="text-[10px] font-bold text-[#8A3B49] bg-[#FAF0F2] px-2 py-0.5 rounded">Solo donna</span>}
                </div>
                <h3 className="font-serif text-sm sm:text-base font-bold text-[#261F21] leading-snug">{service.name}</h3>
              </div>
              <div className="px-4 py-2.5 border-t border-[#F7EFEF] flex items-center justify-between gap-2">
                <PriceTag service={service} />
                <span className="text-[11px] text-[#8F7D82] flex items-center gap-1 shrink-0">
                  <Clock className="w-3 h-3" />
                  {service.durationMinutes} min
                </span>
              </div>
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-[#DEC7CA] p-8">
            <p className="text-sm font-semibold text-[#261F21]">Nessun trattamento trovato</p>
            <p className="text-xs text-[#8F7D82] mt-1">Prova a cambiare la ricerca o la categoria.</p>
          </div>
        )}
      </div>

      {/* Scheda trattamento */}
      {opened && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setOpenId(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={opened.name}
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl max-h-[94dvh] overflow-y-auto"
          >
            <div className="flex justify-end p-3 pb-0">
              <button
                type="button"
                aria-label="Chiudi"
                onClick={() => setOpenId(null)}
                className="w-10 h-10 rounded-full bg-[#F7EFEF] text-[#261F21] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 sm:p-6 space-y-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold text-[#AA853D] uppercase tracking-wider">{opened.categoryLabel}</span>
                  {opened.onlyWomen && <span className="text-[10px] font-bold text-[#8A3B49] bg-[#FAF0F2] px-2 py-0.5 rounded">Solo donna</span>}
                  {opened.isPopular && !opened.onlyWomen && <span className="text-[10px] font-semibold text-[#191415] bg-[#D8B268] px-2 py-0.5 rounded">Più richiesto</span>}
                </div>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#261F21]">{opened.name}</h2>
                {opened.description && <p className="text-sm text-[#55474A] leading-relaxed pt-1">{opened.description}</p>}
              </div>

              {opened.benefits.length > 0 && (
                <ul className="space-y-1.5">
                  {opened.benefits.map((b, i) => (
                    <li key={i} className="text-xs text-[#55474A] flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-[#AA853D] shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}

              {opened.onlyWomen && (
                <p className="text-xs text-[#5C242E] bg-[#FAF0F2] border border-[#DEC7CA] rounded-xl p-3 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#8A3B49] shrink-0 mt-0.5" />
                  Trattamento riservato esclusivamente a un pubblico femminile.
                </p>
              )}

              <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#F7EFEF]">
                <div>
                  <PriceTag service={opened} big />
                  <span className="text-xs text-[#8F7D82] flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {opened.durationMinutes} minuti
                  </span>
                </div>
                <button
                  onClick={() => {
                    setOpenId(null);
                    onNavigate('prenota', opened.id);
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#261F21] hover:bg-[#191415] text-[#FAF7F7] text-sm font-semibold rounded-xl shadow-md"
                >
                  <span>Prenota</span>
                  <ArrowRight className="w-4 h-4 text-[#D8B268]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
