import React from 'react';
import { Star, Sparkles, MapPin, Phone, ShieldCheck, ArrowRight } from 'lucide-react';

interface HeroProps {
  onOpenBooking: () => void;
  onScrollToLaser: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenBooking, onScrollToLaser }) => {
  return (
    <section className="relative overflow-hidden pt-8 pb-16 lg:py-20 bg-radial from-[#FFFDFD] via-[#FAF5F5] to-[#F5ECEE]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Colonna Sinistra: Testo & Presentazione di Chiara e Melania */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
            
            {/* Trust badge unboxed */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#736266]">
              <div className="flex items-center gap-1 text-[#C5A059]">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-[#C5A059]" />
                ))}
              </div>
              <span className="font-semibold text-[#261F21]">5.0 / 5</span>
              <span aria-hidden="true">·</span>
              <span>Oltre 170 recensioni verificate</span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1 text-[#736266]">
                <MapPin className="w-3 h-3 text-[#AA853D]" />
                Catania
              </span>
            </div>

            {/* Titolo Principale in Playfair Display */}
            <div className="space-y-3">
              <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#261F21] leading-[1.15] text-balance">
                Il Sogno della Bellezza
              </h1>
              <p className="font-serif italic text-xl sm:text-2xl text-[#AA853D]">
                L’estetica avanzata di Chiara e Melania
              </p>
            </div>

            {/* Descrizione Curata */}
            <p className="text-base sm:text-lg text-[#55474A] max-w-2xl leading-relaxed">
              Un rifugio di benessere e trasformazione nel cuore di Catania. Protocolli su misura,
              tecnologia laser a diodo <strong>EPILED 818NM</strong> indolore, cura magistrale dello sguardo
              e massaggi rigeneranti formulati per esaltare l’unicità di ogni donna.
            </p>

            {/* Trust Points */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-lg bg-white/70 border border-[#EEDFE1] shadow-2xs">
                <span className="block text-xs font-semibold text-[#AA853D]">Specialiste Laser</span>
                <span className="text-xs text-[#55474A]">Manipolo criogenico indolore</span>
              </div>
              <div className="p-3 rounded-lg bg-white/70 border border-[#EEDFE1] shadow-2xs">
                <span className="block text-xs font-semibold text-[#AA853D]">Master Lash & Brow</span>
                <span className="text-xs text-[#55474A]">Laminazione ed extension top</span>
              </div>
              <div className="p-3 rounded-lg bg-white/70 border border-[#EEDFE1] shadow-2xs">
                <span className="block text-xs font-semibold text-[#AA853D]">Massaggi Benessere</span>
                <span className="text-xs text-[#55474A]">Riservati al pubblico femminile</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <button
                onClick={onOpenBooking}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-semibold text-[#FAF7F7] bg-[#261F21] hover:bg-[#191415] rounded-md shadow-md transition-all hover:scale-[1.02]"
              >
                <span>Prenota Trattamento</span>
                <ArrowRight className="w-4 h-4 text-[#D8B268]" />
              </button>

              <button
                onClick={onScrollToLaser}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-medium text-[#261F21] bg-white hover:bg-[#F7EFEF] border border-[#DEC7CA] rounded-md shadow-2xs transition-all hover:border-[#AA853D]"
              >
                <span>Promo Laser 818NM</span>
                <span className="text-xs font-bold text-[#AA853D]">€119,99</span>
              </button>
            </div>

            {/* Recap Contatto Rapido */}
            <div className="flex items-center gap-6 pt-3 text-xs text-[#736266]">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#AA853D]" />
                Via delle Viole, 7/9 - Catania
              </span>
              <a
                href="tel:3453938087"
                className="flex items-center gap-1.5 hover:text-[#AA853D] font-medium transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-[#AA853D]" />
                345 393 8087
              </a>
            </div>
          </div>

          {/* Colonna Destra: Foto Reale di Chiara e Melania */}
          <div className="lg:col-span-5 relative flex justify-center">
            <div className="relative w-full max-w-md lg:max-w-none">
              
              {/* Cornice decorativa dorata e sfondo marmo */}
              <div className="absolute -inset-2 bg-gradient-to-tr from-[#C5A059]/20 via-[#F7EFEF] to-[#C5A059]/30 rounded-2xl filter blur-xs transform -rotate-1" />

              <div className="relative overflow-hidden rounded-xl bg-white border border-[#EEDFE1] shadow-xl">
                <img
                  src="/assets/aistudio/WhatsApp_Image_2026-10-29_at_19.55.07__1__0a7db009.jpeg"
                  alt="Chiara e Melania - Il Sogno della Bellezza Catania"
                  className="w-full h-[460px] sm:h-[520px] object-cover object-top hover:scale-[1.01] transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />

                {/* Scrim inferiore con didascalia sobria */}
                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-[#191415]/90 via-[#191415]/60 to-transparent text-[#FAF7F7]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-serif font-bold text-base text-[#D8B268]">Chiara & Melania</p>
                      <p className="text-xs text-[#DEC7CA]">Fondatrici & Master del centro</p>
                    </div>
                    <span className="text-[11px] font-mono text-[#D8B268] bg-[#261F21]/80 px-2 py-1 rounded border border-[#AA853D]/40">
                      Catania · Via delle Viole
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
