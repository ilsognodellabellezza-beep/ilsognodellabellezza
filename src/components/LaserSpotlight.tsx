import React from 'react';
import { Sparkles, CheckCircle2, Shield, Zap, ArrowRight } from 'lucide-react';

interface LaserSpotlightProps {
  onBookLaser: (serviceId?: string) => void;
}

export const LaserSpotlight: React.FC<LaserSpotlightProps> = ({ onBookLaser }) => {
  return (
    <section id="laser-epiled" className="py-16 lg:py-24 bg-[#261F21] text-[#FAF7F7] relative overflow-hidden">
      {/* Texture di fondo con accenti oro */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#C5A059]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#C99EAE]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Intestazione Sezione */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12 lg:mb-16">
          <p className="text-xs uppercase tracking-widest text-[#D8B268] font-semibold">
            Tecnologia di Ultima Generazione a Catania
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#FAF7F7]">
            Epilazione Laser EPILED 818NM
          </h2>
          <p className="text-sm sm:text-base text-[#DEC7CA] max-w-2xl mx-auto">
            Addio ai peli superflui e alle irritazioni della ceretta. Il nostro laser a diodo
            con manipolo criogenico iCare garantisce trattamenti indolori, rapidi e progressivamente definitivi.
          </p>
        </div>

        {/* Card promozionale principale con immagine ufficiale */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-[#191415] border border-[#AA853D]/30 rounded-2xl overflow-hidden shadow-2xl">
          
          {/* Banner grafico ufficiale */}
          <div className="lg:col-span-6 relative">
            <img
              src="/assets/aistudio/WhatsApp_Image_2026-10-29_at_19.55.42_5d2a8a82.jpeg"
              alt="Promo Total Body Donna Laser EPILED 818NM Catania Il Sogno della Bellezza"
              className="w-full h-full object-cover max-h-[520px]"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Dettagli dell'offerta e della tecnologia */}
          <div className="lg:col-span-6 p-6 sm:p-8 lg:p-10 space-y-6">
            
            <div className="space-y-2">
              <span className="text-xs font-semibold text-[#D8B268] tracking-wide uppercase">
                Edizione Speciale Limitata
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#FAF7F7]">
                Promo Total Body Donna
              </h3>
              <div className="flex items-baseline gap-3 pt-1">
                <span className="text-3xl sm:text-4xl font-serif font-bold text-[#D8B268]">
                  €119,99
                </span>
                <span className="text-base text-[#8F7D82] line-through">
                  €180,00
                </span>
                <span className="text-xs font-semibold text-[#261F21] bg-[#D8B268] px-2 py-0.5 rounded">
                  Risparmi oltre 60€
                </span>
              </div>
            </div>

            <p className="text-sm text-[#DEC7CA] leading-relaxed">
              La seduta comprende il trattamento completo delle zone desiderate (gambe intere, inguine totale,
              ascelle, braccia e viso). Gestito direttamente dalle nostre operatrici certificate.
            </p>

            {/* Caratteristiche Tecniche Chiave */}
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#D8B268] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-[#FAF7F7]">Lunghezza d'onda 818nm</h4>
                  <p className="text-xs text-[#DEC7CA]">
                    Penetrazione mirata sul bulbo pilifero senza surriscaldare i tessuti circostanti.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#D8B268] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-[#FAF7F7]">Manipolo Cryo-Cooling -5°C</h4>
                  <p className="text-xs text-[#DEC7CA]">
                    Sensazione di freschezza costante sulla cute per una seduta al 100% piacevole e indolore.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#D8B268] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-[#FAF7F7]">Tutti i fototipi (I - VI)</h4>
                  <p className="text-xs text-[#DEC7CA]">
                    Sicuro ed efficace in ogni periodo dell'anno, anche su pelli abbronzate o sensibili.
                  </p>
                </div>
              </div>
            </div>

            {/* Azioni */}
            <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <button
                onClick={() => onBookLaser('laser-total-body')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#D8B268] hover:bg-[#AA853D] text-[#191415] font-semibold text-sm rounded-md shadow-md transition-all hover:scale-[1.02]"
              >
                <span>Blocca la Promo a €119,99</span>
                <ArrowRight className="w-4 h-4 text-[#191415]" />
              </button>

              <a
                href="https://wa.me/393453938087?text=Ciao%20Chiara%20e%20Melania,%20vorrei%20informazioni%20sulla%20Promo%20Laser%20EPILED%20a%20119,99€"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center px-5 py-3.5 border border-[#AA853D]/40 text-xs sm:text-sm font-medium text-[#FAF7F7] hover:bg-[#261F21] rounded-md transition-colors"
              >
                Consulenza WhatsApp
              </a>
            </div>

            <p className="text-[11px] text-[#8F7D82]">
              * Nessun pagamento anticipato richiesto. Paghi direttamente in salone al termine del trattamento.
            </p>

          </div>

        </div>

      </div>
    </section>
  );
};
