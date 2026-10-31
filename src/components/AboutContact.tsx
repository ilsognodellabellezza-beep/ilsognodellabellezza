import React from 'react';
import { MapPin, Phone, Clock, Mail, Instagram, ExternalLink, MessageCircle } from 'lucide-react';

export const AboutContact: React.FC = () => {
  return (
    <section id="chi-siamo" className="py-16 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Colonna Sinistra: Biglietto da Visita & Stile Grafico Foto */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-8 sm:p-10 rounded-2xl bg-[#FCF8F8] border border-[#EEDFE1] shadow-lg relative overflow-hidden text-center space-y-5">
              
              {/* Accento grafico superiore */}
              <div className="w-16 h-16 rounded-full bg-[#261F21] text-[#D8B268] flex items-center justify-center font-serif text-2xl font-bold mx-auto border-2 border-[#AA853D]/50 shadow-md">
                CM
              </div>

              <div>
                <span className="text-xs tracking-widest uppercase font-semibold text-[#AA853D] block">
                  Chiara e Melania
                </span>
                <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#261F21] mt-1">
                  IL SOGNO DELLA BELLEZZA
                </h3>
                <div className="w-12 h-0.5 bg-[#D8B268] mx-auto mt-3" />
              </div>

              <div className="pt-2 text-xs text-[#55474A] space-y-1.5 font-sans">
                <p className="font-semibold text-sm text-[#261F21]">VIA DELLE VIOLE, 7/9 - CATANIA</p>
                <p>Tel: 345 393 8087 · www.ilsognodellabellezza.it</p>
              </div>

              {/* Social Channels dal biglietto ufficiale */}
              <div className="pt-4 flex items-center justify-center gap-3">
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-full bg-white border border-[#DEC7CA] flex items-center justify-center text-[#736266] hover:text-[#AA853D] hover:border-[#AA853D] transition-colors"
                  title="Instagram"
                >
                  <Instagram className="w-4 h-4" />
                </a>
                <a
                  href="https://wa.me/393453938087"
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-full bg-white border border-[#DEC7CA] flex items-center justify-center text-[#736266] hover:text-[#25D366] hover:border-[#25D366] transition-colors"
                  title="WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
                <a
                  href="https://maps.google.com/?q=Via+delle+Viole+7+Catania"
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-full bg-white border border-[#DEC7CA] flex items-center justify-center text-[#736266] hover:text-[#AA853D] hover:border-[#AA853D] transition-colors"
                  title="Google Maps"
                >
                  <MapPin className="w-4 h-4" />
                </a>
              </div>

              <p className="text-[11px] text-[#8F7D82] italic">
                "La vera bellezza nasce dalla cura amorevole e dalla competenza."
              </p>
            </div>
          </div>

          {/* Colonna Destra: Storia, Posizione e Orari */}
          <div className="lg:col-span-7 space-y-6" id="contatti">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-widest text-[#AA853D] font-semibold">
                La Nostra Passione
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#261F21]">
                Chiara & Melania: Bellezza al Femminile
              </h2>
            </div>

            <p className="text-sm sm:text-base text-[#55474A] leading-relaxed">
              <strong>Il Sogno della Bellezza</strong> nasce dal legame speciale e dalla visione comune di
              Melania e Chiara: unire la delicatezza del tocco umano alle tecnologie più evolute dell'estetica avanzata.
              Docenti di corsi professionali di laminazione ed extension ciglia, le titolari garantiscono
              standard qualitativi rigorosi e un ambiente dove ogni ospite si sente valorizzata e ascoltata.
            </p>

            {/* Schede Dettaglio */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              
              {/* Orari Salone */}
              <div className="p-4 rounded-xl bg-[#FAF5F5] border border-[#EEDFE1] space-y-2">
                <div className="flex items-center gap-2 text-[#AA853D]">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#261F21]">
                    Orari di Apertura
                  </span>
                </div>
                <div className="text-xs text-[#55474A] space-y-1">
                  <div className="flex justify-between">
                    <span>Martedì - Sabato:</span>
                    <strong className="text-[#261F21]">09:00 – 18:30</strong>
                  </div>
                  <div className="flex justify-between text-[#8F7D82]">
                    <span>Lunedì:</span>
                    <span>Chiuso</span>
                  </div>
                  <div className="flex justify-between text-[#8F7D82]">
                    <span>Domenica:</span>
                    <span>Chiuso</span>
                  </div>
                </div>
              </div>

              {/* Dove Trovarci */}
              <div className="p-4 rounded-xl bg-[#FAF5F5] border border-[#EEDFE1] space-y-2">
                <div className="flex items-center gap-2 text-[#AA853D]">
                  <MapPin className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#261F21]">
                    Posizione a Catania
                  </span>
                </div>
                <div className="text-xs text-[#55474A] space-y-1">
                  <p className="font-semibold text-[#261F21]">Via delle Viole, 7/9</p>
                  <p>95124 Catania (CT), Sicilia</p>
                  <a
                    href="https://maps.google.com/?q=Via+delle+Viole+7+Catania"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[#AA853D] hover:underline font-medium pt-1"
                  >
                    <span>Apri su Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

            </div>

            {/* Quick Contact Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href="tel:3453938087"
                className="inline-flex items-center gap-2 px-5 py-3 bg-[#261F21] text-[#FAF7F7] hover:bg-[#191415] rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-[#D8B268]" />
                <span>Chiama 345 393 8087</span>
              </a>

              <a
                href="https://wa.me/393453938087?text=Salve%20Chiara%20e%20Melania,%20desidero%20informazioni%20su%20un%20trattamento"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 bg-[#25D366] text-white hover:bg-[#20ba59] rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Scrivici su WhatsApp</span>
              </a>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
