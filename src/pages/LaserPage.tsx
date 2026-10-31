import React from 'react';
import {
  Zap,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Phone,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { PageId } from '../types/navigation';

interface LaserPageProps {
  onNavigate: (page: PageId, serviceId?: string) => void;
}

export const LaserPage: React.FC<LaserPageProps> = ({ onNavigate }) => {
  return (
    <div className="py-12 lg:py-16 bg-[#FAF7F7] min-h-screen space-y-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Intestazione */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-mono uppercase tracking-widest text-[#AA853D] font-bold">
            Tecnologia Estetica Avanzata a Catania
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#261F21]">
            Epilazione Laser EPILED 818NM
          </h1>
          <p className="text-sm sm:text-base text-[#55474A]">
            La rivoluzione dell'epilazione progressivamente definitiva: indolore, veloce e sicura su ogni tipo di pelle.
          </p>
        </div>

        {/* Card Vetrina con Immagine Ufficiale */}
        <div className="bg-[#261F21] text-[#FAF7F7] rounded-3xl p-6 sm:p-10 lg:p-12 border border-[#AA853D]/30 shadow-2xl overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Foto Ufficiale Banner */}
            <div className="lg:col-span-6 flex justify-center">
              <img
                src="/assets/aistudio/WhatsApp_Image_2026-10-29_at_19.55.42_5d2a8a82.jpeg"
                alt="Promo Total Body Donna Laser EPILED 818NM Centro Estetico Il Sogno della Bellezza Catania"
                className="w-full max-h-[520px] object-cover rounded-2xl border border-[#AA853D]/40 shadow-xl"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Dettagli Offerta */}
            <div className="lg:col-span-6 space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-semibold text-[#D8B268] uppercase tracking-wider">
                  Offerta Esclusiva Donna
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#FAF7F7]">
                  PROMO TOTAL BODY DONNA
                </h2>
                <div className="flex items-baseline gap-3 pt-1">
                  <span className="font-serif text-4xl sm:text-5xl font-bold text-[#D8B268]">
                    €119,99
                  </span>
                  <span className="text-base text-[#8F7D82] line-through">
                    €180,00
                  </span>
                  <span className="text-xs bg-[#D8B268] text-[#191415] font-bold px-2 py-0.5 rounded">
                    Risparmio Immediato
                  </span>
                </div>
              </div>

              <p className="text-sm text-[#DEC7CA] leading-relaxed">
                Trattamento completo su tutte le zone principali del corpo: gambe intere, inguine totale,
                ascelle, braccia e viso. Eseguito con macchinario medicale certificato iCare e manipolo criogenico raffreddato.
              </p>

              {/* Specifiche Tecniche */}
              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#D8B268] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-[#FAF7F7]">Fascio Laser 818nm Selettivo</h4>
                    <p className="text-xs text-[#DEC7CA]">
                      Concentra l'energia termica solo sul bulbo pilifero senza aggredire i vasi capillari o la melanina superficiale.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#D8B268] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-[#FAF7F7]">Zero Dolore con Cryo-Cooling -5°C</h4>
                    <p className="text-xs text-[#DEC7CA]">
                      Il manipolo iCare anestetizza naturalmente la cute a contatto, regalando una sensazione di freschezza costante.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#D8B268] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-[#FAF7F7]">Addio Follicolite e Peli Incarniti</h4>
                    <p className="text-xs text-[#DEC7CA]">
                      Elimina l'infiammazione tipica della lametta e dei cerotti a strappo già dopo 2-3 sedute.
                    </p>
                  </div>
                </div>
              </div>

              {/* Bottoni Azione */}
              <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  onClick={() => onNavigate('prenota', 'laser-total-body')}
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#D8B268] hover:bg-[#AA853D] text-[#191415] text-sm font-semibold rounded-lg shadow-md transition-all hover:scale-[1.02]"
                >
                  <span>Prenota la Promo Total Body a €119,99</span>
                  <ArrowRight className="w-4 h-4 text-[#191415]" />
                </button>

                <a
                  href="https://wa.me/393453938087?text=Ciao%20Chiara%20e%20Melania,%20vorrei%20maggiori%20informazioni%20sulla%20Promo%20Laser%20Total%20Body%20Donna"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-3.5 border border-[#AA853D]/50 hover:bg-white/10 text-[#FAF7F7] text-xs sm:text-sm font-medium rounded-lg transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-[#25D366]" />
                  <span>Consulenza WhatsApp</span>
                </a>
              </div>

            </div>

          </div>
        </div>

        {/* Listino Zone Singole Laser */}
        <div className="space-y-6">
          <div className="text-center space-y-1">
            <h3 className="font-serif text-2xl font-bold text-[#261F21]">
              Trattamenti Laser per Zone Singole
            </h3>
            <p className="text-xs sm:text-sm text-[#55474A]">
              Puoi anche scegliere trattamenti mirati su specifiche aree del corpo o del viso.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-6 bg-white rounded-2xl border border-[#EEDFE1] space-y-4 shadow-2xs">
              <span className="text-[11px] font-semibold text-[#AA853D] uppercase">Arti Inferiori</span>
              <h4 className="font-serif text-lg font-bold text-[#261F21]">Gambe Intere + Inguine</h4>
              <p className="text-xs text-[#55474A]">
                Pelle liscia per mesi senza più cerette dolorose. Risultati rapidi anche su peli resistenti.
              </p>
              <div className="flex items-baseline justify-between pt-2 border-t border-[#F7EFEF]">
                <div>
                  <span className="font-serif font-bold text-lg text-[#AA853D]">€59,99</span>
                  <span className="text-xs text-[#8F7D82] line-through ml-2">€79,00</span>
                </div>
                <button
                  onClick={() => onNavigate('prenota', 'laser-gambe-inguine')}
                  className="px-3 py-1.5 bg-[#261F21] text-[#FAF7F7] text-xs font-semibold rounded-lg hover:bg-[#191415]"
                >
                  Prenota
                </button>
              </div>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-[#EEDFE1] space-y-4 shadow-2xs">
              <span className="text-[11px] font-semibold text-[#AA853D] uppercase">Viso Donna</span>
              <h4 className="font-serif text-lg font-bold text-[#261F21]">Viso Donna Completo</h4>
              <p className="text-xs text-[#55474A]">
                Baffetti, mento, basette e sottomento trattati con spot ad alta precisione.
              </p>
              <div className="flex items-baseline justify-between pt-2 border-t border-[#F7EFEF]">
                <div>
                  <span className="font-serif font-bold text-lg text-[#AA853D]">€35,00</span>
                  <span className="text-xs text-[#8F7D82] line-through ml-2">€45,00</span>
                </div>
                <button
                  onClick={() => onNavigate('prenota', 'laser-viso-donna')}
                  className="px-3 py-1.5 bg-[#261F21] text-[#FAF7F7] text-xs font-semibold rounded-lg hover:bg-[#191415]"
                >
                  Prenota
                </button>
              </div>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-[#EEDFE1] space-y-4 shadow-2xs">
              <span className="text-[11px] font-semibold text-[#AA853D] uppercase">Arti Superiori</span>
              <h4 className="font-serif text-lg font-bold text-[#261F21]">Ascelle & Braccia</h4>
              <p className="text-xs text-[#55474A]">
                Seduta rapida in 25-30 minuti per ascelle lisce e zero ombra scura sottopelle.
              </p>
              <div className="flex items-baseline justify-between pt-2 border-t border-[#F7EFEF]">
                <div>
                  <span className="font-serif font-bold text-lg text-[#261F21]">€50,00</span>
                </div>
                <button
                  onClick={() => onNavigate('prenota', 'laser-ascelle-braccia')}
                  className="px-3 py-1.5 bg-[#261F21] text-[#FAF7F7] text-xs font-semibold rounded-lg hover:bg-[#191415]"
                >
                  Prenota
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Domande Frequenti (FAQ Laser) */}
        <div className="bg-white p-8 rounded-2xl border border-[#EEDFE1] space-y-6 shadow-2xs">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#AA853D]" />
            <h3 className="font-serif text-xl font-bold text-[#261F21]">
              Domande Frequenti sull'Epilazione Laser EPILED
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs sm:text-sm text-[#55474A]">
            <div className="space-y-1">
              <h4 className="font-bold text-[#261F21]">Il trattamento fa male?</h4>
              <p className="leading-relaxed">
                No! Grazie al sistema criogenico integrato che raffredda la testina fino a -5°C,
                la sensazione è unicamente di un piacevole fresco sulla pelle senza dolore o bruciore.
              </p>
            </div>

            <div className="space-y-1">
              <h4 className="font-bold text-[#261F21]">Quante sedute servono per vedere i risultati?</h4>
              <p className="leading-relaxed">
                Già dalla prima seduta il 20-30% dei peli in fase anagen cade spontaneamente.
                Per un risultato progressivamente definitivo si consiglia un ciclo di 6-8 sedute.
              </p>
            </div>

            <div className="space-y-1">
              <h4 className="font-bold text-[#261F21]">Posso farlo d'estate o con la pelle abbronzata?</h4>
              <p className="leading-relaxed">
                Sì! La tecnologia EPILED a 818nm è fotoselettiva e sicura su fototipi da I a VI,
                anche su cute dorata dal sole di Catania con i dovuti accorgimenti post-seduta.
              </p>
            </div>

            <div className="space-y-1">
              <h4 className="font-bold text-[#261F21]">Come devo prepararmi alla seduta?</h4>
              <p className="leading-relaxed">
                È sufficiente radere delicatamente la zona con rasoio 24-48 ore prima della seduta,
                evitando cerette o pinzette nelle 3 settimane precedenti.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
