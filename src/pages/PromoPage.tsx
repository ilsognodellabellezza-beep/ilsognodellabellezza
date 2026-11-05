import React from 'react';
import { ArrowRight, CalendarDays, Flame, Hourglass, Sparkles } from 'lucide-react';
import { useSalon, promoPhotoUrl, countdownLabel, daysLeft, Promotion } from '../lib/salon';
import { PageId } from '../types/navigation';

interface PromoPageProps {
  onNavigate: (page: PageId, serviceId?: string) => void;
}

const fmt = (d: string) => new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long' }).format(new Date(`${d}T12:00:00`));

export const PromoCard: React.FC<{ promo: Promotion; onNavigate: PromoPageProps['onNavigate']; compact?: boolean }> = ({ promo, onNavigate, compact }) => {
  const photo = promoPhotoUrl(promo);
  const urgent = daysLeft(promo.endsOn) <= 3;
  const saving = promo.originalPrice !== null && promo.originalPrice > promo.promoPrice ? promo.originalPrice - promo.promoPrice : 0;
  const percent = saving > 0 && promo.originalPrice ? Math.round((saving / promo.originalPrice) * 100) : 0;
  return (
    <article className="relative group bg-gradient-to-b from-[#2E2326] to-[#191415] text-white rounded-3xl border-2 border-[#D8B268] overflow-hidden shadow-xl shadow-[#AA853D]/25 flex flex-col transition-transform duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-[#AA853D]/40">
      <div className="relative aspect-[16/11] bg-gradient-to-br from-[#8A3B49] via-[#5C242E] to-[#261F21] overflow-hidden">
        {photo ? (
          <img src={photo} alt={promo.title} loading="lazy" decoding="async" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#D8B268]">
            <Sparkles className="w-14 h-14 opacity-80" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#191415] via-transparent to-black/20" />
        <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider px-3 py-1.5 rounded-full bg-[#D8B268] text-[#191415] shadow-lg">
          <Flame className="w-3.5 h-3.5" /> Offerta speciale
        </span>
        {percent > 0 && (
          <span className="absolute top-3 right-3 w-16 h-16 rounded-full bg-[#8A3B49] border-2 border-[#D8B268] text-white flex flex-col items-center justify-center shadow-xl rotate-12 animate-pulse">
            <span className="font-serif text-xl font-extrabold leading-none">-{percent}%</span>
          </span>
        )}
        <span
          className={`absolute bottom-3 left-3 inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full shadow ${
            urgent ? 'bg-red-600 text-white animate-pulse' : 'bg-black/70 text-[#D8B268] backdrop-blur'
          }`}
        >
          <Hourglass className="w-3.5 h-3.5" />
          {countdownLabel(promo.endsOn)}
        </span>
      </div>
      <div className="p-5 space-y-3 flex-1 flex flex-col">
        <h3 className="font-serif text-2xl font-bold text-[#F3DFA8] leading-tight">{promo.title}</h3>
        {promo.description && !compact && <p className="text-sm text-[#EBDDDF] leading-relaxed whitespace-pre-line">{promo.description}</p>}
        <p className="text-xs text-[#C9B9BC] flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5 text-[#D8B268]" />
          Dal {fmt(promo.startsOn)} al {fmt(promo.endsOn)}
        </p>
        <div className="mt-auto pt-4 border-t border-[#D8B268]/30 space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div className="flex items-baseline gap-2.5">
              <span className="font-serif text-4xl font-extrabold text-[#D8B268] leading-none">€{promo.promoPrice.toFixed(2)}</span>
              {promo.originalPrice !== null && <span className="text-base text-[#B3A2A6] line-through">€{promo.originalPrice.toFixed(2)}</span>}
            </div>
            {saving > 0 && <span className="text-[11px] font-bold text-[#191415] bg-[#F3DFA8] px-2.5 py-1 rounded-full whitespace-nowrap">Risparmi €{saving.toFixed(2)}</span>}
          </div>
          <button
            onClick={() => onNavigate('prenota', promo.serviceId ?? undefined)}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-[#D8B268] to-[#AA853D] hover:from-[#E6C47C] hover:to-[#C5A059] text-[#191415] text-sm font-extrabold uppercase tracking-wide rounded-xl shadow-lg"
          >
            Prenota ora <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </article>
  );
};

/** Sezione solo promo: le promozioni spariscono da sole alla data di fine. */
export const PromoPage: React.FC<PromoPageProps> = ({ onNavigate }) => {
  const { activePromotions, loaded } = useSalon();
  const sorted = [...activePromotions].sort((a, b) => a.endsOn.localeCompare(b.endsOn));

  return (
    <div className="py-10 lg:py-16 bg-[#FAF7F7] min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#191415] bg-[#D8B268] px-3 py-1 rounded-full"><Flame className="w-3.5 h-3.5" /> Offerte a tempo</span>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#261F21]">Promozioni</h1>
          <p className="text-sm sm:text-base text-[#55474A]">Approfitta delle promo del momento: ognuna è valida fino alla data indicata.</p>
        </div>

        {sorted.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((p) => (
              <PromoCard key={p.id} promo={p} onNavigate={onNavigate} />
            ))}
          </div>
        ) : (
          loaded && (
            <div className="text-center py-14 bg-white rounded-3xl border border-dashed border-[#DEC7CA] space-y-3">
              <p className="font-serif text-lg font-bold text-[#261F21]">Al momento non ci sono promozioni attive</p>
              <p className="text-xs text-[#8F7D82]">Torna a trovarci presto o scrivici su WhatsApp per essere avvisata delle prossime offerte.</p>
              <button onClick={() => onNavigate('trattamenti')} className="px-5 py-2.5 bg-[#261F21] text-[#FAF7F7] text-xs font-semibold rounded-xl">
                Scopri i trattamenti
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
};
