import React from 'react';
import { ArrowRight, CalendarDays, Hourglass, Sparkles } from 'lucide-react';
import { useSalon, promoPhotoUrl, countdownLabel, daysLeft, Promotion } from '../lib/salon';
import { PageId } from '../types/navigation';

interface PromoPageProps {
  onNavigate: (page: PageId, serviceId?: string) => void;
}

const fmt = (d: string) => new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long' }).format(new Date(`${d}T12:00:00`));

export const PromoCard: React.FC<{ promo: Promotion; onNavigate: PromoPageProps['onNavigate']; compact?: boolean }> = ({ promo, onNavigate, compact }) => {
  const photo = promoPhotoUrl(promo);
  const urgent = daysLeft(promo.endsOn) <= 3;
  return (
    <article className="bg-white rounded-3xl border border-[#EEDFE1] overflow-hidden shadow-sm flex flex-col">
      <div className="relative aspect-[16/10] bg-gradient-to-br from-[#FAF0F2] to-[#EEDFE1]">
        {photo ? (
          <img src={photo} alt={promo.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#AA853D]">
            <Sparkles className="w-10 h-10 opacity-60" />
          </div>
        )}
        <span
          className={`absolute top-3 left-3 inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full shadow ${
            urgent ? 'bg-[#8A3B49] text-white' : 'bg-[#261F21] text-[#D8B268]'
          }`}
        >
          <Hourglass className="w-3.5 h-3.5" />
          {countdownLabel(promo.endsOn)}
        </span>
      </div>
      <div className="p-5 space-y-3 flex-1 flex flex-col">
        <h3 className="font-serif text-xl font-bold text-[#261F21]">{promo.title}</h3>
        {promo.description && !compact && <p className="text-sm text-[#55474A] leading-relaxed whitespace-pre-line">{promo.description}</p>}
        <p className="text-xs text-[#736266] flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5 text-[#AA853D]" />
          Dal {fmt(promo.startsOn)} al {fmt(promo.endsOn)}
        </p>
        <div className="mt-auto pt-3 flex items-center justify-between gap-3 border-t border-[#F7EFEF]">
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-2xl font-bold text-[#AA853D]">€{promo.promoPrice.toFixed(2)}</span>
            {promo.originalPrice !== null && <span className="text-sm text-[#8F7D82] line-through">€{promo.originalPrice.toFixed(2)}</span>}
          </div>
          <button
            onClick={() => onNavigate('prenota', promo.serviceId ?? undefined)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#261F21] hover:bg-[#191415] text-[#FAF7F7] text-xs sm:text-sm font-semibold rounded-xl shadow-md"
          >
            Prenota <ArrowRight className="w-4 h-4 text-[#D8B268]" />
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
          <span className="text-xs font-mono uppercase tracking-widest text-[#AA853D] font-bold">Offerte a tempo</span>
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
